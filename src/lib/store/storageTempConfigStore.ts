import { type Period } from "../util/iec.62552.3.ss2.util";
import { type Writable, writable } from "svelte/store";
export interface StorageTemperatureConfig {
  periodS: Period;
  periodE: Period;
}
export const storageTempConfigStore: Writable<StorageTemperatureConfig> = writable({
  periodS: {
    start: 0,
    end: 0,
  },
  periodE: {
    start: 0,
    end: 0
  }
});
