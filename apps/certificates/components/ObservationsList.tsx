"use client";

import { ObservationBuilder, type Observation } from "./ui/ObservationBuilder";

interface ObservationsListProps {
  observations: Observation[];
  onChange: (observations: Observation[]) => void;
}

export function ObservationsList({ observations, onChange }: ObservationsListProps) {
  return <ObservationBuilder observations={observations} onChange={onChange} />;
}

export type { Observation, ObservationsListProps };
