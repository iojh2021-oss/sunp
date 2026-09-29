"""Experimental BrainCog and Hyperon policy providers for SunP.

These are small functional prototypes for CI/integration testing, not trained
production agents. Both return proposals only; SunP remains authoritative.
"""
from __future__ import annotations

POLICIES = ("repair", "conserve", "balance", "diversity")

def _validate(obs):
    if not isinstance(obs, list) or len(obs) != 16:
        raise ValueError("observation must contain 16 values")
    if any(not isinstance(x, (int, float)) or not -1 <= x <= 1 for x in obs):
        raise ValueError("observation values must be in [-1, 1]")

def _symbolic_state(obs):
    water, soil, health = obs[2], obs[3], obs[8]
    challenge, severity = obs[13], obs[14]
    if challenge > 0.0 and severity > 0.15 and (water < -0.2 or soil < -0.25):
        return "water-stress"
    if health < -0.25:
        return "low-health"
    if obs[11] < -0.2:
        return "low-diversity"
    return "stable"

def hyperon_policy(obs):
    """Run real MeTTa rewrite rules on a compact symbolic state."""
    _validate(obs)
    from hyperon import MeTTa
    state = _symbolic_state(obs)
    metta = MeTTa()
    program = """
      (= (sun-policy water-stress) conserve)
      (= (sun-policy low-health) repair)
      (= (sun-policy low-diversity) diversity)
      (= (sun-policy stable) balance)
    """
    metta.run(program)
    result = metta.run(f"!(sun-policy {state})")
    if not result or not result[0]:
        raise RuntimeError(f"MeTTa returned no policy for {state}")
    policy = str(result[0][0])
    if policy not in POLICIES:
        raise RuntimeError(f"MeTTa returned invalid policy: {policy}")
    return {"policy": policy, "source": "hyperon-metta", "rationale": f"MeTTa rule for {state}"}

def braincog_policy(obs):
    """Run a small BrainCog LIF neuron layer over the 16-feature observation."""
    _validate(obs)
    import torch
    from braincog.base.node.node import LIFNode
    torch.manual_seed(7)
    encoder = torch.nn.Linear(16, 4, bias=True)
    with torch.no_grad():
        # Fixed, reproducible weights make CI behavior deterministic.
        encoder.weight.copy_(torch.tensor([
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, -0.8, -0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0],
            [0.0] * 16,
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0],
        ]))
        encoder.bias.copy_(torch.tensor([0.2, 0.2, 0.6, 0.2]))
    node = LIFNode(threshold=0.25, tau=2.0, step=1)
    with torch.no_grad():
        currents = encoder(torch.tensor([obs], dtype=torch.float32))
        spikes = node(currents)
    scores = spikes.reshape(-1).tolist()
    policy = POLICIES[max(range(4), key=lambda i: scores[i])]
    return {"policy": policy, "source": "braincog-lif", "rationale": "Fixed-weight BrainCog LIF inference prototype"}
