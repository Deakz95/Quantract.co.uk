import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/server/prisma";
import { getAuthContext, requireAuth } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
import { setCompanyId, setProfileComplete } from "@/lib/serverAuth";

const schema = z.object({
  name: z.string().min(1),

  // Stored on User
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),

  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),

  // Client onboarding "service address" (mapped to Client.address*)
  serviceAddress1: z.string().optional(),
  serviceAddress2: z.string().optional(),
  serviceCity: z.string().optional(),
  serviceCounty: z.string().optional(),
  servicePostcode: z.string().optional(),
  serviceCountry: z.string().optional(),

  // Billing accepted but not persisted yet (until Prisma supports it)
  billingSameAsService: z.boolean().optional(),
  billingAddress1: z.string().optional(),
  billingAddress2: z.string().optional(),
  billingCity: z.string().optional(),
  billingCounty: z.string().optional(),
  billingPostcode: z.string().optional(),
  billingCountry: z.string().optional(),

  // Phone: persisted to Engineer.phone or Client.phone
  phone: z.string().optional(),
});

function clean(v?: string) {
  const t = v?.trim();
  return t && t.length > 0 ? t : null;
}

function requireFields(obj: any, fields: string[]) {
  return fields.filter((f) => !obj?.[f] || String(obj[f]).trim().length === 0);
}

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    // Use requireAuth which checks Neon Auth, Better Auth, and legacy sessions
    let ctx;
    try {
      ctx = await requireAuth();
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.message || "Unauthorized" },
        { status: e?.status || 401 }
      );
    }

    const bodyRaw = await req.json().catch(() => null);
    const parsed = schema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const db = getPrisma();

    const user = await db.user.findUnique({ where: { id: ctx.userId } });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Common user fields (NEVER write phone to User — it does not exist in Prisma User)
    const userData = {
      name: body.name.trim(),

      address1: clean(body.address1),
      address2: clean(body.address2),
      city: clean(body.city),
      county: clean(body.county),
      postcode: clean(body.postcode),
      country: clean(body.country),

      emergencyName: clean(body.emergencyName),
      emergencyPhone: clean(body.emergencyPhone),
      emergencyRelationship: clean(body.emergencyRelationship),

      profileComplete: true,
    };

    if (user.role === "engineer") {
      const miss = requireFields(body, [
        "name",
        "phone",
        "address1",
        "city",
        "postcode",
        "country",
        "emergencyName",
        "emergencyPhone",
      ]);
      if (miss.length) {
        return NextResponse.json(
          { ok: false, error: "Missing fields", fields: miss },
          { status: 400 }
        );
      }

      await db.user.update({
        where: { id: user.id },
        data: userData,
      });

      // Persist engineer phone on Engineer model
      if (user.engineerId) {
        await db.engineer.update({
          where: { id: user.engineerId },
          data: {
            name: body.name.trim(),
            phone: clean(body.phone),
          },
        });
      }

      await setProfileComplete(true);
      return NextResponse.json({ ok: true });
    }

    if (user.role === "client") {
      const miss = requireFields(body, [
        "name",
        "phone",
        "serviceAddress1",
        "serviceCity",
        "servicePostcode",
        "serviceCountry",
      ]);
      if (miss.length) {
        return NextResponse.json(
          { ok: false, error: "Missing fields", fields: miss },
          { status: 400 }
        );
      }

      await db.user.update({
        where: { id: user.id },
        data: userData,
      });

      if (user.clientId) {
        await db.client.update({
          where: { id: user.clientId },
          data: {
            name: body.name.trim() || user.email,
            phone: clean(body.phone),

            // Map service address -> Client address fields
            address1: clean(body.serviceAddress1),
            address2: clean(body.serviceAddress2),
            city: clean(body.serviceCity),
            county: clean(body.serviceCounty),
            postcode: clean(body.servicePostcode),
            country: clean(body.serviceCountry),
          },
        });
      }

      await setProfileComplete(true);
      return NextResponse.json({ ok: true });
    }

    // admin
    const miss = requireFields(body, ["name"]);
    if (miss.length) {
      return NextResponse.json(
        { ok: false, error: "Missing fields", fields: miss },
        { status: 400 }
      );
    }

    // If this is the first admin login, create a company + attach admin to it
    let companyId = user.companyId ?? null;

    if (!companyId) {
      const slug =
        (process.env.QT_COMPANY_SLUG || process.env.COMPANY_SLUG || "demo")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .slice(0, 40) || "demo";

      const name =
        (process.env.QT_COMPANY_NAME || process.env.COMPANY_NAME || "Quantract")
          .trim()
          .slice(0, 80) || "Quantract";

      // Create company (or reuse if slug already exists)
      const company =
        (await db.company.findUnique({ where: { slug } }).catch(() => null)) ??
        (await db.company.create({
          data: {
            slug,
            name,
            brandName: name,
          },
          select: { id: true },
        }));

      companyId = company.id;

      await db.user.update({
        where: { id: user.id },
        data: { companyId },
      });

      // Keeps your CompanyUser table in sync
      await db.companyUser.upsert({
        where: { companyId_email: { companyId, email: user.email } },
        update: { role: "admin", isActive: true },
        create: { companyId, email: user.email, role: "admin", isActive: true },
      });

      // Set cookie/session companyId so all APIs stop 401’ing
      await setCompanyId(companyId);
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        name: body.name.trim(),
        profileComplete: true,
      },
    });

    await setProfileComplete(true);
    return NextResponse.json({ ok: true, companyId });
  } catch (err) {
    console.error("Profile completion failed:", err);
    return NextResponse.json(
      { ok: false, error: "Profile completion failed" },
      { status: 500 }
    );
  }
});
