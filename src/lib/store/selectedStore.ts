import { TemperatureIndex } from "$lib/util/iec.62552.3.util";
import { writable, type Writable } from "svelte/store";

export type { AnalyzeConfig  };

export interface TempVolume {
  temp: number[];
  volume: number;
}

interface AnalyzeConfig {
  name: string;
  targetAmbient: number;
  evaluateUnfrozen: TemperatureIndex;
  evaluateFrozen: TemperatureIndex;
  xAxis: number;
  integPower: number;
  power: number;
  ambient: number[];
  freshFood: TempVolume;
  cellar: TempVolume;
  pantry: TempVolume;
  wineStorage: TempVolume;
  chill: TempVolume;
  frozenZeroStar: TempVolume;
  frozenOneStar: TempVolume;
  frozenTwoStar: TempVolume;
  frozenThreeStar: TempVolume;
  frozenFourStar: TempVolume;
}

export const selectedStore: Writable<AnalyzeConfig> = writable({
  name: '',
  targetAmbient: 32,
  evaluateUnfrozen: TemperatureIndex.FRESH_FOOD,
  evaluateFrozen: TemperatureIndex.FROZEN_3_STAR,
  xAxis: 1,
  power: 6,
  integPower: 7,
  ambient: [],
  freshFood: { temp: [], volume: 0 },
  cellar: { temp: [], volume: 0 },
  pantry: { temp: [], volume: 0 },
  wineStorage: { temp: [], volume: 0 },
  chill: { temp: [], volume: 0 },
  frozenZeroStar: { temp: [], volume: 0 },
  frozenOneStar: { temp: [], volume: 0 },
  frozenTwoStar: { temp: [], volume: 0 },
  frozenThreeStar: { temp: [], volume: 0 },
  frozenFourStar: { temp: [], volume: 0 },
});

export function isValidTV(tv: TempVolume) {
  return tv.temp.length > 0 && tv.volume > 0;
}

export function isTwoComaprtment(config: AnalyzeConfig) {
  let count: number = 0;
  if (isValidTV(config.freshFood)) {
    count++;
  }
  if (isValidTV(config.cellar)) {
    count++;
  }
  if (isValidTV(config.pantry)) {
    count++;
  }
  if (isValidTV(config.wineStorage)) {
    count++;
  }
  if (isValidTV(config.chill)) {
    count++;
  }
  if (isValidTV(config.frozenZeroStar)) {
    count++;
  }
  if (isValidTV(config.frozenOneStar)) {
    count++;
  }
  if (isValidTV(config.frozenTwoStar)) {
    count++;
  }
  if (isValidTV(config.frozenThreeStar)) {
    count++;
  }
  if (isValidTV(config.frozenFourStar)) {
    count++;
  }
  return count > 1;
}
