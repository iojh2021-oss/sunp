"""SunP Hyperon/MeTTa symbolic agent.

Uses the upstream Hyperon MeTTa interpreter for explicit symbolic reasoning,
while retaining a small in-process experience memory that can influence future
recommendations. SunP/PPO remains authoritative.
"""
import math
import threading
from hyperon import MeTTa

POLICIES = ("repair", "conserve", "balance", "diversity")
_LOCK = threading.Lock()
_MEMORY = {}
_STEPS = 0

RULES = r"""
(= (recommend repair-risk) repair)
(= (recommend water-risk) conserve)
(= (recommend diversity-risk) diversity)
(= (recommend imbalance-risk) balance)
(= (recommend stable) balance)
"""


def validate(observation):
    return isinstance(observation, list) and len(observation) == 16 and all(
        isinstance(x, (int, float)) and math.isfinite(float(x)) and -1 <= float(x) <= 1
        for x in observation
    )


def _state_key(obs):
    # Compact symbolic state: ecological risks, not raw floating point noise.
    return (
        "drought" if obs[2] < -0.2 else "water-ok",
        "soil-low" if obs[3] < -0.25 else "soil-ok",
        "health-low" if obs[8] < -0.25 else "health-ok",
        "diversity-high" if obs[12] > 0.45 else "diversity-normal",
        "challenge" if obs[13] > 0 else "calm",
    )


def _conditions(obs):
    facts = []
    if obs[8] < -0.25:
        facts.append("repair-risk")
    if obs[2] < -0.2 or obs[3] < -0.25:
        facts.append("water-risk")
    if obs[12] > 0.45:
        facts.append("diversity-risk")
    if not facts:
        facts.append("stable")
    return facts


def decide(observation):
    global _STEPS
    if not validate(observation):
        raise ValueError("expected 16 normalized observations")
    obs = [float(x) for x in observation]
    key = _state_key(obs)
    with _LOCK:
        metta = MeTTa()
        proposals = []
        for condition in _conditions(obs):
            result = metta.run(RULES + f" !(recommend {condition})")
            if result and result[-1]:
                policy = str(result[-1][0])
                if policy in POLICIES:
                    proposals.append(policy)

        # Learned symbolic memory is advisory: an experienced policy receives
        # extra support, but explicit current facts still produce the proposal.
        memory_policy = None
        if key in _MEMORY:
            memory_policy = max(_MEMORY[key], key=_MEMORY[key].get)
            proposals.append(memory_policy)

        counts = {p: 0.0 for p in POLICIES}
        for p in proposals:
            counts[p] += 1.0
        total = sum(counts.values()) or 1.0
        scores = {p: counts[p] / total for p in POLICIES}
        chosen = max(POLICIES, key=lambda p: (scores[p], p == memory_policy))
        _STEPS += 1
        return {
            "policy": chosen,
            "scores": scores,
            "confidence": scores[chosen],
            "rules": _conditions(obs),
            "memory_state": key,
            "memory_policy": memory_policy,
            "learning_steps": _STEPS,
        }


def learn(observation, policy, reward):
    global _STEPS
    if not validate(observation) or policy not in POLICIES or not math.isfinite(float(reward)):
        raise ValueError("invalid learning feedback")
    key = _state_key(observation)
    reward = max(-10.0, min(10.0, float(reward)))
    with _LOCK:
        row = _MEMORY.setdefault(key, {p: 0.0 for p in POLICIES})
        row[policy] += reward
        _STEPS += 1
        return {"trained": True, "state": key, "policy": policy, "reward": reward, "steps": _STEPS}


if __name__ == "__main__":
    obs = [0.0] * 16
    result = decide(obs)
    assert result["policy"] in POLICIES
    print("Hyperon MeTTa agent OK:", result)
