// src/scene.js — صحنه Canvas: خورشید (با درخشش متناسب با سطح رشد)، حلقه زودیاک، جزیره و موجودات.
// گرافیک فقط وضعیت واقعی موتور مدل را نمایش می‌دهد و منطق را تعیین نمی‌کند.
import { SPECIES, STAGE_FA, ZODIAC } from "./simulation.js";

const SPECIES_COLOR = {
  tree: "#3fae5c",
  flower: "#e07bb0",
  herbivore: "#c9a24b",
  pollinator: "#e0c34b",
  aquatic: "#4bb6e0",
  predator: "#d15b4b",
  fungus: "#a06be0",
};

export function initScene(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 560;
  const cssH = canvas.clientHeight || 360;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
}

export function renderScene(canvas, ctx, world) {
  const w = canvas.clientWidth || 560;
  const h = canvas.clientHeight || 360;
  ctx.clearRect(0, 0, w, h);

  // آسمان
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#07122e");
  sky.addColorStop(1, "#0e2a52");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const sunY = h * 0.27;
  const sunBaseR = 16 + world.sun.level * 2.2;

  // حلقه زودیاک دور خورشید
  const ringR = sunBaseR + 34;
  ctx.save();
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < ZODIAC.length; i++) {
    const ang = (i / ZODIAC.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * ringR;
    const y = sunY + Math.sin(ang) * ringR;
    const active = i === world.zodiacIndex;
    ctx.fillStyle = active ? "#ffe9a8" : "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(x, y, active ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(255,220,140,0.25)" : "transparent";
    ctx.fill();
    ctx.fillStyle = active ? "#ffe9a8" : "rgba(255,255,255,0.55)";
    ctx.fillText(ZODIAC[i].symbol, x, y);
  }
  ctx.restore();

  // درخشش خورشید متناسب با سطح رشد
  const glow = ctx.createRadialGradient(cx, sunY, 2, cx, sunY, sunBaseR * 3);
  glow.addColorStop(0, "rgba(255,224,140,0.85)");
  glow.addColorStop(1, "rgba(255,224,140,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, sunY, sunBaseR * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd35e";
  ctx.beginPath();
  ctx.arc(cx, sunY, sunBaseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07122e";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(world.sun.level), cx, sunY);

  // جزیره
  const islandCY = h * 0.82;
  const islandRX = w * 0.42;
  const islandRY = h * 0.14;
  ctx.fillStyle = "#1f6b3a";
  ctx.beginPath();
  ctx.ellipse(cx, islandCY, islandRX, islandRY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,200,255,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, islandCY, islandRX + 10, islandRY + 8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // موجودات
  world._hitboxes = [];
  const bandTop = sunY + sunBaseR + 40;
  const bandBottom = islandCY - 6;
  for (const e of world.population) {
    const t = e.pos.r;
    const x = cx + Math.cos(e.pos.a) * islandRX * 0.8 * t;
    const y = bandTop + (bandBottom - bandTop) * ((Math.sin(e.pos.a) * 0.5 + 0.5) * 0.7 + t * 0.15);
    const r = e.stage === "seed" ? 3 : e.stage === "sprout" ? 4.5 : e.stage === "immature" ? 6 : e.stage === "mature" ? 8 : e.stage === "aging" ? 6.5 : 3.5;
    ctx.fillStyle = SPECIES_COLOR[e.species] || "#ccc";
    ctx.globalAlpha = e.stage === "returning" ? 0.35 : 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (world.selectedId === e.id) {
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    world._hitboxes.push({ id: e.id, x, y, r: r + 4 });
  }
}

export function hitTestEntity(world, canvasX, canvasY) {
  if (!world._hitboxes) return null;
  for (const box of world._hitboxes) {
    const dx = box.x - canvasX;
    const dy = box.y - canvasY;
    if (Math.sqrt(dx * dx + dy * dy) <= box.r) return box.id;
  }
  return null;
}

export function speciesLabel(id) {
  return SPECIES[id] ? SPECIES[id].name : id;
}
