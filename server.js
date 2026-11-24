import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
}

import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";

import { connectDB } from "./config/db.js";
import { realtime } from "./services/realtimeService.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import playerRoutes from "./routes/playerRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import pointRoutes from "./routes/pointRoutes.js";
import roundRoutes from "./routes/roundRoutes.js";
import realtimeRoutes from "./routes/realtimeRoutes.js";
import { syncAllParticipantStats } from "./controllers/matchController.js";

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Setup Socket.io for Real-time bidirectional WebSockets
const allowedOrigins = [
  FRONTEND_URL,
  "https://badminton.mediaiofficial.in",
  "https://api.badminton.mediaiofficial.in",
  "http://badminton.mediaiofficial.in",
  "http://api.badminton.mediaiofficial.in",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.) or matching allowed origins
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

realtime.setIO(io);

io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on("join_match", (matchId) => {
    if (matchId) socket.join(String(matchId));
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    server: "Badminton Tournament Portal API",
    time: new Date().toISOString(),
  });
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/points", pointRoutes);
app.use("/api/rounds", roundRoutes);
app.use("/api/realtime", realtimeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "API route not found." });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ServerError]:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error.",
  });
});

// Connect database and start server
async function startServer() {
  await connectDB();
  syncAllParticipantStats().catch((err) => console.error("Initial stats sync error:", err));
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🏸 Badminton Tournament Backend Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔌 Socket.io: Enabled (Origin: ${FRONTEND_URL})`);
    console.log(`📊 SSE Stream: http://localhost:${PORT}/api/realtime`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

startServer();
