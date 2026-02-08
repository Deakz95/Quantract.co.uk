// ── Circuit presets for quick-add from visual view ──

import {
  Lightbulb,
  Circle,
  CookingPot,
  Droplets,
  Flame,
  Bell,
  GitBranch,
  Plug,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BoardCircuit } from "@quantract/shared/certificate-types";

export interface CircuitPreset {
  id: string;
  label: string;
  icon: LucideIcon;
  defaults: Partial<BoardCircuit>;
}

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  {
    id: "lighting",
    label: "Lighting",
    icon: Lightbulb,
    defaults: {
      description: "Lighting",
      ocpdType: "B",
      ocpdRating: "6",
      liveCsa: "1.5",
      cpcCsa: "1.0",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "ring-final",
    label: "Ring Final",
    icon: Circle,
    defaults: {
      description: "Ring Final",
      ocpdType: "B",
      ocpdRating: "32",
      liveCsa: "2.5",
      cpcCsa: "1.5",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "cooker",
    label: "Cooker",
    icon: CookingPot,
    defaults: {
      description: "Cooker",
      ocpdType: "B",
      ocpdRating: "32",
      liveCsa: "6.0",
      cpcCsa: "2.5",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "shower",
    label: "Shower",
    icon: Droplets,
    defaults: {
      description: "Shower",
      ocpdType: "B",
      ocpdRating: "40",
      liveCsa: "10.0",
      cpcCsa: "4.0",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "immersion",
    label: "Immersion",
    icon: Flame,
    defaults: {
      description: "Immersion Heater",
      ocpdType: "B",
      ocpdRating: "16",
      liveCsa: "2.5",
      cpcCsa: "1.5",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "smoke-co",
    label: "Smoke/CO",
    icon: Bell,
    defaults: {
      description: "Smoke/CO Alarms",
      ocpdType: "B",
      ocpdRating: "6",
      liveCsa: "1.5",
      cpcCsa: "1.0",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "spur",
    label: "Spur",
    icon: GitBranch,
    defaults: {
      description: "Fused Spur",
      ocpdType: "B",
      ocpdRating: "16",
      liveCsa: "2.5",
      cpcCsa: "1.5",
      typeOfWiring: "T+E",
    },
  },
  {
    id: "ev-charger",
    label: "EV Charger",
    icon: Plug,
    defaults: {
      description: "EV Charger",
      ocpdType: "B",
      ocpdRating: "32",
      liveCsa: "6.0",
      cpcCsa: "4.0",
      typeOfWiring: "SWA",
      rcdType: "A",
      rcdRatedCurrent: "30",
    },
  },
  {
    id: "custom",
    label: "Custom",
    icon: Plus,
    defaults: {},
  },
];
