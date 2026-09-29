import unittest

from providers import braincog_policy, hyperon_policy, POLICIES

def observation():
    return [0.0] * 16

class ProviderTests(unittest.TestCase):
    def test_hyperon_rule_execution(self):
        obs = observation()
        obs[2] = -0.8
        obs[13] = 0.8
        obs[14] = 0.7
        self.assertEqual(hyperon_policy(obs)["policy"], "conserve")

    def test_braincog_lif_inference(self):
        result = braincog_policy(observation())
        self.assertIn(result["policy"], POLICIES)
        self.assertEqual(result["source"], "braincog-lif")

    def test_invalid_observation_rejected(self):
        with self.assertRaises(ValueError):
            hyperon_policy([0.0, 2.0])

if __name__ == "__main__":
    unittest.main(verbosity=2)
