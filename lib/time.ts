export const STUDY_TIME_ZONE = "Australia/Sydney";

const displayFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: STUDY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

const exportFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "longOffset",
});

const parts = (formatter: Intl.DateTimeFormat, value: unknown) =>
  Object.fromEntries(
    formatter.formatToParts(new Date(String(value)))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: part }) => [type, part]),
  );

/** Format a stored UTC instant as the study's local wall-clock time. */
export const formatSydneyTime = (value: unknown) => displayFormatter.format(new Date(String(value)));

/** Export an unambiguous Sydney timestamp, including its DST-aware UTC offset. */
export const toSydneyTimestamp = (value: unknown) => {
  const valueParts = parts(exportFormatter, value);
  const offset = valueParts.timeZoneName.replace("GMT", "");
  return `${valueParts.year}-${valueParts.month}-${valueParts.day}T${valueParts.hour}:${valueParts.minute}:${valueParts.second}${offset}`;
};

export const localiseTimestampFields = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value != null && key.endsWith("_at") ? toSydneyTimestamp(value) : value,
  ]));
