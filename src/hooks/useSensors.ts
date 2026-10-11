import { useEffect, useState } from "react";
import { getApiBase, subscribeApiBase } from "@/lib/data-api";

export interface SensorValue {
  value?: number;
  text?: string;
  unit: string;
  min?: number;
  max?: number;
  avg?: number;
  /** Human-readable display name (e.g. "CPU Package Temp") */
  name?: string;
  source?: string;
}

export interface SensorSnapshot {
  timestamp: number;
  sensors: Record<string, SensorValue>;
}

export function useSensors() {
  const [data, setData] = useState<SensorSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  // The Data API URL is a dashboard setting; follow it when it changes.
  const [base, setBase] = useState(getApiBase);
  useEffect(() => subscribeApiBase(setBase), []);

  useEffect(() => {
    const es = new EventSource(`${base}/events`);

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data) as SensorSnapshot;
        setData(snapshot);
        setConnected(true);
      } catch (err) {
        console.error("Failed to parse sensor data", err);
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => es.close();
  }, [base]);

  return { data, connected };
}
