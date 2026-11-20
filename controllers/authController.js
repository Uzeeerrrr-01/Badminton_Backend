import Admin from "../models/Admin.js";
import { generateAdminToken } from "../middleware/auth.js";

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: "Invalid admin email or password." });
    }

    const payload = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };

    const token = generateAdminToken(payload);

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      authenticated: true,
      token,
      admin: payload,
      user: payload,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

export async function logout(req, res) {
  res.clearCookie("admin_token");
  return res.json({ success: true, message: "Logged out successfully." });
}

export async function getMe(req, res) {
  try {
    const admin = await Admin.findOne({ id: req.admin.id }).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }
    return res.json({
      authenticated: true,
      admin,
      user: admin,
    });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
