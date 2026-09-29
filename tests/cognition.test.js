import assert from "node:assert/strict";
import { createWorld, step, SUN_POLICIES } from "../src/simulation.js";
import { getCognitiveAdvice, COGNITION_MODES } from "../src/cognition.js";

for (const mode of COGNITION_MODES) {
  const world = createWorld(771);
  const advice = getCognitiveAdvice(world, mode);
  assert.equal(advice.mode, mode);
  if (mode === "off") assert.equal(advice.policyScores, null);
  else {
    assert.deepEqual(Object.keys(advice.policyScores).sort(), [...SUN_POLICIES].sort());
    for (const score of Object.values(advice.policyScores)) assert.ok(Number.isFinite(score) && score >= 0 && score <= 1);
  }
  step(world, { cognitiveAdvice: advice });
  assert.ok(SUN_POLICIES.includes(world.sun.policy));
  assert.equal(world.tick, 1);
}
console.log("Cognitive advisory integration tests passed");
