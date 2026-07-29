import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "nkingsley130@gmail.com";
const ADMIN_PASSWORD = "admin134";
const ADMIN_NAME = "Admin";

/**
 * Ensures the owner admin account exists and has the correct role + password.
 * Runs on every server startup — safe on both dev and production.
 * - If the account doesn't exist → creates it as admin.
 * - If the account exists but is not admin → promotes it and resets the password.
 * - If the account exists as admin → no-op.
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL))
      .limit(1);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    if (!existing) {
      await db.insert(usersTable).values({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        isActive: true,
      });
      console.log("[seed] Admin account created:", ADMIN_EMAIL);
    } else if (existing.role !== "admin") {
      await db
        .update(usersTable)
        .set({ role: "admin", passwordHash, isActive: true })
        .where(eq(usersTable.id, existing.id));
      console.log("[seed] Account promoted to admin:", ADMIN_EMAIL);
    }
    // else: already admin — nothing to do
  } catch (err) {
    console.error("[seed] Could not seed admin user:", err);
  }
}
