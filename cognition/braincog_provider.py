"""Functional BrainCog inference smoke test and isolated SunP action proposal."""
import math
import torch
from braincog.base.node.node import LIFNode

POLICIES = ("repair", "conserve", "balance", "diversity")

def decide(observation):
    if len(observation) != 16 or any(not math.isfinite(float(x)) or not -1 <= x <= 1 for x in observation):
        raise ValueError("expected 16 normalized observations")
    # A tiny fixed feature-to-current projection; BrainCog LIF neurons accumulate
    # these action currents over discrete steps. This is a prototype, not trained.
    scores = [
        max(0.0, -observation[8]),                         # repair: poor health
        max(0.0, -observation[2]) + max(0.0, -observation[3]), # conserve: low water/soil
        0.35,                                              # balance: safe default
        max(0.0, observation[12]),                         # diversity: diversity signal
    ]
    totals = []
    for score in scores:
        neuron = LIFNode(threshold=0.5, tau=2.0)
        spikes = 0.0
        current = torch.tensor([[float(score)]], dtype=torch.float32)
        for _ in range(8):
            out = neuron(current)
            spikes += float(out.detach().sum().item())
        totals.append(spikes)
    return POLICIES[max(range(4), key=lambda i: totals[i])]

if __name__ == "__main__":
    obs = [0.0] * 16
    policy = decide(obs)
    assert policy in POLICIES
    print("BrainCog LIF inference OK:", policy)
