import math
from braincog_provider import decide as braincog_decide, learn as braincog_learn
from hyperon_provider import decide as hyperon_decide, learn as hyperon_learn

POLICIES = {"repair", "conserve", "balance", "diversity"}
obs = [0.0] * 16

for provider in (braincog_decide, hyperon_decide):
    action = provider(obs)
    assert action["policy"] in POLICIES, action
    assert all(math.isfinite(float(v)) for v in action["scores"].values()), action
    bad = obs.copy()
    bad[0] = 2
    try:
        provider(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("provider accepted out-of-range observation")

brain = braincog_learn(obs, "balance", 1.0)
assert brain["trained"] is True, brain

before = hyperon_decide(obs)
learned = hyperon_learn(obs, "diversity", 2.0)
after = hyperon_decide(obs)
assert learned["trained"] is True, learned
assert after["memory_policy"] == "diversity", after
assert after["learning_steps"] > before["learning_steps"], (before, after)

print("Provider contract, real inference, and measurable learning checks passed")
