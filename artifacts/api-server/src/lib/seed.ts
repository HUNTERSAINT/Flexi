import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Ensures the owner admin account exists in whatever database this server
 * is connected to (dev or production). Safe to run on every startup —
 * it is a no-op if the account already exists.
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const email = "nkingsley130@gmail.com";
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) return; // already present — nothing to do

    const passwordHash = await bcrypt.hash("admin134", 12);
    await db.insert(usersTable).values({
      name: "Admin",
      email,
      passwordHash,
      role: "admin",
      isActive: true,
    });

    console.log("[seed] Admin account created:", email);
  } catch (err) {
    // Non-fatal — log and continue so the server still starts
    console.error("[seed] Could not seed admin user:", err);
  }
}
