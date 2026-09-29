// Optional, fail-safe connector for an external cognitive service.
// The simulator remains authoritative: this module only returns a validated policy proposal.
export const SUNP_POLICIES = Object.freeze(["repair", "conserve", "balance", "diversity"]);

export function validateObservation(observation) {
  return Array.isArray(observation) &&
    observation.length === 16 &&
    observation.every((v) => Number.isFinite(v) && v >= -1 && v <= 1);
}

export function validateProposal(payload) {
  if (!payload || typeof payload !== "object") return null;
  const policy = payload.policy;
  if (!SUNP_POLICIES.includes(policy)) return null;
  return {
    policy,
    source: typeof payload.source === "string" ? payload.source.slice(0, 80) : "external-cognition",
    rationale: typeof payload.rationale === "string" ? payload.rationale.slice(0, 500) : "",
    provider: typeof payload.provider === "string" ? payload.provider.slice(0, 80) : "",
    fallback: payload.fallback === true,
  };
}

export async function requestCognitiveProposal({ observation, state = "calm", provider, endpoint, token, fetchImpl = fetch, timeoutMs = 2500 } = {}) {
  if (!validateObservation(observation) || !endpoint) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ version: 1, observation, state, ...(provider ? { provider } : {}) }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return validateProposal(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Conservative built-in fallback for when the optional service is unavailable.
export function fallbackPolicy(observation) {
  if (!validateObservation(observation)) return "balance";
  // Observation indices: water=2, soil=3, health=8, challenge=13, severity=14.
  const [water, soil, health, challenge, severity] = [observation[2], observation[3], observation[8], observation[13], observation[14]];
  if (challenge > 0 && severity > 0.15 && (water < -0.2 || soil < -0.25)) return "conserve";
  if (health < -0.25) return "repair";
  return "balance";
}

export async function chooseCognitivePolicy(args) {
  const proposal = await requestCognitiveProposal(args);
  return proposal ? { ...proposal, accepted: true } : {
    policy: fallbackPolicy(args?.observation),
    source: "sunp-fallback",
    rationale: "External cognitive service unavailable or returned an invalid proposal.",
    accepted: false,
  };
}
