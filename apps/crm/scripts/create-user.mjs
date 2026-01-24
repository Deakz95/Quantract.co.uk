import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function arg(name) {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : null;
}

const role = arg("role");
const email = (arg("email") || "").trim().toLowerCase();
const password = arg("password") || "";
const name = arg("name") || null;

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
if (role !== "admin" && role !== "engineer") {
  console.error("Role must be admin|engineer (use --role=admin)");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Missing/invalid email (use --email=you@domain.com)");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("Password must be at least 8 chars (use --password=...)");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, name, passwordHash },
    create: { role, email, name, passwordHash },
  });
  console.log(`OK: ${user.role} user ${user.email}`);
} finally {
  await prisma.$disconnect();
}
