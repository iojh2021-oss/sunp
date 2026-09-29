"""Optional SunP cognition HTTP service with isolated provider selection.

Default is baseline. Set SUNP_COGNITION_PROVIDER=braincog or hyperon to opt in.
The simulator remains authoritative; provider failures return the safe baseline.
"""
import json
import math
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.getenv("SUNP_COGNITION_HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", os.getenv("SUNP_COGNITION_PORT", "8765")))
TOKEN = os.getenv("SUNP_COGNITION_TOKEN", "")
PROVIDER = os.getenv("SUNP_COGNITION_PROVIDER", "baseline").lower()
ALLOWED_ORIGIN = os.getenv(
    "SUNP_COGNITION_ALLOWED_ORIGIN", "https://iojh2021-oss.github.io"
)
POLICIES = {"repair", "conserve", "balance", "diversity"}


def validate_observation(obs):
    return isinstance(obs, list) and len(obs) == 16 and all(
        isinstance(x, (int, float)) and not isinstance(x, bool)
        and math.isfinite(x) and -1 <= x <= 1
        for x in obs
    )


def baseline(obs):
    water, soil, health, challenge, severity = obs[2], obs[3], obs[8], obs[13], obs[14]
    if challenge > 0 and severity > 0.15 and (water < -0.2 or soil < -0.25):
        return "conserve"
    if health < -0.25:
        return "repair"
    return "balance"


def decide(obs, provider=None):
    selected = (provider or PROVIDER).lower()
    if selected == "baseline":
        return {
            "policy": baseline(obs), "source": "sunp-baseline",
            "provider": "baseline", "fallback": False,
        }
    try:
        if selected == "braincog":
            from braincog_provider import decide as provider_decide
        elif selected == "hyperon":
            from hyperon_provider import decide as provider_decide
        else:
            raise ValueError("unknown provider")
        policy = provider_decide(obs)
        if policy not in POLICIES:
            raise ValueError("provider returned invalid policy")
        return {"policy": policy, "source": selected, "provider": selected, "fallback": False}
    except Exception as exc:
        return {
            "policy": baseline(obs), "source": "sunp-baseline-fallback",
            "provider": selected, "fallback": True, "error": type(exc).__name__,
        }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin")
        if origin == ALLOWED_ORIGIN:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        origin = self.headers.get("Origin")
        if origin != ALLOWED_ORIGIN:
            return self.send_json(403, {"error": "origin not allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"ok": True, "provider": PROVIDER})
        return self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/decide":
            return self.send_json(404, {"error": "not found"})
        if TOKEN and self.headers.get("Authorization") != "Bearer " + TOKEN:
            return self.send_json(401, {"error": "unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 16384:
                return self.send_json(413, {"error": "invalid body size"})
            data = json.loads(self.rfile.read(size))
            obs = data.get("observation")
            if data.get("version") != 1 or not validate_observation(obs):
                return self.send_json(400, {"error": "invalid observation"})
            requested_provider = data.get("provider")
            if requested_provider is not None and requested_provider not in {"braincog", "hyperon"}:
                return self.send_json(400, {"error": "provider must be braincog or hyperon"})
            return self.send_json(200, decide(obs, requested_provider))
        except (ValueError, TypeError, json.JSONDecodeError):
            return self.send_json(400, {"error": "bad json"})

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    print(f"SunP cognition service ({PROVIDER}) listening on http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
