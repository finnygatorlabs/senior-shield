import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, userTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthRequest } from "../lib/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";
import crypto from "crypto";

const router: IRouter = Router();

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

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
    const email_verification_token = generateVerificationToken();

    const [newUser] = await db.insert(usersTable).values({
      email,
      password_hash,
      user_type,
      first_name: first_name || null,
      last_name: last_name || null,
      email_verified: false,
      email_verification_token,
    }).returning();

    await db.insert(userTiersTable).values({
      user_id: newUser.id,
      tier: "free",
      status: "active",
    });

    const token = generateToken({ userId: newUser.id, email: newUser.email, userType: newUser.user_type });

    req.log.info({ email, verificationToken: email_verification_token }, "New user signup — sending verification email");

    try {
      await sendVerificationEmail(email, email_verification_token, first_name);
    } catch (emailErr) {
      req.log.warn({ emailErr, email }, "Verification email failed to send — account created anyway");
    }

    res.status(201).json({
      user_id: newUser.id,
      token,
      user_type: newUser.user_type,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      onboarding_completed: newUser.onboarding_completed,
      email_verified: false,
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
      email_verified: user.email_verified,
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
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email, first_name: usersTable.first_name })
      .from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    req.log.info({ email, found: !!user }, "Forgot password request");
    if (user) {
      const resetToken = generateVerificationToken();
      try {
        await sendPasswordResetEmail(user.email, resetToken, user.first_name);
      } catch (emailErr) {
        req.log.warn({ emailErr, email }, "Password reset email failed to send");
      }
    }
    res.json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.json({ success: true, message: "If an account exists, a reset link has been sent." });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    if (!user) {
      res.json({ success: true });
      return;
    }
    if (user.email_verified) {
      res.json({ success: true, already_verified: true });
      return;
    }
    const newToken = generateVerificationToken();
    await db.update(usersTable).set({ email_verification_token: newToken }).where(eq(usersTable.id, user.id));
    req.log.info({ email, token: newToken }, "Resending verification email");
    try {
      await sendVerificationEmail(email, newToken, user.first_name);
    } catch (emailErr) {
      req.log.warn({ emailErr, email }, "Resend verification email failed");
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Resend verification error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Invalid token" });
      return;
    }
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email_verification_token, token)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Invalid or expired verification link" });
      return;
    }
    await db.update(usersTable)
      .set({ email_verified: true, email_verification_token: null })
      .where(eq(usersTable.id, user.id));
    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    req.log.error({ err }, "Email verification error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { access_token, user_type } = req.body;

    if (!access_token) {
      res.status(400).json({ error: "Bad Request", message: "access_token is required" });
      return;
    }

    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!googleRes.ok) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid Google token" });
      return;
    }

    const googleUser = await googleRes.json() as {
      email: string;
      given_name?: string;
      family_name?: string;
      sub: string;
    };

    if (!googleUser.email) {
      res.status(400).json({ error: "Bad Request", message: "Google account has no email" });
      return;
    }

    const email = googleUser.email.toLowerCase();

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (existing) {
      const token = generateToken({ userId: existing.id, email: existing.email, userType: existing.user_type });
      res.json({
        user_id: existing.id,
        token,
        user_type: existing.user_type,
        first_name: existing.first_name,
        last_name: existing.last_name,
        onboarding_completed: existing.onboarding_completed,
        email_verified: existing.email_verified,
        is_new_user: false,
      });
      return;
    }

    const [newUser] = await db.insert(usersTable).values({
      email,
      password_hash: hashPassword(crypto.randomBytes(32).toString("hex")),
      user_type: user_type || "senior",
      first_name: googleUser.given_name || null,
      last_name: googleUser.family_name || null,
      email_verified: true,
      email_verification_token: null,
    }).returning();

    await db.insert(userTiersTable).values({
      user_id: newUser.id,
      tier: "free",
      status: "active",
    });

    const token = generateToken({ userId: newUser.id, email: newUser.email, userType: newUser.user_type });

    req.log.info({ email }, "New user created via Google OAuth");

    res.status(201).json({
      user_id: newUser.id,
      token,
      user_type: newUser.user_type,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      onboarding_completed: newUser.onboarding_completed,
      email_verified: true,
      is_new_user: true,
    });
  } catch (err) {
    req.log.error({ err }, "Google auth error");
    res.status(500).json({ error: "Internal Server Error", message: "Google sign-in failed" });
  }
});

router.get("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }
    res.json({ user_id: user.id, email: user.email, user_type: user.user_type, email_verified: user.email_verified });
  } catch (err) {
    req.log.error({ err }, "Token verify error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
