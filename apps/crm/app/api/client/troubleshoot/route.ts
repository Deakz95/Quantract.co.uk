import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { rateLimit, getClientIp } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * Client-facing troubleshooter: returns guided steps based on common issues.
 * No AI — purely rule-based decision tree for reliability and zero cost.
 */

interface TroubleshootStep {
  id: string;
  question: string;
  options: { label: string; nextId: string | null; answer?: string }[];
}

const DECISION_TREE: Record<string, TroubleshootStep> = {
  start: {
    id: "start",
    question: "What type of issue are you experiencing?",
    options: [
      { label: "No power / power outage", nextId: "power-1" },
      { label: "Heating not working", nextId: "heating-1" },
      { label: "Water leak or plumbing issue", nextId: "water-1" },
      { label: "Lights flickering or not working", nextId: "lights-1" },
      { label: "Something else", nextId: null, answer: "Please contact us directly so we can help. Use the 'Request Callback' button below." },
    ],
  },
  "power-1": {
    id: "power-1",
    question: "Is the whole property without power, or just certain areas?",
    options: [
      { label: "Whole property", nextId: "power-whole" },
      { label: "Just some rooms/circuits", nextId: "power-partial" },
    ],
  },
  "power-whole": {
    id: "power-whole",
    question: "Have you checked your consumer unit (fuse box)?",
    options: [
      { label: "Yes, the main switch has tripped", nextId: null, answer: "Try switching the main switch back ON. If it trips again immediately, do NOT attempt to reset it — this indicates a fault. Contact us for an emergency callout." },
      { label: "No, I haven't checked", nextId: null, answer: "Locate your consumer unit (usually near the front door or under the stairs). Check if the main switch (large switch at the top) is in the OFF position. If so, try switching it ON. If it trips again, contact us." },
      { label: "The main switch is ON but no power", nextId: null, answer: "This may be a supply issue from your electricity provider. Check if your neighbours also have no power. If it's just your property, contact us for an emergency inspection." },
    ],
  },
  "power-partial": {
    id: "power-partial",
    question: "Has a circuit breaker (MCB) tripped in your consumer unit?",
    options: [
      { label: "Yes, one or more MCBs are down", nextId: null, answer: "Unplug all devices on the affected circuit, then try resetting the MCB. If it stays on, plug devices back in one at a time to find the faulty appliance. If it keeps tripping, contact us." },
      { label: "All switches look normal", nextId: null, answer: "There may be a wiring fault. Do not attempt to fix this yourself. Contact us to arrange an inspection." },
    ],
  },
  "heating-1": {
    id: "heating-1",
    question: "What type of heating system do you have?",
    options: [
      { label: "Gas boiler", nextId: "heating-gas" },
      { label: "Electric heating", nextId: "heating-electric" },
      { label: "Heat pump", nextId: null, answer: "Heat pump issues require specialist diagnosis. Contact us to arrange a service visit." },
      { label: "Not sure", nextId: null, answer: "Contact us and we'll help identify your system and diagnose the issue." },
    ],
  },
  "heating-gas": {
    id: "heating-gas",
    question: "Is your boiler displaying an error code or flashing light?",
    options: [
      { label: "Yes, there's an error code", nextId: null, answer: "Note down the error code and contact us. Do not attempt to reset the boiler more than once. Common codes often indicate low pressure (try topping up via the filling loop) or a flame failure." },
      { label: "No error, but no heat", nextId: null, answer: "Check: 1) Thermostat is set above current room temperature. 2) Timer/programmer is set correctly. 3) Boiler pressure is between 1-1.5 bar. If all look fine, try resetting the boiler once. If still no heat, contact us." },
      { label: "Boiler won't turn on at all", nextId: null, answer: "Check the power supply to the boiler and that any isolation switches are ON. Check your gas supply is working (try another gas appliance). If the boiler still won't start, contact us." },
    ],
  },
  "heating-electric": {
    id: "heating-electric",
    question: "Are individual heaters not working, or is it the whole system?",
    options: [
      { label: "Individual heater", nextId: null, answer: "Check the heater's own thermostat and timer settings. Check the circuit breaker for that circuit hasn't tripped. If the heater is still not working, it may need replacing. Contact us." },
      { label: "Whole system", nextId: null, answer: "Check your consumer unit for tripped breakers on the heating circuit. Also check any central timer/programmer. If everything looks normal, contact us for a diagnosis." },
    ],
  },
  "water-1": {
    id: "water-1",
    question: "How severe is the leak?",
    options: [
      { label: "Active flooding / burst pipe", nextId: null, answer: "URGENT: Turn off your water at the stopcock immediately (usually under the kitchen sink or where the mains pipe enters the property). If it's a hot water leak, also turn off your boiler/immersion heater. Contact us for emergency callout." },
      { label: "Dripping or slow leak", nextId: null, answer: "Place a container under the leak. If it's from a tap, try tightening the tap. If from a pipe joint, note the location. Contact us to arrange a repair — a slow leak can cause significant damage over time if left." },
      { label: "Blocked drain or toilet", nextId: null, answer: "Try using a plunger first. For sinks, try clearing the trap (U-bend) under the sink. Do not use chemical drain cleaners on old pipework. If the blockage persists, contact us." },
    ],
  },
  "lights-1": {
    id: "lights-1",
    question: "Is the issue with one light or multiple lights?",
    options: [
      { label: "One light fitting", nextId: null, answer: "Try replacing the bulb first (make sure the power is off). If a new bulb doesn't work, the fitting or its connection may be faulty. Contact us to investigate." },
      { label: "Multiple lights flickering", nextId: null, answer: "Flickering across multiple lights can indicate a loose neutral connection or supply issue. This should be inspected promptly. Contact us to arrange a check — do not ignore widespread flickering." },
      { label: "Lights on one circuit all out", nextId: null, answer: "Check your consumer unit — the lighting circuit MCB may have tripped. Try resetting it. If it trips again, there may be a fault on that circuit. Contact us." },
    ],
  },
};

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRole("client");

    const url = new URL(req.url);
    const stepId = url.searchParams.get("step") || "start";

    const step = DECISION_TREE[stepId];
    if (!step) {
      return NextResponse.json({ ok: false, error: "invalid step" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: step });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/** POST: client requests a callback after troubleshooting */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    // Rate limit callback requests: 5/hour per IP
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `troubleshoot-cb:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });
    }

    await requireRole("client");
    const email = getUserEmail();

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);

    const client = await prisma.client.findFirst({
      where: { email, deletedAt: null },
    });
    if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

    // Create an enquiry from the troubleshooter
    const enquiry = await prisma.enquiry.create({
      data: {
        companyId: client.companyId,
        name: client.name || "Client",
        email: email || "",
        phone: client.phone || "",
        message: `[Troubleshooter callback request] ${body?.issue || "Client requested callback after using troubleshooter"}`,
        source: "troubleshooter",
        clientId: client.id,
      },
    });

    return NextResponse.json({ ok: true, data: { enquiryId: enquiry.id } }, { status: 201 });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "request_failed" }, { status: 500 });
  }
});
