import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, userTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, user_type, first_name, last_name } = req.body;

    if (!email || !password || !user_type) {
      res.status(400).json({ error: "Bad Request", message: "email, password, and user_type are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 8 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email already in use" });
      return;
    }

    const password_hash = hashPassword(password);

    const [newUser] = await db.insert(usersTable).values({
      email,
      password_hash,
      user_type,
      first_name: first_name || null,
      last_name: last_name || null,
    }).returning();

    await db.insert(userTiersTable).values({
      user_id: newUser.id,
      tier: "free",
      status: "active",
    });

    const token = generateToken({ userId: newUser.id, email: newUser.email, userType: newUser.user_type });

    res.status(201).json({
      user_id: newUser.id,
      token,
      user_type: newUser.user_type,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      onboarding_completed: newUser.onboarding_completed,
    });
  } catch (err) {
    req.log.error({ err }, "Signup error");
    res.status(500).json({ error: "Internal Server Error", message: "Could not create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "email and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, userType: user.user_type });

    res.json({
      user_id: user.id,
      token,
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name,
      onboarding_completed: user.onboarding_completed,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Bad Request", message: "email is required" });
      return;
    }
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    req.log.info({ email, found: !!user }, "Forgot password request");
    res.json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.json({ success: true, message: "If an account exists, a reset link has been sent." });
  }
});

router.get("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }
    res.json({ user_id: user.id, email: user.email, user_type: user.user_type });
  } catch (err) {
    req.log.error({ err }, "Token verify error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
