import { Router, IRouter } from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "@workspace/db";
import { adminUsersTable, adminActivityLogTable, usersTable, scamAnalysisTable, voiceAssistanceHistoryTable, supportTicketsTable, subscriptionsTable, facilityAccountsTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return "seniorshield-dev-only-secret-key";
})();

const router: IRouter = Router();

interface AdminRequest extends Express.Request {
  admin?: { adminId: string; email: string; role: string };
  log: any;
  params: any;
  body: any;
  query: any;
}

function requireAdmin(req: any, res: any, next: any): void {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Admin token required" });
    return;
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
    if (!decoded.isAdmin) {
      res.status(403).json({ error: "Forbidden", message: "Admin access required" });
      return;
    }
    req.admin = { adminId: decoded.adminId, email: decoded.email, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid admin token" });
  }
}

router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "email and password are required" });
      return;
    }

    const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    await db.update(adminUsersTable).set({ last_login: new Date() }).where(eq(adminUsersTable.id, admin.id));

    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role, isAdmin: true }, JWT_SECRET, { expiresIn: "8h" });

    res.json({ token, admin_id: admin.id, role: admin.role });
  } catch (err) {
    req.log?.error({ err }, "Admin login error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/dashboard", requireAdmin, async (req: any, res: any) => {
  try {
    const [userCount] = await db.select({ count: count() }).from(usersTable);
    const [scamCount] = await db.select({ count: count() }).from(scamAnalysisTable);
    const [voiceCount] = await db.select({ count: count() }).from(voiceAssistanceHistoryTable);
    const [ticketCount] = await db.select({ count: count() }).from(supportTicketsTable);

    res.json({
      total_users: userCount?.count || 0,
      total_scam_analyses: scamCount?.count || 0,
      total_voice_requests: voiceCount?.count || 0,
      open_tickets: ticketCount?.count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    req.log?.error({ err }, "Admin dashboard error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/users", requireAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = Math.min(parseInt(req.query.limit || "20"), 100);
    const offset = (page - 1) * limit;

    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      first_name: usersTable.first_name,
      last_name: usersTable.last_name,
      user_type: usersTable.user_type,
      onboarding_completed: usersTable.onboarding_completed,
      email_verified: usersTable.email_verified,
      created_at: usersTable.created_at,
    }).from(usersTable).orderBy(desc(usersTable.created_at)).limit(limit).offset(offset);

    const [total] = await db.select({ count: count() }).from(usersTable);

    res.json({ users, total: total?.count || 0, page, limit });
  } catch (err) {
    req.log?.error({ err }, "Admin list users error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/users/:userId", requireAdmin, async (req: any, res: any) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    const { password_hash, email_verification_token, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log?.error({ err }, "Admin get user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/users/:userId", requireAdmin, async (req: any, res: any) => {
  try {
    const allowed = ["first_name", "last_name", "user_type", "email_verified", "onboarding_completed"];
    const updates: Record<string, unknown> = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [updated] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, req.params.userId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    await db.insert(adminActivityLogTable).values({
      admin_id: req.admin.adminId,
      action: "update_user",
      resource_type: "user",
      resource_id: req.params.userId,
      changes: updates,
    });

    res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Admin update user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/users/:userId", requireAdmin, async (req: any, res: any) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.params.userId));

    await db.insert(adminActivityLogTable).values({
      admin_id: req.admin.adminId,
      action: "delete_user",
      resource_type: "user",
      resource_id: req.params.userId,
    });

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    req.log?.error({ err }, "Admin delete user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/facilities", requireAdmin, async (req: any, res: any) => {
  try {
    const facilities = await db.select().from(facilityAccountsTable).orderBy(desc(facilityAccountsTable.created_at));
    res.json({ facilities });
  } catch (err) {
    req.log?.error({ err }, "Admin list facilities error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/tickets", requireAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = Math.min(parseInt(req.query.limit || "20"), 100);
    const offset = (page - 1) * limit;

    const tickets = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.created_at)).limit(limit).offset(offset);
    const [total] = await db.select({ count: count() }).from(supportTicketsTable);

    res.json({ tickets, total: total?.count || 0, page, limit });
  } catch (err) {
    req.log?.error({ err }, "Admin list tickets error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/tickets/:ticketId", requireAdmin, async (req: any, res: any) => {
  try {
    const { status, response, priority } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (status !== undefined) updates.status = status;
    if (response !== undefined) updates.response = response;
    if (priority !== undefined) updates.priority = priority;

    const [updated] = await db.update(supportTicketsTable).set(updates as any).where(eq(supportTicketsTable.id, req.params.ticketId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    await db.insert(adminActivityLogTable).values({
      admin_id: req.admin.adminId,
      action: "update_ticket",
      resource_type: "ticket",
      resource_id: req.params.ticketId,
      changes: updates,
    });

    res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Admin update ticket error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/activity-log", requireAdmin, async (req: any, res: any) => {
  try {
    const logs = await db.select().from(adminActivityLogTable).orderBy(desc(adminActivityLogTable.created_at)).limit(50);
    res.json({ logs });
  } catch (err) {
    req.log?.error({ err }, "Admin activity log error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/learning-test", (_req: any, res: any) => {
  const htmlPath = path.resolve(process.cwd(), "../../src/frontend/admin-test.html");
  res.sendFile(htmlPath);
});

router.get("/learning-health", (_req: any, res: any) => {
  const proxyReq = http.request({ hostname: "localhost", port: 3000, path: "/health", method: "GET" }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", () => {
    res.status(502).json({ error: "Adaptive Learning Server unavailable" });
  });
  proxyReq.end();
});

router.use("/learning-api", (req: any, res: any) => {
  const targetPath = "/api" + req.url;
  const bodyStr = req.body ? JSON.stringify(req.body) : undefined;
  const headers: Record<string, string> = {
    host: "localhost:3000",
    "content-type": "application/json",
  };
  if (bodyStr) headers["content-length"] = Buffer.byteLength(bodyStr).toString();
  const options: http.RequestOptions = {
    hostname: "localhost",
    port: 3000,
    path: targetPath,
    method: req.method,
    headers,
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", () => {
    res.status(502).json({ error: "Adaptive Learning Server unavailable" });
  });
  if (bodyStr) {
    proxyReq.write(bodyStr);
  }
  proxyReq.end();
});

export default router;
