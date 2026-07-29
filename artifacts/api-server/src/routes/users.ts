import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, SQL, count } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/users
router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const { role, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (role) conditions.push(eq(usersTable.role, role as "customer" | "driver" | "admin"));
    if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, users] = await Promise.all([
      db.select({ count: count() }).from(usersTable).where(whereClause),
      db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      }).from(usersTable).where(whereClause).limit(limitNum).offset(offset).orderBy(usersTable.createdAt),
    ]);

    res.json({
      data: users,
      total: totalResult[0]?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id
router.get("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/:id
router.patch("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, isActive, role, password } = req.body;
    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;
    if (role !== undefined) updates.role = role;
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);
    updates.updatedAt = new Date();

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    });
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/users/:id
router.delete("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
