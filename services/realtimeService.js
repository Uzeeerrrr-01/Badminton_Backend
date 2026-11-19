import { EventEmitter } from "events";

class RealtimeService extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    this.sseClients = new Set();
  }

  setIO(ioInstance) {
    this.io = ioInstance;
    console.log("[Realtime] Socket.io server registered.");
  }

  addSseClient(res) {
    this.sseClients.add(res);
    res.on("close", () => {
      this.sseClients.delete(res);
    });
  }

  broadcast(event, data) {
    // 1. Emit via Node EventEmitter
    this.emit(event, data);

    // 2. Broadcast via Socket.io
    if (this.io) {
      this.io.emit(event, data);
      if (event === "match_update") {
        this.io.emit("score_update", data);
        if (data && data.id) {
          this.io.to(data.id).emit("match_update", data);
          this.io.to(data.id).emit("score_update", data);
        }
      }
    }

    // 3. Broadcast via Server-Sent Events (SSE)
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
        if (typeof client.flush === "function") client.flush();
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  broadcastMatchUpdate(match) {
    this.broadcast("match_update", match);
  }

  broadcastPointsUpdate(data = {}) {
    this.broadcast("points_update", data);
  }
}

export const realtime = new RealtimeService();
