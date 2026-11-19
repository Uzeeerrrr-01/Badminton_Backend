import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "badminton-tournament-secret-key-change-in-production";

export function requireAdmin(req, res, next) {
  let token = null;

  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // 2. Check admin_token in Cookies
  if (!token && req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Admin access required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired admin token." });
  }
}

export function generateAdminToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
