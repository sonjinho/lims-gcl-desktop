// store.js
import { TemperatureIndex } from "$lib/util/iec.62552.3.util";
import { writable } from "svelte/store";

export class TempVolume {
  temp;
  volume;
}

export class AnaylzeConfig {
  targetAmbient = 32;
  evaluateUnfrozen = TemperatureIndex.FRESH_FOOD;
  evaluateFrozen = TemperatureIndex.FROZEN_3_STAR;
  xAxis = 1;
  power = 6;
  ambient = [];
  freshFood = new TempVolume();
  cellar = new TempVolume();
  pantry = new TempVolume();
  wineStorage = new TempVolume();
  chill = new TempVolume();
  frozenZeroStar = new TempVolume();
  frozenOneStar = new TempVolume();
  frozenTwoStar = new TempVolume();
  frozenThreeStar = new TempVolume();
  frozenFourStar = new TempVolume();
}
export const selectedStore = writable(new AnaylzeConfig());

