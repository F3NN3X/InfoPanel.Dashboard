// Template widgets, group B: storage, network, info, generic (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import * as DriveSpace from "../DriveSpace";
import * as StorageHealth from "../StorageHealth";
import * as DiskIO from "../DiskIO";
import * as NetworkThroughput from "../NetworkThroughput";
import * as NetworkAdapters from "../NetworkAdapters";
import * as Clock from "../Clock";
import * as Calendar from "../Calendar";
import * as Weather from "../Weather";
import * as Forecast from "../Forecast";
import * as SensorValue from "../SensorValue";
import * as SensorGroup from "../SensorGroup";

/** The stored settings whose key equals a widget prop name, passed straight through (unset / empty = the widget's default). */
const pass =
  <P extends object>(...keys: (keyof P & string)[]) =>
  (s: ModuleSettings): P =>
    Object.fromEntries(keys.filter((k) => s[k] !== undefined && s[k] !== "").map((k) => [k, s[k]])) as P;

export const GROUP_B: DashboardModule[] = [
  templateModule({ meta: DriveSpace.meta, Component: DriveSpace.default, settings: [], toProps: pass<Partial<DriveSpace.DriveSpaceProps>>("drive", "warn", "crit", "sort", "neutral") }),
  templateModule({ meta: StorageHealth.meta, Component: StorageHealth.default, settings: [], toProps: pass<Partial<StorageHealth.StorageHealthProps>>("disk") }),
  templateModule({ meta: DiskIO.meta, Component: DiskIO.default, settings: [], toProps: () => ({}) }),
  templateModule({ meta: NetworkThroughput.meta, Component: NetworkThroughput.default, settings: [], toProps: pass<Partial<NetworkThroughput.NetworkThroughputProps>>("adapter", "chart") }),
  templateModule({ meta: NetworkAdapters.meta, Component: NetworkAdapters.default, settings: [], toProps: pass<Partial<NetworkAdapters.NetworkAdaptersProps>>("showDown", "showIpv6", "hideIp") }),
  templateModule({ meta: Clock.meta, Component: Clock.default, settings: [], toProps: pass<Partial<Clock.ClockProps>>("format", "showSeconds", "showDate", "face") }),
  templateModule({ meta: Calendar.meta, Component: Calendar.default, settings: [], toProps: pass<Partial<Calendar.CalendarProps>>("weekStart") }),
  templateModule({ meta: Weather.meta, Component: Weather.default, settings: [], toProps: pass<Partial<Weather.WeatherProps>>("provider", "location", "units") }),
  templateModule({ meta: Forecast.meta, Component: Forecast.default, settings: [], toProps: pass<Partial<Forecast.ForecastProps>>("location", "days", "units") }),
  templateModule({ meta: SensorValue.meta, Component: SensorValue.default, settings: [], toProps: pass<Partial<SensorValue.SensorValueProps>>("sensor", "label", "display", "min", "max", "warn", "crit", "decimals", "unit") }),
  templateModule({ meta: SensorGroup.meta, Component: SensorGroup.default, settings: [], toProps: pass<Partial<SensorGroup.SensorGroupProps>>("sensors", "layout", "bars") }),
];
