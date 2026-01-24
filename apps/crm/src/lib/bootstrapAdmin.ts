import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Creates the initial ADMIN user once, using env vars.
 * Safe to call multiple times – will not overwrite an existing admin.
 */
export async function bootstrapAdminIfNeeded() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const existing = await prisma.user.findUnique({
    where: {
      role_email: {
        role: "admin",
        email,
      },
    },
  });

  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      role: "admin",
      email,
      passwordHash,
      name: process.env.ADMIN_NAME ?? "Admin",
      profileComplete: false,
    },
  });

  console.log("✅ Admin bootstrapped:", email);
}
