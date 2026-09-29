"""Minimal stdlib HTTP endpoint for an optional SunP cognition provider.

This is a runnable integration seam, not a claim that BrainCog/Hyperon are loaded.
It safely returns a baseline proposal until an explicitly configured provider is added.
Run: SUNP_COGNITION_TOKEN=... python3 cognition/service.py
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST = os.getenv("SUNP_COGNITION_HOST", "127.0.0.1")
PORT = int(os.getenv("SUNP_COGNITION_PORT", "8765"))
TOKEN = os.getenv("SUNP_COGNITION_TOKEN", "")

POLICIES = {"repair", "conserve", "balance", "diversity"}

def baseline(obs):
    water, soil, health, challenge, severity = obs[2], obs[3], obs[8], obs[13], obs[14]
    if challenge > 0 and severity > 0.15 and (water < -0.2 or soil < -0.25):
        return "conserve"
    if health < -0.25:
        return "repair"
    return "balance"

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"ok": True, "provider": "baseline-seam"})
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
            if data.get("version") != 1 or not isinstance(obs, list) or len(obs) != 16:
                return self.send_json(400, {"error": "invalid observation"})
            if any(not isinstance(x, (int, float)) or x < -1 or x > 1 for x in obs):
                return self.send_json(400, {"error": "observation values must be in [-1,1]"})
            return self.send_json(200, {"policy": baseline(obs), "source": "baseline-seam",
                                        "rationale": "Safe baseline; replace with tested BrainCog/Hyperon provider."})
        except (ValueError, TypeError):
            return self.send_json(400, {"error": "bad json"})
    def log_message(self, *_):
        pass

if __name__ == "__main__":
    print(f"SunP cognition seam listening on http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
