import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import assert from "assert";
import http from "http";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "../routes/authRoutes.js";
import roundRoutes from "../routes/roundRoutes.js";
import matchRoutes from "../routes/matchRoutes.js";
import pointRoutes from "../routes/pointRoutes.js";
import Admin from "../models/Admin.js";

async function runApiIntegrationTests() {
  console.log("==================================================================");
  console.log("🌐 API INTEGRATION & AUTHORIZATION TEST SUITE");
  console.log("==================================================================");

  await mongoose.connect(process.env.MONGODB_URI);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRoutes);
  app.use("/api/rounds", roundRoutes);
  app.use("/api/matches", matchRoutes);
  app.use("/api/points", pointRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = "http://localhost:5099";

  console.log("✅ Express test server running on port 5099");

  // 1. Unauthorized test: call /api/rounds/create without admin token
  {
    console.log("\n--- TEST A: Unauthorized access blocked (401) ---");
    const res = await fetch(`${baseUrl}/api/rounds/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "Men's Singles" }),
    });
    assert.strictEqual(res.status, 401, "Expected 401 Unauthorized");
    const data = await res.json();
    assert.ok(data.error.includes("Unauthorized"), "Expected unauthorized error message");
    console.log("✅ Test A Passed: Unauthorized request correctly rejected with 401");
  }

  // 2. Admin Login
  let adminToken = "";
  {
    console.log("\n--- TEST B: Admin login & token generation ---");
    const admin = await Admin.findOne({ email: "admin@badminton.org" });
    if (!admin) {
      await Admin.create({
        id: "adm-test",
        email: "admin@badminton.org",
        password: "admin123",
        name: "Test Admin",
        role: "admin",
      });
    }

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@badminton.org", password: "admin123" }),
    });
    assert.strictEqual(res.status, 200, "Admin login should succeed");
    const data = await res.json();
    assert.ok(data.token, "Login should return a valid JWT");
    adminToken = data.token;
    console.log("✅ Test B Passed: Admin authenticated and JWT token issued");
  }

  // 3. Authorized preview fixture generation (using Mixed Doubles or fresh category)
  {
    console.log("\n--- TEST C: Authorized preview generation ---");
    const testCat = "Mixed Doubles";
    const res = await fetch(`${baseUrl}/api/rounds/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ category: testCat }),
    });
    assert.strictEqual(res.status, 200, "Authorized preview should succeed");
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.preview.fixtures.length > 0, "Fixtures should be generated");
    console.log(`✅ Test C Passed: Preview generated ${data.preview.fixtures.length} fixtures for ${testCat}`);
    if (data.preview.byeTeam) {
      console.log(`   - Bye allocated to: ${data.preview.byeTeam.name}`);
    }
  }

  // 4. Public overview API check
  {
    console.log("\n--- TEST D: Public Category Overview API ---");
    const res = await fetch(`${baseUrl}/api/rounds/category/Men's%20Singles/overview`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.totalRegisteredCompetitors > 0, "Should report registered competitors");
    console.log(`✅ Test D Passed: Overview returned ${data.totalRegisteredCompetitors} competitors`);
  }

  // 5. Public Bracket API check
  {
    console.log("\n--- TEST E: Public Bracket API ---");
    const res = await fetch(`${baseUrl}/api/rounds/category/Men's%20Singles/bracket`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    console.log("✅ Test E Passed: Bracket API successfully responded");
  }

  // 6. Public Standings API check
  {
    console.log("\n--- TEST F: Public Standings API ---");
    const res = await fetch(`${baseUrl}/api/rounds/category/Men's%20Singles/standings`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    console.log("✅ Test F Passed: Standings API successfully responded");
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL API INTEGRATION TESTS PASSED!");
  console.log("==================================================================");

  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

runApiIntegrationTests().catch((err) => {
  console.error("❌ API Test Failure:", err);
  process.exit(1);
});
