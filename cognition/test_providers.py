import math
from braincog_provider import decide as braincog_decide
from hyperon_provider import decide as hyperon_decide

obs = [0.0] * 16
for provider in (braincog_decide, hyperon_decide):
    action = provider(obs)
    if isinstance(action, str):
        assert action in {"repair", "conserve", "balance", "diversity"}, action
    else:
        assert action["policy"] in {"repair", "conserve", "balance", "diversity"}, action
    bad = obs.copy()
    bad[0] = 2
    try:
        provider(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("provider accepted out-of-range observation")
print("Provider contract checks passed")


from braincog_provider import learn as braincog_learn
from hyperon_provider import learn as hyperon_learn

assert braincog_learn(obs, "balance", 1.0)["trained"] is True
assert hyperon_learn(obs, "balance", 1.0)["trained"] is True
print("Provider learning feedback checks passed")
