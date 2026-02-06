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
  options: { label: string; nextId: string | null; answer?: string; urgent?: boolean }[];
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
      { label: "Burning smell or sparking from sockets/switches", nextId: "electrical-burning" },
      { label: "RCD keeps tripping", nextId: "electrical-rcd" },
      { label: "Electric shower not working", nextId: "electrical-shower" },
      { label: "Outdoor / garden electrical issue", nextId: "electrical-outdoor" },
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
      { label: "Multiple lights flickering", nextId: null, answer: "Flickering across multiple lights can indicate a loose neutral connection or supply issue. This should be inspected promptly. Contact us to arrange a check — do not ignore widespread flickering.", urgent: true },
      { label: "Lights on one circuit all out", nextId: null, answer: "Check your consumer unit — the lighting circuit MCB may have tripped. Try resetting it. If it trips again, there may be a fault on that circuit. Contact us." },
    ],
  },

  /* ── NEW: Burning smell / sparking ── */
  "electrical-burning": {
    id: "electrical-burning",
    question: "Where is the burning smell or sparking coming from?",
    options: [
      { label: "A socket or plug", nextId: null, answer: "Turn off the supply to that socket immediately at the consumer unit. Do not use the socket or unplug anything if you see scorch marks or smell burning — leave it and contact us for an emergency callout. This could indicate a serious wiring fault.", urgent: true },
      { label: "A light switch or fitting", nextId: null, answer: "Turn off the lighting circuit at the consumer unit immediately. Do not operate the switch again. A burning smell or sparking from a switch can indicate a loose connection or overloaded fitting. Contact us urgently.", urgent: true },
      { label: "The consumer unit (fuse box)", nextId: null, answer: "This is potentially dangerous. Turn off the main switch if you can do so safely. If you see flames or heavy smoke, leave the property and call 999. Otherwise, contact us immediately for an emergency callout.", urgent: true },
      { label: "Not sure / general burning smell", nextId: null, answer: "If you can smell burning but cannot identify the source, turn off the main switch at your consumer unit as a precaution. If the smell is strong or you see smoke, leave the property and call 999. Otherwise, contact us immediately.", urgent: true },
    ],
  },

  /* ── NEW: RCD tripping ── */
  "electrical-rcd": {
    id: "electrical-rcd",
    question: "How often is the RCD tripping?",
    options: [
      { label: "It trips immediately when I reset it", nextId: null, answer: "There is likely an active fault on one of the circuits protected by the RCD. Do not keep resetting it. Unplug all appliances and try resetting. If it stays on, plug items back one at a time to identify the faulty appliance. If it still trips with everything unplugged, contact us — the fault is in the fixed wiring.", urgent: true },
      { label: "It trips occasionally / randomly", nextId: null, answer: "Intermittent RCD trips can be caused by a faulty appliance, moisture in an outdoor fitting, or degrading wiring insulation. Note when it happens (e.g. when using a specific appliance, during rain). Contact us with these details and we can investigate." },
      { label: "What is the difference between an RCD and an MCB?", nextId: null, answer: "An MCB (Miniature Circuit Breaker) protects against overloads and short circuits on a single circuit. An RCD (Residual Current Device) protects against earth faults and electric shock — it covers multiple circuits. The RCD is usually a wider switch in your consumer unit. If your RCD trips, it affects all circuits it protects." },
    ],
  },

  /* ── NEW: Electric shower ── */
  "electrical-shower": {
    id: "electrical-shower",
    question: "What is happening with the electric shower?",
    options: [
      { label: "No power at all — shower is completely dead", nextId: null, answer: "Check the pull-cord isolator switch (usually on the ceiling outside the bathroom) is ON. Also check the circuit breaker for the shower circuit in your consumer unit. If both are on and the shower still has no power, the heating element or control unit may have failed. Contact us to arrange an inspection." },
      { label: "Water is running but not heating up", nextId: null, answer: "This usually means the heating element has failed. Check the flow rate setting — a lower flow setting heats water more effectively. If the water remains cold on all settings, the element needs replacing. Contact us to arrange a repair. Do not attempt to repair the shower yourself as it operates at high voltage." },
      { label: "Shower trips the circuit breaker", nextId: null, answer: "An electric shower draws a high current. If it trips the breaker, the shower unit may have an internal fault or water may have entered the electrical connections. Stop using the shower and contact us. Do not keep resetting the breaker and trying again.", urgent: true },
    ],
  },

  /* ── NEW: Outdoor / garden electrical ── */
  "electrical-outdoor": {
    id: "electrical-outdoor",
    question: "What outdoor electrical issue are you experiencing?",
    options: [
      { label: "Outdoor socket not working", nextId: null, answer: "Outdoor sockets should be RCD-protected. Check your consumer unit for a tripped RCD or MCB. Moisture or water ingress can trip the RCD — check the socket cover is properly closed and there is no visible water damage. If you cannot reset the circuit, contact us." },
      { label: "Garden lighting not working", nextId: null, answer: "Check the circuit breaker and any local switches or timers. If the lights are low-voltage (e.g. LED garden lights on a transformer), check the transformer is powered and the connections are dry. For mains-voltage garden lights, do not attempt to repair connections outdoors yourself — contact us." },
      { label: "Tripping when using outdoor equipment", nextId: null, answer: "Outdoor circuits are typically RCD-protected. A trip when using tools or equipment often means the equipment has a fault or the cable/extension lead is damaged. Check your equipment and cables for visible damage. Try a different appliance on the same socket. If the circuit still trips, contact us." },
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
      { label: "Carbon monoxide (CO) detector issue", nextId: "fire-co-detector" },
      { label: "Fire door concern", nextId: "fire-doors" },
      { label: "Compliance certificates — EICR or fire alarm", nextId: "fire-compliance" },
      { label: "Other fire safety concern", nextId: null, answer: "Please contact us to discuss your concern. For any immediate danger, call 999. Use the 'Request Callback' button below for non-urgent issues." },
    ],
  },
  "fire-detectors": {
    id: "fire-detectors",
    question: "What is the detector doing?",
    options: [
      { label: "Beeping intermittently", nextId: null, answer: "An intermittent beep usually means the battery is low. If the detector is battery-operated, try replacing the battery. If it is mains-powered with a backup battery, contact us to arrange a replacement — do not disconnect the detector." },
      { label: "Alarm sounding continuously with no fire/smoke", nextId: null, answer: "Ventilate the area (open windows) and check for steam, cooking fumes or dust near the detector. If the alarm does not stop after clearing the air, press the test/hush button if available. If it continues, contact us. Do not remove the detector.", urgent: true },
      { label: "Detector not responding at all", nextId: null, answer: "Press the test button on the detector. If there is no sound or light, the unit may have failed. Contact us to arrange an inspection and replacement. Do not leave the property without working detection — this is a safety requirement.", urgent: true },
    ],
  },
  "fire-panel": {
    id: "fire-panel",
    question: "What is the fire alarm panel showing?",
    options: [
      { label: "Fault light is on", nextId: null, answer: "A fault light usually indicates a wiring issue or a failed device on the system. Note down any zone number or message displayed, then contact us. Do not silence the panel yourself unless you know how to do so safely." },
      { label: "Panel is beeping but no fire", nextId: null, answer: "Check if the panel displays a zone or device number. This may indicate a detector fault or a wiring issue. Contact us with the information shown on the panel so we can diagnose the issue quickly." },
      { label: "Panel has no power", nextId: null, answer: "Check whether the mains supply to the panel is on (there may be a fused spur nearby). If it has a backup battery, the battery may have failed. Contact us to arrange an urgent inspection — a fire alarm system must remain operational.", urgent: true },
    ],
  },
  "fire-emergency-lights": {
    id: "fire-emergency-lights",
    question: "What is the emergency lighting issue?",
    options: [
      { label: "Emergency light stays on permanently", nextId: null, answer: "This usually means the unit has lost its mains supply and is running on battery. Check that the mains supply to the fitting is on. If the supply is fine, the charging circuit may have failed. Contact us to arrange a repair." },
      { label: "Emergency light does not come on during a power cut", nextId: null, answer: "The battery in the unit may have failed. Emergency lighting must be functional at all times — contact us to arrange a replacement. Your property should have working emergency lighting as part of fire safety compliance.", urgent: true },
      { label: "LED indicator is off or flashing red", nextId: null, answer: "A missing or red LED indicator usually signals a fault with the unit. Note which fitting is affected and contact us. We will arrange an inspection and replacement if needed." },
    ],
  },

  /* ── NEW: Carbon monoxide (CO) detector ── */
  "fire-co-detector": {
    id: "fire-co-detector",
    question: "What is happening with the carbon monoxide detector?",
    options: [
      { label: "CO alarm is sounding", nextId: null, answer: "If your CO alarm is sounding, take this seriously. Open all windows and doors, turn off any appliances you can do safely, and leave the property. Call the Gas Emergency line (0800 111 999) if you have gas appliances, or contact us immediately. Do not return until the property has been checked by a qualified engineer.", urgent: true },
      { label: "Detector is beeping intermittently", nextId: null, answer: "An intermittent beep (typically once every 30–60 seconds) usually indicates a low battery or end-of-life warning. Check the detector's display or manual. If it is battery-powered, try replacing the battery. CO detectors typically last 5–7 years — if yours is older, it may need replacing. Contact us if you are unsure." },
      { label: "Detector display shows a reading but no alarm", nextId: null, answer: "Some CO detectors show a digital reading of CO levels. Low readings (under 50 ppm) may not trigger the alarm but indicate CO is present. Ventilate the area and monitor the reading. If it rises or you feel unwell (headache, dizziness, nausea), leave the property and seek medical attention. Contact us to investigate the source." },
      { label: "Where should the CO detector be placed?", nextId: null, answer: "CO detectors should be placed in rooms with fuel-burning appliances (if applicable) and in sleeping areas. Mount them at head height on a wall or on a shelf, at least 1 metre away from the appliance. Your landlord is responsible for ensuring CO detectors are provided where required. Contact us if you believe your property needs additional detectors." },
    ],
  },

  /* ── NEW: Fire doors ── */
  "fire-doors": {
    id: "fire-doors",
    question: "What is the concern with the fire door?",
    options: [
      { label: "Door closer not working — door doesn't close on its own", nextId: null, answer: "Fire doors must close fully on their own to provide protection. If the door closer is broken, stiff, or the door sticks, do not prop the door open. Contact us to arrange a repair. Propping a fire door open (unless it has an approved hold-open device linked to the fire alarm) is a safety risk." },
      { label: "Door seals are damaged or missing", nextId: null, answer: "Fire doors rely on intumescent strips and smoke seals around the frame to prevent the spread of fire and smoke. If these seals are damaged, peeling, or missing, contact us to arrange a replacement. The door may not provide adequate protection without intact seals." },
      { label: "Fire door is damaged (holes, warping, broken glass)", nextId: null, answer: "A fire door with holes, significant warping, or broken glazing may not provide the rated fire resistance. Do not attempt to repair it yourself. Contact us to arrange an inspection and replacement if necessary.", urgent: true },
      { label: "General fire door query", nextId: null, answer: "Fire doors are a key part of fire safety in multi-occupancy properties. They should close fully on their own, have intact seals, and not be propped open. If you have concerns about any fire door in your property, contact us and we can arrange an inspection." },
    ],
  },

  /* ── NEW: Compliance certificates ── */
  "fire-compliance": {
    id: "fire-compliance",
    question: "What would you like to know about compliance certificates?",
    options: [
      { label: "When is my EICR (electrical inspection) due?", nextId: null, answer: "An Electrical Installation Condition Report (EICR) is typically required every 5 years for rented properties, or as recommended by the previous report. Your landlord is responsible for ensuring the inspection is carried out and providing you with a copy. Contact us if you would like to check when your next inspection is due or to request a copy of your current report." },
      { label: "I'd like a copy of my EICR or fire alarm certificate", nextId: null, answer: "You are entitled to request copies of safety certificates for your property. Contact us using the 'Request Callback' button below and we will arrange for copies to be sent to you." },
      { label: "I'm not sure my fire alarm system has been tested recently", nextId: null, answer: "Fire alarm systems in rented and commercial properties should be regularly maintained and tested in line with guidance such as BS 5839. Your landlord or managing agent is responsible for arranging these tests. If you are unsure whether your system has been serviced recently, contact us and we can check the records for your property." },
      { label: "General compliance question", nextId: null, answer: "We can help with questions about electrical safety, fire alarm compliance, and emergency lighting. Contact us using the 'Request Callback' button and provide as much detail as you can so we can assist you quickly." },
    ],
  },

  /* ── Heating branch (electric heaters only) ── */
  "heating-1": {
    id: "heating-1",
    question: "What type of electric heater do you have?",
    options: [
      { label: "Storage heaters", nextId: "heating-storage" },
      { label: "Panel heaters / convectors", nextId: "heating-panel" },
      { label: "Infrared / radiant panel heaters", nextId: "heating-infrared" },
      { label: "Fan heaters (portable or wall-mounted)", nextId: "heating-fan" },
      { label: "Underfloor heating (electric)", nextId: null, answer: "Check your thermostat settings and that the timer is programmed correctly. If the system is unresponsive, the heating element or thermostat may have failed. Contact us to arrange an inspection." },
      { label: "Not sure / other electric heater", nextId: null, answer: "Contact us and describe the heater and the issue. We'll help identify the problem and arrange a visit if needed." },
    ],
  },
  "heating-storage": {
    id: "heating-storage",
    question: "What is the issue with your storage heater?",
    options: [
      { label: "Not warm in the morning", nextId: null, answer: "Storage heaters charge overnight using an off-peak electricity tariff (such as Economy 7 or Economy 10). Check that the INPUT dial is turned up — this controls how much heat is stored overnight. Also check your off-peak supply is active — your meter should show a separate off-peak reading. If your tariff has specific off-peak hours (Economy 7 typically runs midnight to 7am; Economy 10 offers additional afternoon hours), make sure the heater's charging period aligns with your tariff. If settings look correct and the heater is still cold, contact us." },
      { label: "Runs out of heat too early", nextId: null, answer: "Turn the INPUT dial higher so the heater stores more heat overnight. Turn the OUTPUT/BOOST dial lower so heat is released more slowly during the day. If you are on an Economy 10 tariff, you may have an afternoon boost period — check with your energy supplier. If the heater still runs out of heat too quickly, the storage bricks or elements may be degrading. Contact us for an assessment." },
      { label: "Not working at all", nextId: null, answer: "Check the circuit breaker for the heater circuit in your consumer unit. Also check any isolator switch near the heater is ON. If the breaker has tripped, try resetting it. If it trips again or the heater still does not work, contact us." },
      { label: "Making unusual noises (clicking, buzzing)", nextId: null, answer: "Light clicking when a storage heater is charging can be normal (thermal expansion). A persistent loud buzz may indicate a faulty element or contactor. If the noise is accompanied by a burning smell, turn the heater off at the isolator and contact us immediately.", urgent: false },
    ],
  },
  "heating-panel": {
    id: "heating-panel",
    question: "What is the issue with your panel heater?",
    options: [
      { label: "Heater not turning on", nextId: null, answer: "Check the heater's thermostat is set above the current room temperature and any timer is set to ON. Check the circuit breaker and any local isolator switch. If everything looks correct and the heater still does not respond, contact us." },
      { label: "Heater is on but not warming the room", nextId: null, answer: "Make sure the thermostat is set high enough and that the room is not excessively ventilated (open windows etc.). If the heater feels warm to the touch but is not effective, it may be undersized for the room. Contact us for advice." },
      { label: "Thermostat or timer not responding", nextId: "heating-timer" },
    ],
  },

  /* ── NEW: Timer / programmer troubleshooting ── */
  "heating-timer": {
    id: "heating-timer",
    question: "What is the thermostat or timer doing?",
    options: [
      { label: "Display is blank / no power to controls", nextId: null, answer: "Try turning the heater off at the wall for 30 seconds, then back on. If the display remains blank, check the circuit breaker. Some digital thermostats have a small backup battery — check the manual for your model. If the controls still have no power, the thermostat unit may need replacing. Contact us." },
      { label: "Timer shows wrong time or won't hold settings", nextId: null, answer: "After a power cut, some programmers lose their time settings and need reprogramming. Consult the heater's manual for instructions on setting the clock. If the timer will not hold settings or keeps resetting, the programmer may be faulty. Contact us to arrange a replacement." },
      { label: "Heater comes on at wrong times", nextId: null, answer: "Check the programmed schedule on the timer — it may have been accidentally changed or reset after a power cut. Also check that the timer is set to 'AUTO' mode (not 'ON' or 'OFF'). If the schedule looks correct but the heater still activates at the wrong times, the programmer may need replacing. Contact us." },
    ],
  },

  /* ── NEW: Infrared / radiant panel heaters ── */
  "heating-infrared": {
    id: "heating-infrared",
    question: "What is the issue with your infrared or radiant heater?",
    options: [
      { label: "Heater not turning on", nextId: null, answer: "Check the power supply: ensure the circuit breaker is on and any local isolator switch is in the ON position. Some infrared panels have a separate thermostat or remote controller — check these are set correctly and have working batteries if wireless. If the panel still does not turn on, contact us." },
      { label: "Heater is on but room doesn't feel warm", nextId: null, answer: "Infrared heaters warm objects and people directly rather than the air, so they feel different to convection heaters. Stand or sit within the heater's line of sight to feel the radiant heat. If you cannot feel any warmth at all when standing near the panel, the heating element may have failed. Contact us." },
      { label: "Heater surface is cracked or damaged", nextId: null, answer: "Do not use an infrared panel that is visibly cracked or damaged, as this may expose electrical components. Turn it off at the isolator and contact us to arrange a replacement.", urgent: true },
    ],
  },

  /* ── NEW: Fan heaters ── */
  "heating-fan": {
    id: "heating-fan",
    question: "What is the issue with your fan heater?",
    options: [
      { label: "Fan runs but no heat", nextId: null, answer: "The heating element may have failed while the fan motor still works. Check that the heater is set to a 'heat' mode (not just 'fan' or 'cool'). If it is set correctly and still blows cold air, the element needs replacing. Contact us if this is a fixed wall-mounted unit." },
      { label: "Heater makes a burning smell", nextId: null, answer: "A brief smell when first used after a long period can be normal (dust burning off). If the smell persists, is strong, or is accompanied by smoke, turn the heater off immediately and unplug it. Do not use it again until it has been inspected. Contact us if it is a fixed installation.", urgent: true },
      { label: "Heater keeps cutting out", nextId: null, answer: "Fan heaters have an overheat safety cut-out. If it keeps cutting out, ensure nothing is blocking the air intake or outlet, and that the heater is not placed too close to furniture or curtains. Never cover an electric heater. If airflow is clear and it still cuts out, the thermostat or cut-out may be faulty. Contact us." },
      { label: "General heater safety question", nextId: null, answer: "Never cover any electric heater or place items on top of it. Keep heaters clear of curtains, furniture and bedding. Do not use extension leads for high-powered heaters — plug directly into a wall socket. If you have any concerns about the safety of a heater in your property, contact us." },
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
