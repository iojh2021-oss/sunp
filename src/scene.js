// src/scene.js — صحنه Canvas: خورشید، حلقه زودیاک، ذره‌های نور، جزیره و موجودات با آیکون واقعی.
// گرافیک فقط وضعیت واقعی موتور مدل را نمایش می‌دهد و منطق را تعیین نمی‌کند.
import { SPECIES, ZODIAC, CHALLENGES } from "./simulation.js";

const EMOJI_FONT = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';

const ICONS = {
  tree: { seed: "🌰", sprout: "🌱", immature: "🌿", mature: "🌳", fruiting: "🌳", aging: "🍂", returning: "🍂" },
  flower: { seed: "🌰", sprout: "🌱", immature: "🌿", mature: "🌼", fruiting: "🌸", aging: "🥀", returning: "🍂" },
  herbivore: "🦌",
  pollinator: "🐝",
  aquatic: "🐟",
  predator: "🐺",
  fungus: "🍄",
  // ۱۲ موجود زودیاک
  aries: "🐏",
  taurus: "🐂",
  gemini: "👯",
  cancer: "🦀",
  leo: "🦁",
  virgo: { seed: "🌾", sprout: "🌱", immature: "🌿", mature: "🌾", fruiting: "🌾", aging: "🥀", returning: "🍂" },
  libra: "⚖️",
  scorpio: "🦂",
  sagittarius: "🏹",
  capricorn: "🐐",
  aquarius: "🏺",
  pisces: "🐟",
};
const hitboxesByWorld = new WeakMap();

const STAGE_SIZE = { seed: 11, sprout: 14, immature: 18, mature: 26, fruiting: 28, aging: 22, returning: 16 };

const TINT = {
  drought: "rgba(255,170,60,0.16)",
  cold: "rgba(140,190,255,0.20)",
  blight: "rgba(120,200,90,0.18)",
  flood: "rgba(60,120,255,0.20)",
};

export function iconFor(e) {
  const set = ICONS[e.species];
  return typeof set === "string" ? set : set[e.stage];
}

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

function drawEmoji(ctx, ch, x, y, size, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, x, y);
  ctx.globalAlpha = 1;
}

export function renderScene(canvas, ctx, world, time = 0) {
  const w = canvas.clientWidth || 560;
  const h = canvas.clientHeight || 360;
  const t = time / 1000;
  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#07122e");
  sky.addColorStop(1, "#0e2a52");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const sunY = h * 0.25;
  const sunR = 15 + world.sun.level * 2.2;
  const ringR = sunR + 34;

  // حلقه زودیاک
  for (let i = 0; i < ZODIAC.length; i++) {
    const ang = (i / ZODIAC.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * ringR;
    const y = sunY + Math.sin(ang) * ringR;
    const active = i === world.zodiacIndex;
    if (active) {
      ctx.fillStyle = "rgba(255,220,140,0.28)";
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = active ? "#ffe9a8" : "rgba(255,255,255,0.5)";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ZODIAC[i].symbol, x, y);
  }

  // درخشش و خورشید (با ضربان ملایم)
  const pulse = 1 + Math.sin(t * 2) * 0.04;
  const glow = ctx.createRadialGradient(cx, sunY, 2, cx, sunY, sunR * 3 * pulse);
  glow.addColorStop(0, "rgba(255,224,140,0.85)");
  glow.addColorStop(1, "rgba(255,224,140,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, sunY, sunR * 3 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd35e";
  ctx.beginPath();
  ctx.arc(cx, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07122e";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(world.sun.level), cx, sunY);

  // جزیره
  const islandCY = h * 0.84;
  const islandRX = w * 0.44;
  const islandRY = h * 0.13;
  ctx.fillStyle = "#1f6b3a";
  ctx.beginPath();
  ctx.ellipse(cx, islandCY, islandRX, islandRY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,200,255,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, islandCY, islandRX + 10, islandRY + 8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ذره‌های نور: از خورشید به سمت جزیره می‌آیند (تعداد ∝ ذخیره ذره نور)
  const nDown = Math.min(14, Math.round(world.lightParticles / 4));
  for (let i = 0; i < nDown; i++) {
    const p = (t * 0.22 + i / Math.max(1, nDown)) % 1;
    const x = cx + Math.sin(i * 12.9898) * islandRX * 0.7 * p;
    const y = sunY + sunR + (islandCY - sunY - sunR - 10) * p;
    drawEmoji(ctx, "✨", x, y, 10, 0.85 * (1 - p * 0.4));
  }
  // بازگشت به خورشید: انرژی/تجربه از خاک به بالا می‌رود
  const nUp = Math.min(8, Math.ceil(world.recentReturns));
  for (let i = 0; i < nUp; i++) {
    const p = (t * 0.3 + i / Math.max(1, nUp)) % 1;
    const x = cx + Math.sin(i * 78.233 + 1) * islandRX * 0.5 * (1 - p);
    const y = islandCY - 10 - (islandCY - sunY - sunR - 10) * p;
    drawEmoji(ctx, "💫", x, y, 11, 0.9 * (1 - p * 0.5));
  }

  // موجودات
  const hitboxes = [];
  hitboxesByWorld.set(world, hitboxes);
  const bandTop = sunY + sunR + 44;
  const bandBottom = islandCY - 4;
  const sorted = [...world.population].sort((a, b) => a.pos.a - b.pos.a);
  for (const e of sorted) {
    const wander = e.role === "producer" || e.role === "decomposer" ? 0 : Math.sin(t * 1.2 + e.id * 1.7) * 5;
    const x = cx + Math.cos(e.pos.a) * islandRX * 0.82 * e.pos.r + wander;
    const y = bandTop + (bandBottom - bandTop) * ((Math.sin(e.pos.a) * 0.5 + 0.5) * 0.7 + e.pos.r * 0.15);
    let size = STAGE_SIZE[e.stage];
    if (e.role !== "producer" && e.stage === "mature") size = 22;
    const alpha = e.stage === "returning" ? 0.4 : e.stage === "aging" ? 0.8 : 1;
    drawEmoji(ctx, iconFor(e), x, y, size, alpha);
    if (e.stage === "fruiting" && e.species === "tree") drawEmoji(ctx, "🍎", x + 7, y + 4, 10, 1);
    if (world.selectedId === e.id) {
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7 + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    hitboxes.push({ id: e.id, x, y, r: size * 0.7 + 4 });
  }

  // رنگ‌آمیزی چالش فعال
  if (world.challenge) {
    ctx.fillStyle = TINT[world.challenge.type];
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`⚠ ${CHALLENGES[world.challenge.type].name}`, 10, 10);
  }
}

export function hitTestEntity(world, x, y) {
  const hitboxes = hitboxesByWorld.get(world);
  if (!hitboxes) return null;
  for (let i = hitboxes.length - 1; i >= 0; i--) {
    const b = hitboxes[i];
    if (Math.hypot(b.x - x, b.y - y) <= b.r) return b.id;
  }
  return null;
}

export function speciesLabel(id) {
  return SPECIES[id] ? SPECIES[id].name : id;
}
