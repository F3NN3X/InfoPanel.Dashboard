import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DualProgressCardProps {
  title: string;
  leftLabel: string;
  leftValue?: number;
  leftUnit?: string;
  rightLabel: string;
  rightValue?: number;
  rightUnit?: string;
  max?: number;
  className?: string;
}

export function DualProgressCard({
  title,
  leftLabel,
  leftValue,
  leftUnit = "%",
  rightLabel,
  rightValue,
  rightUnit = "%",
  max = 100,
  className,
}: DualProgressCardProps) {
  const leftProgress =
    leftValue !== undefined ? Math.min(100, (leftValue / max) * 100) : 0;
  const rightProgress =
    rightValue !== undefined ? Math.min(100, (rightValue / max) * 100) : 0;

  return (
    <Card className={cn("bg-zinc-950/80 border-zinc-800", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-xs text-zinc-500">{leftLabel}</span>
            <span className="text-lg font-semibold tabular-nums">
              {leftValue !== undefined
                ? `${leftValue.toFixed(1)}${leftUnit}`
                : "—"}
            </span>
          </div>
          <Progress value={leftProgress} className="h-2" />
        </div>
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-xs text-zinc-500">{rightLabel}</span>
            <span className="text-lg font-semibold tabular-nums">
              {rightValue !== undefined
                ? `${rightValue.toFixed(1)}${rightUnit}`
                : "—"}
            </span>
          </div>
          <Progress value={rightProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
