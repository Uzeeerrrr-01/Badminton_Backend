import { Router } from "express";
import { realtime } from "../services/realtimeService.js";

const router = Router();

router.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000",
    "Access-Control-Allow-Credentials": "true",
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  // Initial ping
  res.write("event: connected\ndata: {\"status\":\"connected\"}\n\n");

  realtime.addSseClient(res);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

export default router;
