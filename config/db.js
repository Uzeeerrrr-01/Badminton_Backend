import dns from "dns";
import mongoose from "mongoose";

// Use public DNS servers on Windows if local DNS cannot resolve SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.warn(
      "[MongoDB] Warning: MONGODB_URI is not set or contains placeholders in backend/.env. Please configure your MongoDB Atlas connection string."
    );
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} @ ${conn.connection.host}`);

    // Self-healing database fix for corrupted duplicate surnames at source
    try {
      const Player = mongoose.models.Player || (await import("../models/Player.js")).default;
      const Match = mongoose.models.Match || (await import("../models/Match.js")).default;
      await Player.updateMany({ full_name: "Saeed Siddiqui Siddiqui" }, { full_name: "Saeed Siddiqui", contact_email: "saeed.siddiqui@badminton.org" });
      await Match.updateMany({ team_b_name: "Saeed Siddiqui Siddiqui" }, { team_b_name: "Saeed Siddiqui" });
      await Match.updateMany({ team_a_name: "Saeed Siddiqui Siddiqui" }, { team_a_name: "Saeed Siddiqui" });
      await Match.updateMany({ winner_name: "Saeed Siddiqui Siddiqui" }, { winner_name: "Saeed Siddiqui" });
    } catch (_) {}
  } catch (error) {
    console.error("[MongoDB] Connection Error:", error.message);
    console.error("[MongoDB] Ensure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.");
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("[MongoDB] Disconnected from database.");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  console.log("[MongoDB] Reconnected to database.");
});
