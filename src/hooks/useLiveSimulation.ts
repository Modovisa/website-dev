// src/hooks/useLiveSimulation.ts
import { useEffect, useState } from "react";
import {
  subscribeLiveSimulation,
  getLiveSimulationState,
  setSelectedVisitor,
  type LiveSimVisitor,
} from "@/services/liveSimulation.store";

export function useLiveSimulation() {
  const [snap, setSnap] = useState(getLiveSimulationState);

  useEffect(() => {
    return subscribeLiveSimulation(setSnap);
  }, []);

  const selectedVisitor: LiveSimVisitor | null =
    snap.visitors.find((v) => v.id === snap.selectedId) ||
    snap.visitors[0] ||
    null;

  return {
    visitors: snap.visitors,
    selectedVisitor,
    selectedId: snap.selectedId,
    selectVisitor: (id: string | null) => setSelectedVisitor(id),
  };
}
