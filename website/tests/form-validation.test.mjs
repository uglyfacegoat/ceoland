import test from "node:test";
import assert from "node:assert/strict";
import { fieldError, normalizePhone } from "../src/form-validation.ts";

test("contact fields reject malformed input and accept real-world names and email", () => {
  for (const name of ["Ярослав", "Анна-Мария", "O’Connor", "李明"])
    assert.equal(fieldError("name", name, true), "");
  for (const name of ["", " ", "Я", "12345", "<script>"])
    assert.ok(fieldError("name", name, true));
  for (const email of ["name@example.com", "hello+ceo@sub.example.ru"])
    assert.equal(fieldError("email", email, true), "");
  for (const email of [
    "hello",
    "a@b",
    "a@@b.com",
    "a b@c.com",
    ".a@b.com",
    "a..b@c.com",
    "a@b..com",
  ])
    assert.ok(fieldError("email", email, true));
});
test("phone validation handles Russian and international formats without accepting arbitrary text", () => {
  for (const phone of [
    "+7 (999) 123-45-67",
    "8 999 123 45 67",
    "9991234567",
    "+44 20 7946 0958",
  ])
    assert.equal(fieldError("phone", phone, true), "");
  for (const phone of [
    "abcdefg",
    "12345",
    "+7 123456",
    "9999999999",
    "++79991234567",
    "+09991234567",
    "+1234567890123456",
  ])
    assert.ok(fieldError("phone", phone, true));
  assert.equal(normalizePhone("8 (999) 123-45-67"), "+79991234567");
  assert.equal(normalizePhone("999 1234567"), "+79991234567");
  assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
});
test("required agreements, address and optional code have explicit errors", () => {
  assert.ok(fieldError("privacy", "on", true, false));
  assert.equal(fieldError("privacy", "on", true, true), "");
  assert.ok(fieldError("address", "дом", true));
  assert.equal(fieldError("address", "Москва, Тверская, 1", true), "");
  assert.equal(fieldError("accessCode", "", false), "");
  assert.ok(fieldError("accessCode", "", true));
  assert.ok(fieldError("accessCode", "a".repeat(65), false));
});
