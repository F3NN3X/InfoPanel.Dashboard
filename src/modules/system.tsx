import { DualProgressCard } from "@/components/DualProgressCard";
import { SensorCard } from "@/components/SensorCard";
import { HardDrive, Wifi } from "lucide-react";
import type { DashboardModule } from "./types";

/**
 * System module — the bridge's own collectors (CPU, RAM, bridge status).
 */
export const systemModule: DashboardModule = {
  id: "system",
  title: "System",
  matches: (key) => key.startsWith("system."),
  render: (sensors) => {
    const cpu = sensors["system.cpu.load"];
    const ram = sensors["system.ram.load"];
    const status = sensors["system.bridge.status"];

    if (!cpu && !ram) return null;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DualProgressCard
          title="System Load"
          leftLabel="CPU"
          leftValue={cpu?.value}
          rightLabel="RAM"
          rightValue={ram?.value}
        />
        <SensorCard
          title="RAM Usage"
          value={ram?.value}
          unit="%"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <SensorCard
          title="Bridge Status"
          text={status?.text}
          icon={<Wifi className="h-4 w-4" />}
        />
      </div>
    );
  },
};
