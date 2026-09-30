const RENDER_ORIGIN = "https://sunp-cognition-api.onrender.com";
const ALLOWED_ORIGIN = "https://iojh2021-oss.github.io";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin"
    };

    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response("Origin not allowed", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const allowedPath = ["/health", "/decide"].includes(url.pathname);
    if (!allowedPath) {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders
      });
    }

    if (
      (url.pathname === "/health" && request.method !== "GET") ||
      (url.pathname === "/decide" && request.method !== "POST")
    ) {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const upstream = await fetch(RENDER_ORIGIN + url.pathname, {
        method: request.method,
        headers: {
          "Content-Type":
            request.headers.get("Content-Type") || "application/json"
        },
        body: request.method === "POST"
          ? await request.arrayBuffer()
          : undefined
      });

      const headers = new Headers(upstream.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Render API unreachable" }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
