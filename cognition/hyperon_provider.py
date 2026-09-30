"""Execute actual MeTTa rules for a SunP-compatible policy proposal."""
import math
from hyperon import MeTTa

POLICIES = {"repair", "conserve", "balance", "diversity"}
RULES = """
(= (choose repair-risk) repair)
(= (choose water-risk) conserve)
(= (choose diversity-risk) diversity)
(= (choose stable) balance)
"""

def decide(observation):
    if len(observation) != 16 or any(not math.isfinite(float(x)) or not -1 <= x <= 1 for x in observation):
        raise ValueError("expected 16 normalized observations")
    # Convert continuous observations to explicit symbolic facts; MeTTa performs
    # the rule matching and returns the policy atom.
    if observation[8] < -0.25:
        condition = "repair-risk"
    elif observation[2] < -0.2 or observation[3] < -0.25:
        condition = "water-risk"
    elif observation[12] > 0.45:
        condition = "diversity-risk"
    else:
        condition = "stable"
    metta = MeTTa()
    result = metta.run(RULES + f" !(choose {condition})")
    if not result or not result[-1]:
        raise RuntimeError("MeTTa produced no policy")
    policy = str(result[-1][0])
    if policy not in POLICIES:
        raise RuntimeError(f"MeTTa returned invalid policy: {policy}")
    return policy

if __name__ == "__main__":
    obs = [0.0] * 16
    assert decide(obs) == "balance"
    weak = obs.copy()
    weak[8] = -0.8
    assert decide(weak) == "repair"
    dry = obs.copy()
    dry[2] = -0.8
    assert decide(dry) == "conserve"
    print("Hyperon MeTTa rule inference OK")
