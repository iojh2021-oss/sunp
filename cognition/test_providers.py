import math
from braincog_provider import decide as braincog_decide
from hyperon_provider import decide as hyperon_decide

obs = [0.0] * 16
for provider in (braincog_decide, hyperon_decide):
    action = provider(obs)
    assert action in {"repair", "conserve", "balance", "diversity"}, action
    bad = obs.copy()
    bad[0] = 2
    try:
        provider(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("provider accepted out-of-range observation")
print("Provider contract checks passed")
