import { useSensors } from "@/hooks/useSensors";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { modules, claimedKeys } from "@/modules";
import { GenericCard } from "@/modules/fallback";

function App() {
  const { data, connected } = useSensors();
  const sensors = data?.sensors ?? {};

  // Keys claimed by a registered module; everything else falls back to the
  // generic "other sensors" grid.
  const claimed = claimedKeys(sensors);
  const unclaimed = Object.entries(sensors).filter(
    ([key]) => !claimed.has(key)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            System Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Live data from InfoPanel DataBridge
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={connected ? "default" : "destructive"}
            className="gap-1.5"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            {connected ? "Connected" : "Disconnected"}
          </Badge>

          {data && (
            <span className="text-xs text-zinc-500">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <Separator className="mb-8 bg-zinc-800" />

      {/* Registered modules — each plugin/source renders its own section */}
      {modules.map((module) => {
        const content = module.render(sensors);
        if (!content) return null;
        const count = Object.keys(sensors).filter((key) =>
          module.matches(key)
        ).length;

        return (
          <section key={module.id} id={module.id} className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-medium text-zinc-300">
                {module.title}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </div>
            {content}
          </section>
        );
      })}

      {/* Unclaimed sensors — new plugins appear here automatically */}
      {unclaimed.length > 0 && (
        <section id="other-sensors">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-medium text-zinc-300">
              Other sensors
            </h2>
            <Badge variant="secondary" className="text-xs">
              {unclaimed.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {unclaimed.map(([key, sensor]) => (
              <GenericCard key={key} sensorKey={key} sensor={sensor} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
