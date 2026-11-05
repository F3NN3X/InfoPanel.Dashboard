import { useState, type ComponentType, type ReactNode } from "react";
import { Plus, Sun, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SensorRow } from "@/components/ui/sensor-row";
import { InheritDot, SettingRow } from "@/components/ui/setting-row";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { useToast } from "@/components/ui/toast";

/** The gallery's sections for the redesign's primitives. */
export default function Foundation({ Section }: { Section: ComponentType<{ title: string; children: ReactNode }> }) {
  const toast = useToast();
  const [tab, setTab] = useState("rules");
  return (
    <>
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={<Plus />}>New screen</Button>
          <Button>Import</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete</Button>
          <Button small>Small</Button>
        </div>
      </Section>
      <Section title="Tabs">
        <Tabs label="Example" value={tab} onChange={setTab} tabs={[{ value: "rules", label: "Rules" }, { value: "island", label: "Island" }, { value: "history", label: "History" }]} />
      </Section>
      <Section title="Field, tag">
        <Field aria-label="Name" defaultValue="Perf heavy" className="w-full" />
        <Field aria-label="Address" mono defaultValue="http://127.0.0.1:3921" className="w-full" />
        <div className="flex gap-1">
          <Tag selected>All</Tag>
          <Tag>Numbers</Tag>
        </div>
      </Section>
      <Section title="Status chip">
        <div className="flex flex-wrap gap-1.5">
          <StatusChip tone="ok">Live on 1 display</StatusChip>
          <StatusChip tone="warn">Reconnecting</StatusChip>
          <StatusChip tone="danger">Offline</StatusChip>
          <StatusChip tone="neutral" dot={false}>Test</StatusChip>
        </div>
      </Section>
      <Section title="Setting row">
        <SettingRow label="Corners" dot={<InheritDot from="Perf heavy" />}>10 px</SettingRow>
        <SettingRow label="Density" dot={<InheritDot from="Perf heavy" set onReset={() => toast("Reset")} />}>Compact</SettingRow>
      </Section>
      <Section title="Sensor row">
        <SensorRow icon={<Zap />} name="CPU Load" sensorKey="system.cpu.load" samples={[31, 44, 38, 52, 47, 68]} value="68.4" unit="%" />
        <SensorRow icon={<Sun />} name="Package Temp" sensorKey="hwinfo.cpu_package_temp" samples={[58, 61, 60, 63, 67, 64]} value="67.5" unit="°C" selected />
      </Section>
    </>
  );
}
