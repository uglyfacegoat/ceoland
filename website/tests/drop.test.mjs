import test from "node:test";
import assert from "node:assert/strict";
import { nextDropAt, timeRemaining } from "../src/drop.ts";

test("drop deadline is midnight in Moscow, independent of viewer timezone", () => {
  assert.equal(new Date(nextDropAt).toISOString(), "2026-12-30T21:00:00.000Z");
});

test("countdown carries across days, hours and minutes", () => {
  const target = Date.parse(nextDropAt);
  assert.deepEqual(timeRemaining(target, target - 90061000), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
    ended: false,
  });
  assert.deepEqual(timeRemaining(target, target - 86400000), {
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ended: false,
  });
  assert.deepEqual(timeRemaining(target, target - 59999), {
    days: 0,
    hours: 0,
    minutes: 1,
    seconds: 0,
    ended: false,
  });
});

test("countdown only finishes at the deadline and never becomes negative", () => {
  assert.equal(timeRemaining(1000, 999).ended, false);
  for (const now of [1000, 1001, 999999]) {
    assert.deepEqual(timeRemaining(1000, now), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      ended: true,
    });
  }
  assert.throws(() => timeRemaining(NaN, 0), RangeError);
  assert.throws(() => timeRemaining(0, Infinity), RangeError);
});
