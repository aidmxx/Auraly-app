import assert from "node:assert/strict";
import test from "node:test";
import { validateFinalReflection, validateReadableText, validateSupportRequest } from "./validation";

test("Condition A accepts a meaningful Chinese support request", () => {
  assert.deepEqual(
    validateSupportRequest("A", { message: "请帮我把这次团队合作经历整理成一段反思" }, []),
    { valid: true },
  );
});

test("Condition B accepts meaningful Chinese structured fields", () => {
  assert.deepEqual(validateSupportRequest("B", {
    topic: "团队合作经历",
    context: "我第一次带领团队完成项目，也遇到了沟通问题",
    tone: "Thoughtful",
    goal: "说明我学到的经验",
  }, []), { valid: true });
});

test("Condition C accepts meaningful Chinese structured fields and scaffolds", () => {
  assert.deepEqual(validateSupportRequest("C", {
    topic: "团队合作经历",
    context: "我第一次带领团队完成项目，也遇到了沟通问题",
    tone: "Thoughtful",
    goal: "说明我学到的经验",
  }, [
    { question: "What happened?", answer: "我带领团队按时完成了重要项目" },
    { question: "What shaped your response?", answer: "当时紧张的情绪影响了我的沟通方式" },
    { question: "What did you learn?", answer: "我学会了主动倾听并更清楚地表达想法" },
  ]), { valid: true });
});

test("Extend AI support accepts a concise meaningful Chinese instruction", () => {
  assert.deepEqual(validateReadableText("把这段改写成更正式的中文", {
    label: "Follow-up request",
    minWords: 4,
    minCharacters: 15,
    maxWords: 100,
  }), { valid: true });
});

test("Chinese input still rejects short and filler content", () => {
  const short = validateReadableText("扩写", {
    label: "Follow-up request",
    minWords: 4,
    minCharacters: 15,
    maxWords: 100,
  });
  assert.equal(short.valid, false);

  const filler = validateSupportRequest("A", { message: "哈哈哈哈哈哈哈哈哈哈" }, []);
  assert.equal(filler.valid, false);
});

test("Final reflection accepts substantive Chinese writing", () => {
  const reflection = "这次团队项目让我更清楚地认识到沟通的重要性。开始时我只关注任务进度，没有留意其他成员的顾虑。后来我主动倾听大家的意见，并重新安排了分工，团队合作因此变得顺利。我学会了领导并不是替所有人作决定，而是帮助成员表达想法并共同找到方向。下次遇到类似项目时，我会更早确认目标，定期询问反馈，也会给不同意见留下讨论空间。";
  assert.deepEqual(validateFinalReflection(reflection), { valid: true });
});
