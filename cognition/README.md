# SunP Cognitive Adapter (experimental)

This optional Python service proposes one of SunP's existing actions. The JavaScript simulation remains authoritative; providers cannot mutate world state. The adapter/provider path is experimental and is not enabled in the live browser UI by default.

## Providers and CI tests

- `baseline` (default): safe deterministic fallback.
- `braincog`: prototype uses BrainCog LIF neurons with a fixed feature-to-current projection. It is an inference demonstration, **not a trained or biologically complete cognitive model**.
- `hyperon`: prototype runs explicit MeTTa rules to map a discretized observation condition to an allowed action.

GitHub Actions installs the frameworks and runs provider inference, input/action contract checks, and service routing/fallback checks. A green run verifies these prototypes execute in CI; it does not establish improved ecosystem performance or production readiness.

## Run locally

Python 3.10 recommended. Install only the provider you want to test:

```sh
python -m pip install hyperon==0.2.10
# or: python -m pip install braincog
```

Start baseline (default):
```sh
python cognition/service.py
```

Opt in to a provider:
```sh
SUNP_COGNITION_PROVIDER=hyperon python cognition/service.py
# or
SUNP_COGNITION_PROVIDER=braincog python cognition/service.py
```

Service listens on 127.0.0.1:8765. Health: `GET /health`; decision: `POST /decide`.

Example request:
```json
{"version":1,"state":"calm","observation":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}
```

Set `SUNP_COGNITION_TOKEN` when using authentication. Do not expose an unauthenticated endpoint publicly; use a firewall and TLS reverse proxy.

## JavaScript bridge and limitations

`bridge.js` exports `chooseCognitivePolicy({observation,state,endpoint,token})`. It validates the 16-value observation and allowlisted action, times out, and returns a safe fallback when the service fails. A caller must explicitly pass the returned policy to `step(world,{policyOverride: policy})`; the live UI currently does not call this provider path.

- GitHub Pages cannot host this Python service persistently.
- Provider prototypes need benchmarking against SunP PPO and heuristic baselines on identical seeds before considering activation.
- No claim is made that a human brain or complete cognitive architecture has been implemented.
