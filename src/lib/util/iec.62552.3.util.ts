import { selectedStore, type AnalyzeConfig } from "$lib/store/selectedStore";
import { get } from "svelte/store";
import { type ExcelData } from "./excel.utils";
import { runSS1 } from "./iec.62552.3.ss1.util";
import { runSS2, SS2Result } from "./iec.62552.3.ss2.util";
import type { CycleData } from "./iec.util";

export enum TemperatureIndex {
  FRESH_FOOD = 0,
  CELLAR,
  PANTRY,
  WINE_STORAGE,
  CHILL,
  FROZEN_0_STAR,
  FROZEN_1_STAR,
  FROZEN_2_STAR,
  FROZEN_3_STAR,
  FROZEN_4_STAR,
}

export function IEC62552(
  excelData: ExcelData,
  startDate: Date,
  endDate: Date,
  numberOfTCC: number,
  ssType: number = 0
) {}

export default function IEC62552_ExportData(
  excelData: ExcelData,
  startDate: Date,
  endDate: Date,
  numberOfTCC: number
) {
  const rawData = excelData.slice(2);

  let config = get(selectedStore);
  console.log(config);
  const X_AXIS_INDEX = config.xAxis;
  const POWER_INDEX = config.power;

  let evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);
  let evaluateFrozenIndex = getEvaluateFrozenIndex(config);

  let dateTimeData = [];
  let powerData = [];

  for (let i = 0; i < rawData.length; i++) {
    dateTimeData.push(new Date(rawData[i][X_AXIS_INDEX] as string));
    powerData.push(rawData[i][POWER_INDEX] as number);
  }

  //@ts-ignore
  let cycleData = detectCycleData(dateTimeData, startDate, endDate, powerData);

  const exportData = runSS1(
    cycleData,
    dateTimeData,
    rawData,
    evaluateFrozenIndex,
    evaluateUnfrozenIndex,
    config,
    numberOfTCC
  );
  // exportToExcel(exportData);
  return exportData;
}

export function getCycleData(
  rawData: ExcelData,
  startDate: Date,
  endDate: Date,
  config: AnalyzeConfig
): CycleData[] {
  let dateTimeData = [];
  let powerData = [];

  for (let i = 0; i < rawData.length; i++) {
    //@ts-ignore
    dateTimeData.push(new Date(rawData[i][config.xAxis]));
    powerData.push(rawData[i][config.power] as number);
  }
  return detectCycleData(dateTimeData, startDate, endDate, powerData);
}

function detectCycleData(
  dateTimeData: Date[],
  startDate: Date,
  endDate: Date,
  powerData: number[]
) {
  const set = new Set();

  let cycleData = [];
  let count = 0;
  let threshold = powerData.reduce((p, c) => p + c, 0) / powerData.length;

  for (let i = 0; i < dateTimeData.length - 6; i++) {
    if (startDate.getTime() > dateTimeData[i].getTime()) {
      continue;
    }
    if (endDate.getTime() < dateTimeData[i].getTime()) {
      break;
    }
    const currentPower = Number(powerData[i]) || 0; // 숫자가 아닌 경우 0으로 처리
    const nextPower2 = Number(powerData[i + 5]) || 0; // i+2 값
    if (currentPower + threshold < nextPower2) {
      let maxIndex = findIndexWindow(powerData, i + 5, 5);
      if (set.has(maxIndex)) {
        continue;
      } else {
        set.add(maxIndex);
        cycleData.push({
          index: maxIndex,
          count: count++,
          dateTime: dateTimeData[maxIndex],
          max: -1,
        });
      }
    }
    // const comparePower1 = Number(powerData[i + 1]) || 0; // i+1 값
    // const comparePower2 = Number(powerData[i + 2]) || 0; // i+1 값
    // const comparePower3 = Number(powerData[i + 3]) || 0; // i+1 값
    // const comparePower4 = Number(powerData[i + 4]) || 0; // i+1 값

    // // 조건 1: powerData[i]와 powerData[i+1]의 차이가 5보다 작으면 스킵
    // if (currentPower > comparePower1 - 10) {
    //   continue; // 스킵
    // }

    // if (currentPower > comparePower2 - 10) {
    //   continue; // 스킵
    // }

    // if (currentPower > comparePower3 - 10) {
    //   continue; // 스킵
    // }

    // if (currentPower > comparePower4 - 10) {
    //   continue; // 스킵
    // }

    // // if (currentPower > 3) {
    // //   continue;
    // // }

    // if (currentPower < nextPower2 - threshold) {
    //   // cycle
    //   if (
    //     set.has(i - 1) ||
    //     set.has(i - 2) ||
    //     set.has(i - 3) ||
    //     set.has(i - 4) ||
    //     set.has(i - 5)
    //   ) {
    //     continue;
    //   }
    //   set.add(i);
    //   cycleData.push({
    //     index: i,
    //     count: count++,
    //     dateTime: dateTimeData[i],
    //     max: -1,
    //   });
    // }
  }
  return cycleData;
}

function findIndexWindow(
  powerData: number[],
  index: number,
  window: number
) {
  let max = powerData[index];
  let maxIndex = index;
  for (
    let i = index - window;
    i < index + window && i < powerData.length;
    i++
  ) {
    if (max < powerData[i]) {
      max = powerData[i];
      maxIndex = i;
    }
  }

  if (windowDifference(powerData, maxIndex, window)) {
    for (let i = maxIndex - 1; i > maxIndex - window; i--) {
      if ((powerData[maxIndex] - powerData[i]) > 5) {
        maxIndex = i + 1;
        break;
      }
    }
  }
  return maxIndex;
}

function windowDifference(powerData: number[], index: number, window: number) {
  if ((powerData[index] - powerData[index - 1]) <= 3) {
    return true;
  } else {
    return false;
  }
}

export function IEC62552_ExportData_SS2(
  excelData: ExcelData,
  startDate: Date,
  endDate: Date,
  numberOfTCC: number = 3
):SS2Result | null{
  // ExcelData
  const rawData = excelData.slice(2);
  const config = get(selectedStore) as AnalyzeConfig;
  const X_AXIS_INDEX = config.xAxis;
  const POWER_INDEX = config.power;

  let evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);
  let evaluateFrozenIndex = getEvaluateFrozenIndex(config);

  let dateTimeData = [];
  let powerData: number[] = [];

  for (let i = 0; i < rawData.length; i++) {
    //@ts-ignore
    dateTimeData.push(new Date(rawData[i][X_AXIS_INDEX]));
    powerData.push(rawData[i][POWER_INDEX] as number);
  }

  const set = new Set();

  //@ts-ignore
  let cycleData = detectCycleData(dateTimeData, startDate, endDate, powerData);

  // let defrostRecoveryCycleIndex = detectDefrostRecovery(powerData, cycleData);

  return runSS2(
    cycleData,
    dateTimeData,
    rawData,
    evaluateFrozenIndex,
    evaluateUnfrozenIndex,
    config
  );
}

export function detectDefrostRecovery(powerData: number[], cycleData: CycleData[]) {
  let threshold = powerData.reduce((p, c) => p + c, 0) / powerData.length;

  let defrostRecoveryCycleIndex = [];

  for (let i = 1; i < cycleData.length - 1; i++) {
    const beforeCycle = cycleData[i - 1];
    const currentCycle = cycleData[i];

    if (
      powerData[beforeCycle.index] + threshold <
      powerData[currentCycle.index]
    ) {
      defrostRecoveryCycleIndex.push(currentCycle.index);
    }
  }
  return defrostRecoveryCycleIndex;
}

function getEvaluateFrozenIndex(config: AnalyzeConfig) {
  let evaluateFrozenIndex = [];
  switch (config.evaluateFrozen) {
    case TemperatureIndex.FROZEN_0_STAR:
      evaluateFrozenIndex = config.frozenZeroStar.temp;
      break;
    case TemperatureIndex.FROZEN_1_STAR:
      evaluateFrozenIndex = config.frozenOneStar.temp;
      break;
    case TemperatureIndex.FROZEN_2_STAR:
      evaluateFrozenIndex = config.frozenTwoStar.temp;
      break;
    case TemperatureIndex.FROZEN_3_STAR:
      evaluateFrozenIndex = config.frozenThreeStar.temp;
      break;
    case TemperatureIndex.FROZEN_4_STAR:
      evaluateFrozenIndex = config.frozenFourStar.temp;
      break;
    default:
      alert("Not Setup the Evaluate Frozen!");
      evaluateFrozenIndex = config.frozenThreeStar.temp;
      break;
  }
  return evaluateFrozenIndex;
}

function getEvaluateUnfrozenIndex(config: AnalyzeConfig) {
  let evaluateUnfrozenIndex = [];
  switch (config.evaluateUnfrozen) {
    case TemperatureIndex.FRESH_FOOD:
      evaluateUnfrozenIndex = config.freshFood.temp;
      break;
    case TemperatureIndex.CELLAR:
      evaluateUnfrozenIndex = config.cellar.temp;
      break;
    case TemperatureIndex.PANTRY:
      evaluateUnfrozenIndex = config.pantry.temp;
      break;
    case TemperatureIndex.WINE_STORAGE:
      evaluateUnfrozenIndex = config.wineStorage.temp;
      break;
    case TemperatureIndex.CHILL:
      evaluateUnfrozenIndex = config.chill.temp;
      break;
    default:
      alert("Not Setup the Evaluate Unfrozen!");
      evaluateUnfrozenIndex = config.freshFood.temp;
      break;
  }
  return evaluateUnfrozenIndex;
}
