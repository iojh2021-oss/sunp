import { createWorld, step, getSunObservation, SUN_POLICIES } from "../src/simulation.js";

const seeds = (process.env.SUNP_BENCH_SEEDS || "101,202,303").split(",").map(Number);
const ticks = Number(process.env.SUNP_BENCH_TICKS || 120);
const endpoint = process.env.SUNP_COGNITION_ENDPOINT || "http://127.0.0.1:8765/decide";
const modes = ["ppo", "braincog", "hyperon"];

async function externalPolicy(world) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version: 1, state: world.challenge?.type || "calm", observation: getSunObservation(world) }),
  });
  if (!response.ok) throw new Error(`cognition service HTTP ${response.status}`);
  const result = await response.json();
  if (!SUN_POLICIES.includes(result.policy) || result.fallback) {
    throw new Error(`provider did not return a valid non-fallback action: ${JSON.stringify(result)}`);
  }
  return result.policy;
}

const report = { createdAt: new Date().toISOString(), seeds, ticks, note: "SunP symbolic model benchmark; same seeds and step counts. PPO is the existing in-engine adaptive policy; cognitive providers are inference prototypes.", results: {} };
for (const mode of modes) {
  const runs = [];
  for (const seed of seeds) {
    const world = createWorld(seed);
    let healthSum = 0, populationSum = 0, richnessSum = 0, aliveTicks = 0, decisionMs = 0;
    for (let i = 0; i < ticks; i++) {
      let policyOverride;
      if (mode !== "ppo") {
        const start = performance.now();
        policyOverride = await externalPolicy(world);
        decisionMs += performance.now() - start;
      }
      step(world, { policyOverride, learn: mode === "ppo" });
      healthSum += world.healthIndex;
      populationSum += world.population.length;
      richnessSum += new Set(world.population.map(e => e.species)).size;
      if (world.population.length > 0) aliveTicks++;
    }
    runs.push({
      seed, finalHealth: world.healthIndex, meanHealth: healthSum / ticks,
      finalPopulation: world.population.length, meanPopulation: populationSum / ticks,
      meanRichness: richnessSum / ticks, aliveRate: aliveTicks / ticks,
      challengesFaced: world.stats.challengesFaced,
      challengesSurvived: world.stats.challengesSurvived,
      meanDecisionMs: mode === "ppo" ? null : decisionMs / ticks,
    });
  }
  const mean = key => runs.reduce((sum, row) => sum + row[key], 0) / runs.length;
  report.results[mode] = { runs, meanHealth: mean("meanHealth"), meanPopulation: mean("meanPopulation"), meanRichness: mean("meanRichness"), meanAliveRate: mean("aliveRate"), meanDecisionMs: mode === "ppo" ? null : mean("meanDecisionMs") };
}
console.log(JSON.stringify(report, null, 2));
