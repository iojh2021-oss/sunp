// SunP symbolic life-cycle engine. Not a scientific model.
export const PHASES = ["birth", "growth", "maturity", "decline", "return"];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createWorld(seed = 12) {
  return {
    tick: 0, paused: true, speed: 1, nextId: 1,
    sun: { level: 1, energy: 100, knowledge: 0, balance: 50, spawnEvery: 5, memory: [] },
    entities: [], events: [], seed
  };
}

function random(world) {
  world.seed = (world.seed * 1664525 + 1013904223) >>> 0;
  return world.seed / 4294967296;
}

function event(world, message) {
  world.events.unshift({ tick: world.tick, message });
  world.events = world.events.slice(0, 40);
}

function createLife(world) {
  if (world.sun.energy < 12) return;
  const id = world.nextId++;
  const traits = ["درخت", "گل", "موجود زنده", "جوانه"];
  const type = traits[Math.floor(random(world) * traits.length)];
  const energy = 8 + random(world) * 5;
  world.sun.energy -= energy;
  world.entities.push({ id, type, phase: "birth", age: 0, energy, growth: 0, lifespan: 22 + Math.floor(random(world) * 12), origin: "sun" });
  event(world, `موجود شماره ${id} از خورشید وارد چرخه شد.`);
}

export function stepWorld(world) {
  world.tick++;
  const sun = world.sun;
  // Sun's symbolic AI: evaluate balance, survival and returns, then adjust its next action.
  const living = world.entities.filter(e => e.phase !== "return").length;
  const returned = world.entities.filter(e => e.phase === "return").length;
  const balance = clamp(55 + returned * 2 - living * 1.8, 0, 100);
  sun.balance += (balance - sun.balance) * 0.08;
  sun.knowledge += returned ? 0.15 * returned : 0.02;
  sun.level = 1 + Math.floor(sun.knowledge / 8);
  sun.energy = clamp(sun.energy + 1.8 + returned * 2.5, 0, 100);
  sun.spawnEvery = clamp(Math.round(8 - sun.level * 0.35 + (living > 12 ? 3 : 0)), 3, 12);
  sun.memory.push({ tick: world.tick, living, returned, balance: Math.round(sun.balance) });
  if (sun.memory.length > 80) sun.memory.shift();

  for (const e of world.entities) {
    e.age++;
    if (e.phase === "birth" && e.age >= 2) { e.phase = "growth"; event(world, `موجود ${e.id}: آغاز رشد.`); }
    else if (e.phase === "growth") {
      e.growth = clamp(e.growth + 0.12 + sun.level * 0.005, 0, 1);
      e.energy -= 0.25;
      if (e.growth >= 1) { e.phase = "maturity"; event(world, `موجود ${e.id}: به بلوغ رسید.`); }
    } else if (e.phase === "maturity") {
      e.energy -= 0.18;
      if (e.age >= e.lifespan * 0.72 || e.energy <= 2) { e.phase = "decline"; event(world, `موجود ${e.id}: وارد مرحله افول شد.`); }
    } else if (e.phase === "decline") {
      e.energy -= 0.45;
      if (e.energy <= 0 || e.age >= e.lifespan) { e.phase = "return"; event(world, `موجود ${e.id}: انرژی خود را به خورشید بازگرداند.`); }
    }
    if (e.phase === "return") sun.energy = clamp(sun.energy + 0.8, 0, 100);
  }
  world.entities = world.entities.filter(e => e.phase !== "return" || e.age < e.lifespan + 3);
  if (world.tick % sun.spawnEvery === 0) createLife(world);
  if (world.tick % 10 === 0) event(world, `خورشید چرخه ${world.tick} را ارزیابی کرد؛ توازن ${Math.round(sun.balance)}٪.`);
  return world;
}

export function snapshot(world) {
  const count = phase => world.entities.filter(e => e.phase === phase).length;
  return {
    tick: world.tick, energy: Math.round(world.sun.energy), level: world.sun.level,
    knowledge: Math.round(world.sun.knowledge * 10) / 10,
    birth: count("birth"), growth: count("growth"), maturity: count("maturity"),
    decline: count("decline"), returning: count("return"), total: world.entities.length,
    balance: Math.round(world.sun.balance)
  };
}
