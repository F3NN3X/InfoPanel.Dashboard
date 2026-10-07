import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SensorCardProps {
  title: string;
  value?: number;
  text?: string;
  unit?: string;
  max?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function SensorCard({
  title,
  value,
  text,
  unit = "",
  max = 100,
  icon,
  className,
}: SensorCardProps) {
  const displayValue =
    text !== undefined
      ? text
      : value !== undefined
      ? `${value.toFixed(1)}${unit}`
      : "—";

  const progressValue =
    value !== undefined && max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <Card className={cn("bg-zinc-950/80 border-zinc-800", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        {icon && <div className="text-zinc-500">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-zinc-50">
          {displayValue}
        </div>
        {value !== undefined && (
          <div className="mt-3">
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
