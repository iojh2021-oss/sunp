// server.js — سرور بدون وابستگی برای SunP
//  • سایت ایستا را سرو می‌کند
//  • حافظه‌ی ماندگار خورشید را در data/memory.json نگه می‌دارد: GET/PUT/DELETE /api/memory
//  • اختیاری: SUNP_AUTORUN=1 → خود سرور هم شبیه‌سازی را بدون مرورگر اجرا می‌کند و خورشید همیشه در حال یادگیری است
//
// متغیرهای محیطی: PORT (8080) · HOST (0.0.0.0) · SUNP_DATA_DIR (./data) · SUNP_TOKEN (اختیاری؛ اگر ست شود PUT/DELETE نیاز به Bearer دارند)
//                 SUNP_AUTORUN (1 برای فعال‌سازی) · SUNP_TICK_MS (1000)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, step, exportMemory, sanitizeMemory } from "./src/simulation.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = path.resolve(process.env.SUNP_DATA_DIR || path.join(ROOT, "data"));
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");
const TOKEN = process.env.SUNP_TOKEN || "";
const AUTORUN = process.env.SUNP_AUTORUN === "1";
const TICK_MS = Number(process.env.SUNP_TICK_MS) || 1000;
const MAX_BODY = 100 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- حافظه ----------
function readMemory() {
  try {
    return sanitizeMemory(JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")));
  } catch (_) {
    return null;
  }
}

function writeMemory(mem) {
  const tmp = `${MEMORY_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ ...mem, savedAt: new Date().toISOString() }));
  fs.renameSync(tmp, MEMORY_FILE); // نوشتن اتمی
}

// ---------- اجرای خودکار (اختیاری) ----------
let autoWorld = null;
if (AUTORUN) {
  const existing = readMemory();
  const seed = 20260101 + (existing ? existing.stats.epochs * 7919 : 0);
  autoWorld = createWorld(seed, existing);
  setInterval(() => {
    step(autoWorld);
    if (autoWorld.tick % 20 === 0) writeMemory(exportMemory(autoWorld));
  }, TICK_MS);
  console.log(`[sunp] autorun فعال است (هر ${TICK_MS}ms یک گام)`);
}

// ---------- کمکی HTTP ----------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const STATIC_ALLOW = /^\/(?:|index\.html|style\.css|src\/[a-zA-Z0-9_-]+\.js|public\/models\/[a-zA-Z0-9_-]+\.json)$/;

function send(res, code, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function authorized(req) {
  if (!TOKEN) return true;
  return (req.headers.authorization || "") === `Bearer ${TOKEN}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleMemory(req, res) {
  if (req.method === "GET") {
    const mem = autoWorld ? exportMemory(autoWorld) : readMemory();
    return send(res, 200, { memory: mem, autorun: AUTORUN });
  }
  if (!authorized(req)) return send(res, 401, { error: "unauthorized" });

  if (req.method === "PUT") {
    if (AUTORUN) return send(res, 202, { ignored: true, reason: "autorun owns the memory" });
    let mem;
    try {
      mem = sanitizeMemory(JSON.parse(await readBody(req)));
    } catch (_) {
      return send(res, 400, { error: "bad json" });
    }
    if (!mem) return send(res, 400, { error: "invalid memory" });
    const current = readMemory();
    // جلوگیری از پس‌رفت: حافظه‌ی قدیمی‌تر روی حافظه‌ی جدیدتر نمی‌نشیند
    if (current && mem.stats.totalTicks < current.stats.totalTicks) {
      return send(res, 409, { error: "stale memory", current: current.stats.totalTicks });
    }
    writeMemory(mem);
    return send(res, 200, { ok: true, totalTicks: mem.stats.totalTicks });
  }

  if (req.method === "DELETE") {
    try { fs.unlinkSync(MEMORY_FILE); } catch (_) { /* ignore */ }
    if (autoWorld) autoWorld = createWorld(20260101, null);
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: "method not allowed" }, undefined, { allow: "GET, PUT, DELETE" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const p = decodeURIComponent(url.pathname);
    if (p === "/api/memory") return await handleMemory(req, res);
    if (p === "/api/health") return send(res, 200, { ok: true, autorun: AUTORUN });
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "method not allowed" });
    if (!STATIC_ALLOW.test(p)) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    const file = path.join(ROOT, p === "/" ? "index.html" : p);
    const data = fs.readFileSync(file);
    return send(res, 200, req.method === "HEAD" ? "" : data, MIME[path.extname(file)] || "application/octet-stream");
  } catch (err) {
    if (err && err.code === "ENOENT") return send(res, 404, "Not found", "text/plain; charset=utf-8");
    console.error("[sunp] error:", err && err.message);
    return send(res, 500, { error: "server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[sunp] http://${HOST}:${server.address().port}  (data: ${DATA_DIR}${TOKEN ? ", token فعال" : ""})`);
});

function shutdown() {
  if (autoWorld) writeMemory(exportMemory(autoWorld));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
