"""SunP BrainCog agent: a real, stateful spiking policy learner.

This adapter uses the upstream BrainCog LIFNode implementation for the policy
network. SunP/PPO remains authoritative; this agent only proposes a policy.
Learning happens online through /feedback using the ecosystem reward.
"""
import math
import threading
import torch
from torch import nn
from braincog.base.node.node import LIFNode

POLICIES = ("repair", "conserve", "balance", "diversity")
_LOCK = threading.Lock()


class BrainCogAgent(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Linear(16, 24)
        self.hidden = LIFNode(threshold=0.5, tau=2.0)
        self.action = nn.Linear(24, 4)
        self.output = LIFNode(threshold=0.5, tau=2.0)
        self.optimizer = torch.optim.Adam(self.parameters(), lr=0.003)
        self.steps = 0

    def reset_state(self):
        self.hidden.n_reset()
        self.output.n_reset()

    def forward(self, observation, timesteps=8):
        x = torch.tensor([observation], dtype=torch.float32)
        spikes = []
        currents = []
        self.reset_state()
        for _ in range(timesteps):
            h = self.hidden(self.encoder(x))
            current = self.action(h)
            currents.append(current)
            spikes.append(self.output(current))
        spike_rate = torch.stack(spikes).mean(dim=0)
        mean_current = torch.stack(currents).mean(dim=0)
        # Combine learned membrane-driving evidence with spike activity.
        scores = mean_current + 0.35 * spike_rate
        return scores.squeeze(0), spike_rate.squeeze(0)

    def decide(self, observation):
        with _LOCK:
            with torch.no_grad():
                scores, spikes = self.forward(observation)
                probs = torch.softmax(scores, dim=0)
                idx = int(torch.argmax(probs).item())
                self.steps += 1
                return {
                    "policy": POLICIES[idx],
                    "scores": {p: float(probs[i]) for i, p in enumerate(POLICIES)},
                    "spike_rates": {p: float(spikes[i]) for i, p in enumerate(POLICIES)},
                    "confidence": float(probs[idx]),
                    "learning_steps": self.steps,
                }

    def learn(self, observation, policy, reward):
        if policy not in POLICIES or not math.isfinite(float(reward)):
            raise ValueError("invalid learning feedback")
        reward = max(-10.0, min(10.0, float(reward)))
        target_idx = POLICIES.index(policy)
        with _LOCK:
            self.optimizer.zero_grad(set_to_none=True)
            scores, _ = self.forward(observation)
            target = torch.tensor([target_idx], dtype=torch.long)
            # Positive reward reinforces the selected action; negative reward
            # reverses the update direction without changing SunP authority.
            loss = nn.functional.cross_entropy(scores.unsqueeze(0), target)
            signed_loss = loss * (-1.0 if reward > 0 else 1.0)
            if abs(reward) < 0.05:
                return {"trained": False, "loss": float(loss.detach()), "steps": self.steps}
            (signed_loss * min(1.0, abs(reward) / 3.0)).backward()
            torch.nn.utils.clip_grad_norm_(self.parameters(), 1.0)
            self.optimizer.step()
            self.steps += 1
            return {"trained": True, "loss": float(loss.detach()), "steps": self.steps}


_AGENT = BrainCogAgent()


def validate(observation):
    return isinstance(observation, list) and len(observation) == 16 and all(
        isinstance(x, (int, float)) and math.isfinite(float(x)) and -1 <= float(x) <= 1
        for x in observation
    )


def decide(observation):
    if not validate(observation):
        raise ValueError("expected 16 normalized observations")
    return _AGENT.decide([float(x) for x in observation])


def learn(observation, policy, reward):
    if not validate(observation):
        raise ValueError("expected 16 normalized observations")
    return _AGENT.learn([float(x) for x in observation], policy, reward)


if __name__ == "__main__":
    result = decide([0.0] * 16)
    assert result["policy"] in POLICIES
    print("BrainCog SNN agent OK:", result)
