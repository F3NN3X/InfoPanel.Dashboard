import type { ReactNode } from "react";
import { DualProgressCard } from "@/components/DualProgressCard";
import { SensorCard } from "@/components/SensorCard";
import { HardDrive, Wifi } from "lucide-react";
import {
  effectiveSettings,
  type DashboardModule,
} from "./types";

/**
 * System module — the bridge's own collectors (CPU, RAM, bridge status).
 */
export const systemModule: DashboardModule = {
  id: "system",
  title: "System",
  minCols: 4,
  minRows: 2,
  matches: (key) => key.startsWith("system."),
  settings: [
    { key: "showLoad", label: "System load card", type: "boolean", default: true },
    { key: "showRam", label: "RAM usage card", type: "boolean", default: true },
    { key: "showStatus", label: "Bridge status card", type: "boolean", default: true },
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(systemModule, s);
    const cpu = sensors["system.cpu.load"];
    const ram = sensors["system.ram.load"];
    const status = sensors["system.bridge.status"];

    if (!cpu && !ram) return null;

    const cards: ReactNode[] = [];
    if (cfg.showLoad) {
      cards.push(
        <DualProgressCard
          key="load"
          title="System Load"
          leftLabel="CPU"
          leftValue={cpu?.value}
          rightLabel="RAM"
          rightValue={ram?.value}
        />
      );
    }
    if (cfg.showRam) {
      cards.push(
        <SensorCard
          key="ram"
          title="RAM Usage"
          value={ram?.value}
          unit="%"
          icon={<HardDrive className="h-4 w-4" />}
        />
      );
    }
    if (cfg.showStatus) {
      cards.push(
        <SensorCard
          key="status"
          title="Bridge Status"
          text={status?.text}
          icon={<Wifi className="h-4 w-4" />}
        />
      );
    }
    if (cards.length === 0) return null;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards}
      </div>
    );
  },
};
