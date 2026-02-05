import type { RamsContent } from "./ramsSchema";

type RamsTemplate = Omit<RamsContent, "projectName" | "projectAddress" | "clientName" | "startDate" | "endDate">;

export const RAMS_TEMPLATES: Record<string, { name: string; description: string; content: RamsTemplate }> = {
  "electrical-installation": {
    name: "Electrical Installation",
    description: "Standard RAMS for electrical installation work including first and second fix",
    content: {
      scopeOfWork:
        "Electrical installation works including containment, cable installation, termination, and testing in accordance with BS 7671.",
      hazards: [
        { hazard: "Electric shock from live conductors", risk: "high", persons: "Electricians, other trades", controls: "Isolation and lock-off procedures. Prove dead with approved voltage indicator (GS38). Permit to work system for live working.", residualRisk: "low" },
        { hazard: "Arc flash / short circuit", risk: "high", persons: "Electricians", controls: "De-energise before work. Use appropriate PPE (arc-rated if live work unavoidable). Maintain safe distances from live parts.", residualRisk: "low" },
        { hazard: "Working at height — ladder/scaffold use", risk: "medium", persons: "Electricians", controls: "Use tower scaffolds or podium steps where possible. Ladders only for short-duration access. Inspect equipment before use.", residualRisk: "low" },
        { hazard: "Manual handling — cable drums, containment", risk: "medium", persons: "Electricians, labourers", controls: "Use mechanical aids (drum stands, trolleys). Team lifts for heavy items. Assess loads before lifting.", residualRisk: "low" },
        { hazard: "Dust and debris from drilling/chasing", risk: "medium", persons: "All site personnel", controls: "Use dust extraction on tools. RPE (FFP3 mask) when drilling masonry. Dampen area to suppress dust.", residualRisk: "low" },
        { hazard: "Fire risk from hot works (soldering, brazing)", risk: "medium", persons: "All site personnel", controls: "Hot works permit. Fire extinguisher on hand. Fire watch for 60 minutes after completion.", residualRisk: "low" },
        { hazard: "Slips, trips and falls", risk: "medium", persons: "All site personnel", controls: "Keep work areas tidy. Route cables safely. Adequate lighting in work areas.", residualRisk: "low" },
      ],
      methodStatements: [
        { step: 1, description: "Site induction and review of existing drawings. Confirm isolation points and distribution board locations.", responsible: "Project Lead", ppe: "Hard Hat, Safety Boots, Hi-Vis Vest" },
        { step: 2, description: "Install containment (trunking, tray, conduit) as per layout drawings. Fix securely at specified centres.", responsible: "Electrician", ppe: "Hard Hat, Safety Boots, Hi-Vis Vest, Gloves, Eye Protection" },
        { step: 3, description: "Draw in cables. Label all cables at both ends. Ensure correct bending radii are maintained.", responsible: "Electrician", ppe: "Hard Hat, Safety Boots, Hi-Vis Vest, Gloves" },
        { step: 4, description: "Terminate cables at distribution boards and final circuits. Torque-tighten all connections to manufacturer specifications.", responsible: "Electrician", ppe: "Safety Boots, Insulated Gloves, Eye Protection" },
        { step: 5, description: "Carry out initial verification testing in accordance with BS 7671 Chapter 6. Record results on appropriate schedule.", responsible: "Qualified Electrician", ppe: "Safety Boots, Insulated Gloves" },
        { step: 6, description: "Issue Electrical Installation Certificate (EIC) and operation & maintenance manuals. Brief client on installation.", responsible: "Project Lead", ppe: "Safety Boots" },
      ],
      emergencyProcedures:
        "In case of electric shock: do NOT touch the casualty. Isolate the supply immediately using the nearest isolation point. Call 999. Administer first aid / CPR if trained. Report all incidents to the site manager and complete an accident report form. Fire: raise the alarm, evacuate via nearest exit, assemble at the designated muster point. Do not re-enter the building.",
      ppeRequired: ["Hard Hat", "Safety Boots", "Hi-Vis Vest", "Gloves", "Eye Protection", "Insulated Gloves"],
      toolsAndEquipment: [
        "Approved voltage indicator (GS38 compliant)", "Proving unit", "Multifunction tester (calibrated)",
        "Insulation resistance tester", "RCD tester", "Cable rods and draw wire",
        "SDS drill with dust extraction", "Torque screwdriver", "Cable cutters and strippers",
        "Crimping tools", "Lock-off kit (MCB locks, padlocks, tags)",
      ],
      permits: ["Isolation"],
    },
  },

  "emergency-lighting-testing": {
    name: "Emergency Lighting Testing",
    description: "RAMS for periodic testing of emergency lighting systems to BS 5266",
    content: {
      scopeOfWork:
        "Periodic inspection and testing of emergency lighting installation in accordance with BS 5266-1. Includes monthly functional tests and annual full-duration discharge tests.",
      hazards: [
        { hazard: "Electric shock from luminaire internals", risk: "medium", persons: "Electricians", controls: "Isolate circuits before opening luminaires. Prove dead. Use insulated tools.", residualRisk: "low" },
        { hazard: "Working at height — accessing high-level luminaires", risk: "medium", persons: "Electricians", controls: "Use podium steps or MEWP for high-level access. Ladders only up to 3m for short tasks. Ground spotter required.", residualRisk: "low" },
        { hazard: "Battery acid exposure", risk: "low", persons: "Electricians", controls: "Wear gloves and eye protection when handling batteries. Dispose of old batteries through approved waste carrier.", residualRisk: "low" },
        { hazard: "Disruption to occupied building — reduced lighting during test", risk: "low", persons: "Building occupants", controls: "Notify building management 48 hours before testing. Test during low-occupancy periods where possible. Post signage.", residualRisk: "low" },
      ],
      methodStatements: [
        { step: 1, description: "Review previous test records and as-built drawings. Identify all emergency luminaires, exit signs, and central battery systems.", responsible: "Lead Tester", ppe: "Safety Boots, Hi-Vis Vest" },
        { step: 2, description: "Notify building management. Carry out visual inspection of all luminaires for damage, obstruction, or missing diffusers.", responsible: "Electrician", ppe: "Safety Boots, Hi-Vis Vest" },
        { step: 3, description: "Simulate mains failure at the distribution board. Verify all emergency luminaires illuminate within 5 seconds.", responsible: "Electrician", ppe: "Safety Boots, Insulated Gloves" },
        { step: 4, description: "For annual test: maintain discharge for full rated duration (typically 3 hours). Record performance of each luminaire.", responsible: "Electrician", ppe: "Safety Boots" },
        { step: 5, description: "Restore mains supply. Verify all luminaires return to charge mode. Complete test certificate and logbook entry.", responsible: "Lead Tester", ppe: "Safety Boots" },
      ],
      emergencyProcedures:
        "In case of electric shock: isolate supply immediately, call 999, administer first aid if trained. If a luminaire fails to illuminate during a test in an occupied building, temporarily replace with portable emergency lighting until repaired. Report all incidents to building management.",
      ppeRequired: ["Safety Boots", "Hi-Vis Vest", "Gloves", "Eye Protection", "Insulated Gloves"],
      toolsAndEquipment: [
        "Approved voltage indicator (GS38 compliant)", "Proving unit", "Lux meter",
        "Digital camera for photographic records", "Podium steps / MEWP",
        "Emergency lighting test key/switch", "Replacement batteries (common types)", "Replacement lamps/LEDs",
      ],
      permits: [],
    },
  },

  "general-maintenance": {
    name: "General Electrical Maintenance",
    description: "Basic RAMS template for routine electrical maintenance and minor works",
    content: {
      scopeOfWork:
        "General electrical maintenance including fault finding, replacement of accessories, minor alterations, and distribution board maintenance.",
      hazards: [
        { hazard: "Electric shock", risk: "high", persons: "Electricians", controls: "Isolate supply and lock off. Prove dead before work. Follow safe isolation procedure.", residualRisk: "low" },
        { hazard: "Working at height", risk: "medium", persons: "Electricians", controls: "Use appropriate access equipment. Inspect before use. Three points of contact on ladders.", residualRisk: "low" },
        { hazard: "Manual handling", risk: "low", persons: "Electricians", controls: "Assess load before lifting. Use mechanical aids where available.", residualRisk: "low" },
        { hazard: "Slips, trips and falls", risk: "low", persons: "All personnel", controls: "Good housekeeping. Adequate lighting. Clear access routes.", residualRisk: "low" },
        { hazard: "Asbestos-containing materials", risk: "high", persons: "All personnel", controls: "Check asbestos register before any intrusive work. Stop work immediately if suspect materials found. Do not disturb.", residualRisk: "low" },
      ],
      methodStatements: [
        { step: 1, description: "Arrive on site. Sign in and review site-specific rules. Confirm scope of work with client/site contact.", responsible: "Electrician", ppe: "Safety Boots, Hi-Vis Vest" },
        { step: 2, description: "Identify and confirm isolation points. Carry out safe isolation procedure. Apply lock-off devices and warning notices.", responsible: "Electrician", ppe: "Safety Boots, Insulated Gloves" },
        { step: 3, description: "Carry out maintenance / repair work as required. Replace faulty components like-for-like or to current standard.", responsible: "Electrician", ppe: "Safety Boots, Gloves, Eye Protection" },
        { step: 4, description: "Test completed work. Carry out appropriate verification tests per BS 7671. Record results.", responsible: "Electrician", ppe: "Safety Boots, Insulated Gloves" },
        { step: 5, description: "Reinstate, clean work area. Issue Minor Electrical Installation Works Certificate if applicable. Brief client.", responsible: "Electrician", ppe: "Safety Boots" },
      ],
      emergencyProcedures:
        "Electric shock: isolate supply, call 999, first aid if trained. Fire: raise alarm, evacuate, call 999. Injury: administer first aid, call 999 if serious. All incidents must be reported to the office and recorded on an accident form.",
      ppeRequired: ["Safety Boots", "Hi-Vis Vest", "Gloves", "Eye Protection", "Insulated Gloves"],
      toolsAndEquipment: [
        "Approved voltage indicator (GS38 compliant)", "Proving unit", "Multifunction tester",
        "Lock-off kit", "Hand tools (insulated screwdrivers, pliers, etc.)", "Torch / head lamp",
      ],
      permits: ["Isolation"],
    },
  },
};
