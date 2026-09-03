import User from "@/models/User";
import { ROLES } from "@/lib/roles";

let seeded = false;

// The very first admin account has to come from somewhere before anyone can
// log in to create more users. ADMIN_EMAIL/ADMIN_PASSWORD in .env.local (the
// latter already a bcrypt hash) seed that one bootstrap account into the
// users collection, once. After that, all auth reads from the DB and admins
// manage accounts from the Users page — the env vars are only a bootstrap.
export async function ensureAdminSeed() {
  if (seeded) return;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPasswordHash) {
    seeded = true;
    return;
  }

  const existing = await User.findOne({ email: adminEmail.trim().toLowerCase() });
  if (!existing) {
    await User.create({
      email: adminEmail.trim().toLowerCase(),
      password: adminPasswordHash,
      name: "Admin",
      role: ROLES.ADMIN,
    });
  }

  seeded = true;
}
