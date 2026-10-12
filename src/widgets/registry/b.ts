// Template widgets, group B: storage, network, info, generic (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule } from "@/modules/types";
import { SENSOR_GROUP_SETTINGS } from "@/modules/hardware-modern";
import { NETWORK_SETTINGS } from "@/modules/network-modern";
import { WEATHER_SETTINGS, weatherToProps } from "@/modules/weather-modern";
import { templateModule } from "../module";
import { pass } from "./settings-kit";
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

export const GROUP_B: DashboardModule[] = [
  templateModule({ meta: DriveSpace.meta, Component: DriveSpace.default, settings: [], toProps: pass<Partial<DriveSpace.DriveSpaceProps>>("drive", "warn", "crit", "sort", "neutral") }),
  templateModule({ meta: StorageHealth.meta, Component: StorageHealth.default, settings: [], toProps: pass<Partial<StorageHealth.StorageHealthProps>>("disk") }),
  templateModule({ meta: DiskIO.meta, Component: DiskIO.default, settings: [], toProps: () => ({}) }),
  templateModule({ meta: NetworkThroughput.meta, Component: NetworkThroughput.default, settings: NETWORK_SETTINGS, toProps: pass<Partial<NetworkThroughput.NetworkThroughputProps>>("adapter", "chart", "view", "showTotals", "sparkline", "downloadColor", "uploadColor") }),
  templateModule({ meta: NetworkAdapters.meta, Component: NetworkAdapters.default, settings: [], toProps: pass<Partial<NetworkAdapters.NetworkAdaptersProps>>("showDown", "showIpv6", "hideIp") }),
  templateModule({ meta: Clock.meta, Component: Clock.default, settings: [], toProps: pass<Partial<Clock.ClockProps>>("format", "showSeconds", "showDate", "face") }),
  templateModule({ meta: Calendar.meta, Component: Calendar.default, settings: [], toProps: pass<Partial<Calendar.CalendarProps>>("weekStart") }),
  templateModule({ meta: Weather.meta, Component: Weather.default, settings: WEATHER_SETTINGS, toProps: (s) => ({ ...pass<Partial<Weather.WeatherProps>>("provider", "location", "units")(s), ...weatherToProps(s) }) }),
  templateModule({ meta: Forecast.meta, Component: Forecast.default, settings: [], toProps: pass<Partial<Forecast.ForecastProps>>("location", "days", "units") }),
  templateModule({ meta: SensorValue.meta, Component: SensorValue.default, settings: [], toProps: pass<Partial<SensorValue.SensorValueProps>>("sensor", "label", "display", "min", "max", "warn", "crit", "decimals", "unit") }),
  templateModule({ meta: SensorGroup.meta, Component: SensorGroup.default, settings: SENSOR_GROUP_SETTINGS, toProps: pass<Partial<SensorGroup.SensorGroupProps>>("sensors", "layout", "bars", "auto", "maxRows", "tempColor", "fanColor", "powerColor") }),
];
