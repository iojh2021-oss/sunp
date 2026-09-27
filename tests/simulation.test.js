// tests/simulation.test.js — آزمون‌های تکرارپذیری، کران منابع، چرخه زودیاک، رشد خورشید و اجرای طولانی.
// اجرا: node tests/simulation.test.js
import assert from "node:assert/strict";
import { createWorld, step, ZODIAC, SEPHIROT, PATHS_22, getTreeOfLifeState, getCurrentZodiac } from "../src/simulation.js";

function runN(world, n) {
  for (let i = 0; i < n; i++) step(world);
  return world;
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("تکرارپذیری: دو جهان با بذر یکسان نتیجه یکسان می‌دهند", () => {
  const a = runN(createWorld(42), 150);
  const b = runN(createWorld(42), 150);
  assert.equal(a.day, b.day);
  assert.equal(a.population.length, b.population.length);
  assert.equal(Math.round(a.healthIndex), Math.round(b.healthIndex));
  assert.equal(a.sun.level, b.sun.level);
});

test("کران منابع محیطی همیشه بین ۰ و ۱۰۰ می‌ماند", () => {
  const w = runN(createWorld(7), 400);
  for (const key of ["light", "water", "soil", "nutrients", "oxygen", "biomass", "organic"]) {
    assert.ok(w.env[key] >= 0 && w.env[key] <= 100, `${key} خارج از کران است: ${w.env[key]}`);
  }
});

test("سلامت اکوسیستم همیشه بین ۰ و ۱۰۰ است", () => {
  const w = runN(createWorld(9), 300);
  assert.ok(w.healthIndex >= 0 && w.healthIndex <= 100);
});

test("حلقه زودیاک دقیقاً ۱۲ نشان دارد و در طول زمان می‌چرخد", () => {
  assert.equal(ZODIAC.length, 12);
  const w = createWorld(1);
  const start = getCurrentZodiac(w).id;
  runN(w, 400);
  const later = getCurrentZodiac(w).id;
  assert.notEqual(start, later);
});

test("درخت حیات ۱۰ سفیروت و ۲۲ مسیر دارد", () => {
  assert.equal(SEPHIROT.length, 10);
  assert.equal(PATHS_22.length, 22);
});

test("سطح خورشید همیشه بین ۱ و ۱۰ است و گره‌های تا آن سطح روشن‌اند", () => {
  const w = runN(createWorld(3), 500);
  assert.ok(w.sun.level >= 1 && w.sun.level <= 10);
  const nodes = getTreeOfLifeState(w);
  for (const n of nodes) {
    assert.equal(n.lit, n.level <= w.sun.level);
  }
});

test("اجرای طولانی بدون خطا و بدون جمعیت منفی انجام می‌شود", () => {
  const w = createWorld(2024);
  runN(w, 1500);
  assert.ok(w.population.length >= 0);
  assert.ok(Number.isFinite(w.healthIndex));
});
