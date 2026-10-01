from service import decide, validate_observation

obs = [0.0] * 16
assert validate_observation(obs)
assert not validate_observation([2.0] * 16)
assert decide(obs, "baseline")["provider"] == "baseline"
for name in ("braincog", "hyperon"):
    result = decide(obs, name)
    assert result["policy"] in {"repair", "conserve", "balance", "diversity"}, result
    assert result["fallback"] is False, result
    assert "confidence" in result
print("HTTP service provider selection and no-fallback inference checks passed")


for name, learner in (("braincog", None), ("hyperon", None)):
    learned = __import__(name + "_provider", fromlist=["learn"]).learn(obs, "balance", 1.0)
    assert learned["trained"] is True
print("Provider learning endpoint contract checks passed")
