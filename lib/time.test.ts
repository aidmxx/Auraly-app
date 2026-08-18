import assert from "node:assert/strict";
import test from "node:test";
import { formatSydneyTime, localiseTimestampFields, toSydneyTimestamp } from "./time";

test("formats historical winter timestamps in Sydney instead of server UTC", () => {
  assert.equal(formatSydneyTime("2026-08-18T08:33:25.000Z"), "18/08/2026, 6:33:25 pm AEST");
  assert.equal(toSydneyTimestamp("2026-08-18T08:33:25.000Z"), "2026-08-18T18:33:25+10:00");
});

test("uses Sydney daylight saving time for future summer data", () => {
  assert.equal(toSydneyTimestamp("2026-12-18T08:33:25.000Z"), "2026-12-18T19:33:25+11:00");
});

test("localises every timestamp field without changing other collected data", () => {
  assert.deepEqual(
    localiseTimestampFields({ created_at: "2026-08-18T08:33:25.000Z", submitted_at: null, answer: "text" }),
    { created_at: "2026-08-18T18:33:25+10:00", submitted_at: null, answer: "text" },
  );
});
