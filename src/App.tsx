import { useSensors } from "@/hooks/useSensors";
import { SensorCard } from "@/components/SensorCard";
import { DualProgressCard } from "@/components/DualProgressCard";
import { NowPlayingCard } from "@/components/NowPlayingCard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Cpu, HardDrive, Thermometer, Wifi } from "lucide-react";

function App() {
  const { data, connected } = useSensors();
  const sensors = data?.sensors ?? {};

  const cpu = sensors["system.cpu.load"];
  const ram = sensors["system.ram.load"];
  const status = sensors["system.bridge.status"];

  // Spotify keys (once a plugin pushes them)
  const track = sensors["spotify.track"]?.text;
  const artist = sensors["spotify.artist"]?.text;
  const album = sensors["spotify.album"]?.text;
  const art = sensors["spotify.art"]?.text;
  const progress = sensors["spotify.progress"]?.value ?? 0;
  const isPlaying = sensors["spotify.playing"]?.value === 2;

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

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DualProgressCard
          title="System Load"
          leftLabel="CPU"
          leftValue={cpu?.value}
          rightLabel="RAM"
          rightValue={ram?.value}
        />

        <SensorCard
          title="Bridge Status"
          text={status?.text ?? "—"}
          icon={<Activity className="h-4 w-4" />}
        />

        <NowPlayingCard
          track={track}
          artist={artist}
          album={album}
          isPlaying={isPlaying}
          progress={progress}
          albumArtUrl={art}
          className="md:col-span-2 xl:col-span-1"
        />
      </div>

      {/* Placeholder section */}
      <div className="mt-10">
        <h2 className="text-lg font-medium mb-4 text-zinc-300">
          More sensors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60">
          <SensorCard
            title="GPU Load"
            text="Push from plugin"
            icon={<Cpu className="h-4 w-4" />}
          />
          <SensorCard
            title="Network"
            text="Push from plugin"
            icon={<Wifi className="h-4 w-4" />}
          />
          <SensorCard
            title="Storage"
            text="Push from plugin"
            icon={<HardDrive className="h-4 w-4" />}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
