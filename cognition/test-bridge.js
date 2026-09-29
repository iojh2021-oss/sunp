import assert from "node:assert/strict";
import { validateObservation, validateProposal, fallbackPolicy, requestCognitiveProposal, chooseCognitivePolicy } from "./bridge.js";

const obs = Array(16).fill(0);
assert.equal(validateObservation(obs), true);
assert.equal(validateObservation([0, 1]), false);
assert.equal(validateObservation(Array(16).fill(2)), false);
assert.equal(validateProposal({ policy: "repair" }).policy, "repair");
assert.equal(validateProposal({ policy: "delete-world" }), null);
assert.equal(fallbackPolicy(obs), "balance");
const weak = [...obs]; weak[8] = -0.7;
assert.equal(fallbackPolicy(weak), "repair");
const unavailable = await chooseCognitivePolicy({ observation: obs, endpoint: "http://127.0.0.1:1", timeoutMs: 50 });
assert.equal(unavailable.accepted, false);
const accepted = await requestCognitiveProposal({
  observation: obs, endpoint: "http://mock.invalid",
  fetchImpl: async () => ({ ok: true, json: async () => ({ policy: "diversity", source: "test" }) }),
});
assert.equal(accepted.policy, "diversity");
console.log("✓ cognitive adapter validation, fallback, and mocked service tests passed");
