import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { localiseTimestampFields, toSydneyTimestamp } from "@/lib/time";
import ExcelJS from "exceljs";

type ExportRow = Record<string, unknown>;

const asExcelValue = (value: unknown): ExcelJS.CellValue => {
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  return JSON.stringify(value);
};

const addDataSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  description: string,
  columns: Array<{ header: string; key: string; width: number }>,
  rows: ExportRow[],
) => {
  const worksheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 3 }] });
  worksheet.mergeCells(1, 1, 1, columns.length);
  worksheet.getCell("A1").value = name;
  worksheet.getCell("A1").font = { name: "Aptos Display", size: 16, bold: true, color: { argb: "FF17365D" } };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells(2, 1, 2, columns.length);
  worksheet.getCell("A2").value = description;
  worksheet.getCell("A2").font = { name: "Aptos", size: 10, italic: true, color: { argb: "FF7F6000" } };
  worksheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
  worksheet.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  worksheet.getRow(2).height = 30;

  worksheet.columns = columns.map(({ key, width }) => ({ key, width }));
  const headerRow = worksheet.getRow(4);
  headerRow.values = columns.map(({ header }) => header);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17365D" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  for (const row of rows) {
    const excelRow = worksheet.addRow(columns.map(({ key }) => asExcelValue(row[key])));
    excelRow.alignment = { vertical: "top", wrapText: true };
    excelRow.eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10 };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD9E2F3" } } };
    });
  }

  worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  worksheet.views = [{ state: "frozen", ySplit: 4, xSplit: 1 }];
};

export async function GET(request: Request) {
  await requireUser("admin");
  const url = new URL(request.url);
  const participants = (await db().execute(`SELECT u.login_id participant_id,u.condition_code assigned_condition,u.active account_active,
    s.status,s.started_at,s.submitted_at,s.completion_seconds,s.final_word_count,
    (SELECT count(*) FROM interactions i WHERE i.participant_id=u.id) ai_uses,
    (SELECT count(*) FROM drafts d WHERE d.participant_id=u.id) drafts
    FROM users u LEFT JOIN studies s ON s.participant_id=u.id
    WHERE u.role='participant' ORDER BY u.created_at`)).rows;
  const interactions = (await db().execute(`SELECT u.login_id participant_id,i.sequence_no,i.prompt_inputs_json,i.full_prompt,i.ai_response,i.created_at FROM interactions i JOIN users u ON u.id=i.participant_id`)).rows;
  const scaffolds = (await db().execute(`SELECT u.login_id participant_id,s.question,s.answer,s.created_at FROM scaffolds s JOIN users u ON u.id=s.participant_id`)).rows;
  const drafts = (await db().execute(`SELECT u.login_id participant_id,d.content,d.word_count,d.created_at FROM drafts d JOIN users u ON u.id=d.participant_id`)).rows;
  const submissions = (await db().execute(`SELECT u.login_id participant_id,s.* FROM submissions s JOIN users u ON u.id=s.participant_id ORDER BY s.submitted_at`)).rows;
  const aiUsage = (await db().execute(`SELECT u.login_id participant_id,i.sequence_no,a.* FROM ai_usage a JOIN interactions i ON i.id=a.interaction_id JOIN users u ON u.id=i.participant_id ORDER BY a.created_at`)).rows;
  const localise = (rows: typeof participants) => rows.map((row) => localiseTimestampFields({ ...row }));
  const payload = {
    exportedAt: toSydneyTimestamp(new Date()),
    timeZone: "Australia/Sydney",
    participants: localise(participants),
    submissions: localise(submissions),
    interactions: localise(interactions),
    aiUsage: localise(aiUsage),
    scaffolds: localise(scaffolds),
    drafts: localise(drafts),
  };

  if (url.searchParams.get("format") === "json") {
    return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="auraly-export.json"', "Cache-Control": "no-store" } });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Auraly Research Console";
  workbook.created = new Date();
  workbook.properties.date1904 = false;

  addDataSheet(workbook, "Participant progress", `Exported ${payload.exportedAt}. Times use ${payload.timeZone}. Survey responses remain anonymous and are not joined here.`, [
    { header: "Participant ID", key: "participant_id", width: 18 },
    { header: "Assigned condition", key: "assigned_condition", width: 20 },
    { header: "Account active", key: "account_active", width: 16 },
    { header: "Study status", key: "status", width: 18 },
    { header: "Started", key: "started_at", width: 28 },
    { header: "Submitted", key: "submitted_at", width: 28 },
    { header: "Completion seconds", key: "completion_seconds", width: 20 },
    { header: "Final word count", key: "final_word_count", width: 18 },
    { header: "AI uses", key: "ai_uses", width: 12 },
    { header: "Drafts", key: "drafts", width: 12 },
  ], payload.participants);

  addDataSheet(workbook, "AI run usage", "One row per token-tracked AI generation. Older interactions created before usage tracking may not appear here.", [
    { header: "Participant ID", key: "participant_id", width: 18 },
    { header: "Interaction", key: "sequence_no", width: 14 },
    { header: "Provider", key: "provider", width: 16 },
    { header: "Model", key: "model", width: 24 },
    { header: "Input tokens", key: "input_tokens", width: 16 },
    { header: "Output tokens", key: "output_tokens", width: 16 },
    { header: "Total tokens", key: "total_tokens", width: 16 },
    { header: "Response time (ms)", key: "duration_ms", width: 20 },
    { header: "Generated", key: "created_at", width: 28 },
  ], payload.aiUsage);

  addDataSheet(workbook, "Completed writing submissions", "One row per archived completed writing submission, including prompts, AI outputs, and final reflection text.", [
    { header: "Participant ID", key: "participant_id", width: 18 },
    { header: "Condition", key: "condition_code", width: 14 },
    { header: "Submitted", key: "submitted_at", width: 28 },
    { header: "Completion seconds", key: "completion_seconds", width: 20 },
    { header: "Number of edits", key: "edit_count", width: 18 },
    { header: "Prompt length", key: "prompt_length", width: 16 },
    { header: "AI output length", key: "ai_output_length", width: 18 },
    { header: "Final output length", key: "final_output_length", width: 20 },
    { header: "Prompts (JSON)", key: "prompts_json", width: 55 },
    { header: "AI outputs (JSON)", key: "ai_outputs_json", width: 55 },
    { header: "Final reflection", key: "final_reflection", width: 70 },
  ], payload.submissions);

  const xlsx = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(xlsx), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": 'attachment; filename="auraly-study-data.xlsx"',
    "Cache-Control": "no-store",
  } });
}
