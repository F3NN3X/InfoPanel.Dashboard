import { useEffect, useState } from "react";

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

export const API_BASE = "http://127.0.0.1:3921";

export function useSensors() {
  const [data, setData] = useState<SensorSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/events`);

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
  }, []);

  return { data, connected };
}
