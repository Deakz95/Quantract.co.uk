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
      { label: "Electrical — power or lighting issue", nextId: "electrical-1" },
      { label: "Fire safety — alarms, detectors or emergency lighting", nextId: "fire-1" },
      { label: "Heating — electric heaters", nextId: "heating-1" },
      { label: "Something else", nextId: null, answer: "Please contact us directly so we can help. Use the 'Request Callback' button below." },
    ],
  },

  /* ── Electrical branch ── */
  "electrical-1": {
    id: "electrical-1",
    question: "What best describes the electrical issue?",
    options: [
      { label: "No power / power outage", nextId: "power-1" },
      { label: "Lights flickering or not working", nextId: "lights-1" },
      { label: "Sockets not working", nextId: null, answer: "Check the circuit breaker for the socket circuit in your consumer unit. If it has tripped, try resetting it. If it trips again or the socket shows scorch marks, stop using it and contact us immediately." },
      { label: "Something else electrical", nextId: null, answer: "Please contact us and describe the issue. Use the 'Request Callback' button below." },
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
  "lights-1": {
    id: "lights-1",
    question: "Is the issue with one light or multiple lights?",
    options: [
      { label: "One light fitting", nextId: null, answer: "Try replacing the bulb first (make sure the power is off). If a new bulb doesn't work, the fitting or its connection may be faulty. Contact us to investigate." },
      { label: "Multiple lights flickering", nextId: null, answer: "Flickering across multiple lights can indicate a loose neutral connection or supply issue. This should be inspected promptly. Contact us to arrange a check — do not ignore widespread flickering." },
      { label: "Lights on one circuit all out", nextId: null, answer: "Check your consumer unit — the lighting circuit MCB may have tripped. Try resetting it. If it trips again, there may be a fault on that circuit. Contact us." },
    ],
  },

  /* ── Fire safety / compliance branch ── */
  "fire-1": {
    id: "fire-1",
    question: "What fire safety issue are you experiencing?",
    options: [
      { label: "Smoke or heat detector fault", nextId: "fire-detectors" },
      { label: "Fire alarm panel showing a fault", nextId: "fire-panel" },
      { label: "Emergency lighting not working", nextId: "fire-emergency-lights" },
      { label: "Other fire safety concern", nextId: null, answer: "Please contact us to discuss your concern. For any immediate danger, call 999. Use the 'Request Callback' button below for non-urgent issues." },
    ],
  },
  "fire-detectors": {
    id: "fire-detectors",
    question: "What is the detector doing?",
    options: [
      { label: "Beeping intermittently", nextId: null, answer: "An intermittent beep usually means the battery is low. If the detector is battery-operated, try replacing the battery. If it is mains-powered with a backup battery, contact us to arrange a replacement — do not disconnect the detector." },
      { label: "Alarm sounding continuously with no fire/smoke", nextId: null, answer: "Ventilate the area (open windows) and check for steam, cooking fumes or dust near the detector. If the alarm does not stop after clearing the air, press the test/hush button if available. If it continues, contact us. Do not remove the detector." },
      { label: "Detector not responding at all", nextId: null, answer: "Press the test button on the detector. If there is no sound or light, the unit may have failed. Contact us to arrange an inspection and replacement. Do not leave the property without working detection — this is a safety requirement." },
    ],
  },
  "fire-panel": {
    id: "fire-panel",
    question: "What is the fire alarm panel showing?",
    options: [
      { label: "Fault light is on", nextId: null, answer: "A fault light usually indicates a wiring issue or a failed device on the system. Note down any zone number or message displayed, then contact us. Do not silence the panel yourself unless you know how to do so safely." },
      { label: "Panel is beeping but no fire", nextId: null, answer: "Check if the panel displays a zone or device number. This may indicate a detector fault or a wiring issue. Contact us with the information shown on the panel so we can diagnose the issue quickly." },
      { label: "Panel has no power", nextId: null, answer: "Check whether the mains supply to the panel is on (there may be a fused spur nearby). If it has a backup battery, the battery may have failed. Contact us to arrange an urgent inspection — a fire alarm system must remain operational." },
    ],
  },
  "fire-emergency-lights": {
    id: "fire-emergency-lights",
    question: "What is the emergency lighting issue?",
    options: [
      { label: "Emergency light stays on permanently", nextId: null, answer: "This usually means the unit has lost its mains supply and is running on battery. Check that the mains supply to the fitting is on. If the supply is fine, the charging circuit may have failed. Contact us to arrange a repair." },
      { label: "Emergency light does not come on during a power cut", nextId: null, answer: "The battery in the unit may have failed. Emergency lighting must be functional at all times — contact us to arrange a replacement. Your property should have working emergency lighting as part of fire safety compliance." },
      { label: "LED indicator is off or flashing red", nextId: null, answer: "A missing or red LED indicator usually signals a fault with the unit. Note which fitting is affected and contact us. We will arrange an inspection and replacement if needed." },
    ],
  },

  /* ── Heating branch (electric heaters only) ── */
  "heating-1": {
    id: "heating-1",
    question: "What type of electric heater do you have?",
    options: [
      { label: "Storage heaters", nextId: "heating-storage" },
      { label: "Panel heaters / convectors", nextId: "heating-panel" },
      { label: "Underfloor heating (electric)", nextId: null, answer: "Check your thermostat settings and that the timer is programmed correctly. If the system is unresponsive, the heating element or thermostat may have failed. Contact us to arrange an inspection." },
      { label: "Not sure / other electric heater", nextId: null, answer: "Contact us and describe the heater and the issue. We'll help identify the problem and arrange a visit if needed." },
    ],
  },
  "heating-storage": {
    id: "heating-storage",
    question: "What is the issue with your storage heater?",
    options: [
      { label: "Not warm in the morning", nextId: null, answer: "Storage heaters charge overnight on an Economy 7 / off-peak tariff. Check that the INPUT dial is turned up (this controls how much heat is stored). Also check your off-peak supply is working — your meter should show a separate off-peak reading. If settings look correct and the heater is still cold, contact us." },
      { label: "Runs out of heat too early", nextId: null, answer: "Turn the INPUT dial higher so the heater stores more heat overnight. Turn the OUTPUT/BOOST dial lower so heat is released more slowly during the day. If it still runs out, the elements may be degrading — contact us for an assessment." },
      { label: "Not working at all", nextId: null, answer: "Check the circuit breaker for the heater circuit in your consumer unit. Also check any isolator switch near the heater is ON. If the breaker has tripped, try resetting it. If it trips again or the heater still does not work, contact us." },
    ],
  },
  "heating-panel": {
    id: "heating-panel",
    question: "What is the issue with your panel heater?",
    options: [
      { label: "Heater not turning on", nextId: null, answer: "Check the heater's thermostat is set above the current room temperature and any timer is set to ON. Check the circuit breaker and any local isolator switch. If everything looks correct and the heater still does not respond, contact us." },
      { label: "Heater is on but not warming the room", nextId: null, answer: "Make sure the thermostat is set high enough and that the room is not excessively ventilated (open windows etc.). If the heater feels warm to the touch but is not effective, it may be undersized for the room. Contact us for advice." },
      { label: "Thermostat or timer not responding", nextId: null, answer: "Try turning the heater off at the wall for 30 seconds, then back on. If the controls are still unresponsive, the thermostat or programmer may have failed. Contact us to arrange a repair or replacement." },
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
