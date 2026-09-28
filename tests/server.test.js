// tests/server.test.js — آزمون سرور: ذخیره/بازیابی حافظه، جلوگیری از پس‌رفت، توکن و مسیرهای ایستا.
// اجرا: npm run test:server
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createWorld, step, exportMemory } from "../src/simulation.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sunp-"));
const proc = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1", SUNP_DATA_DIR: dir, SUNP_TOKEN: "secret" },
  stdio: ["ignore", "pipe", "inherit"],
});

const port = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("server did not start")), 5000);
  proc.stdout.on("data", (d) => {
    const m = /127\.0\.0\.1:(\d+)/.exec(String(d));
    if (m) { clearTimeout(t); resolve(Number(m[1])); }
  });
});
const url = (p) => `http://127.0.0.1:${port}${p}`;
const auth = { authorization: "Bearer secret", "content-type": "application/json" };

let failed = false;
async function test(name, fn) {
  try { await fn(); console.log(`✓ ${name}`); } catch (e) { failed = true; console.error(`✗ ${name}`); console.error(e); }
}

const w = createWorld(3);
for (let i = 0; i < 300; i++) step(w);
const mem = exportMemory(w);

await test("GET بدون حافظه → memory:null", async () => {
  const j = await (await fetch(url("/api/memory"))).json();
  assert.equal(j.memory, null);
});
await test("PUT بدون توکن رد می‌شود", async () => {
  const r = await fetch(url("/api/memory"), { method: "PUT", body: JSON.stringify(mem) });
  assert.equal(r.status, 401);
});
await test("PUT با توکن ذخیره می‌کند و GET همان را برمی‌گرداند", async () => {
  const r = await fetch(url("/api/memory"), { method: "PUT", headers: auth, body: JSON.stringify(mem) });
  assert.equal(r.status, 200);
  const j = await (await fetch(url("/api/memory"))).json();
  assert.equal(j.memory.sun.level, mem.sun.level);
  assert.equal(j.memory.stats.totalTicks, 300);
});
await test("حافظه‌ی قدیمی‌تر روی جدیدتر نمی‌نشیند (409)", async () => {
  const old = exportMemory(createWorld(3));
  const r = await fetch(url("/api/memory"), { method: "PUT", headers: auth, body: JSON.stringify(old) });
  assert.equal(r.status, 409);
});
await test("JSON خراب و حافظه‌ی نامعتبر رد می‌شود", async () => {
  assert.equal((await fetch(url("/api/memory"), { method: "PUT", headers: auth, body: "{oops" })).status, 400);
  assert.equal((await fetch(url("/api/memory"), { method: "PUT", headers: auth, body: "{}" })).status, 400);
});
await test("مسیرهای ایستا: صفحه اصلی OK، فایل‌های خصوصی 404", async () => {
  assert.equal((await fetch(url("/"))).status, 200);
  assert.equal((await fetch(url("/src/simulation.js"))).status, 200);
  for (const p of ["/server.js", "/package.json", "/data/memory.json", "/../server.js", "/src/../server.js"]) {
    assert.equal((await fetch(url(p))).status, 404, p);
  }
});
await test("DELETE با توکن حافظه را پاک می‌کند", async () => {
  assert.equal((await fetch(url("/api/memory"), { method: "DELETE", headers: auth })).status, 200);
  const j = await (await fetch(url("/api/memory"))).json();
  assert.equal(j.memory, null);
});

proc.kill();
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
