# SunP Cognitive Adapter (experimental)

This optional adapter keeps the JavaScript simulator authoritative and allows a separate cognitive process to propose one of four existing actions. It is intentionally not enabled by default.

## Run the safe baseline service

Requires Python 3.8+ and no third-party packages:

```sh
python3 cognition/service.py
```

It listens on 127.0.0.1:8765. Health: `GET /health`; decision: `POST /decide`.

Example request:
```json
{"version":1,"state":"calm","observation":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}
```

For remote hosting, set `SUNP_COGNITION_HOST=0.0.0.0` only behind a firewall/reverse proxy and set `SUNP_COGNITION_TOKEN`. Do not expose an unauthenticated endpoint to the public internet.

## JavaScript caller

`bridge.js` exports `chooseCognitivePolicy({observation,state,endpoint,token})`. Set endpoint to the service URL plus `/decide`. It validates the 16-value observation, validates the returned action against SunP's allowlist, times out, and returns a safe fallback when the service fails.

The adapter does not mutate the world. A caller must pass the returned policy to `step(world,{policyOverride: policy})` and keep the simulator's normal reward/learning path. Do not allow an external provider to write arbitrary world state.

## BrainCog and Hyperon provider work

The service currently reports `baseline-seam`; it does **not** import either framework. This makes the transport, validation, timeout, and fallback executable without forcing heavyweight research dependencies into SunP.

- BrainCog provider: install in an isolated Python environment after confirming the selected repository revision and compatible Python/PyTorch versions. Implement a provider that consumes the normalized observation and returns one allowed policy. Begin with a small CPU experiment; do not assume a GPU is required or available.
- Hyperon provider: add a separate MeTTa knowledge/rule module and invoke it through a pinned, tested Hyperon binding. Map only explicit world facts/rules into the knowledge space; return a proposal, never directly mutate the simulation.
- Keep each provider optional and selectable via server configuration. Benchmark each against existing SunP PPO and heuristic baselines on identical seeds before enabling it.

## Status / limitations

- No BrainCog or Hyperon dependency is installed by this adapter.
- No claim is made that a human brain or complete cognitive architecture has been implemented.
- The current endpoint is a runnable integration seam and conservative baseline, not a trained cognition model.
- Browser GitHub Pages cannot host this Python service; run it locally or on a separate server and connect through a secured API.
