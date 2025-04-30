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

export function IEC62552_3_SS1_Excel(
  rawData: ExcelData,
  cycleData: CycleData[],
  
) {

}

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

    let dynamicThreshold = threshold;
    if (currentPower < threshold /  2) {
      dynamicThreshold = 5;
    } else if (currentPower >= threshold / 2 && currentPower < threshold) {
      dynamicThreshold = threshold /2;
    } else {
      dynamicThreshold = threshold;
    }

    if ((currentPower + dynamicThreshold) < nextPower2) {
      let maxIndex = i + 5;
      if (set.has(maxIndex))  {
        continue;
      } else {
        if (set.has(maxIndex -1) || set.has(maxIndex -2) || set.has(maxIndex -3) || set.has(maxIndex -4) || set.has(maxIndex -5)) {
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
      // let maxIndex = findIndexWindow(powerData, i + 5, 5);
      // if (set.has(maxIndex)) {
      //   continue;
      // } else {
      //   set.add(maxIndex);
      //   if (set.has(maxIndex -1) || set.has(maxIndex -2) || set.has(maxIndex -3) || set.has(maxIndex -4) || set.has(maxIndex -5)) {
      //     set.delete(maxIndex-1);
      //     set.delete(maxIndex-2);
      //     set.delete(maxIndex-3);
      //     set.delete(maxIndex-4);
      //     set.delete(maxIndex-5);
      //     cycleData.pop();
      //   }
      //   cycleData.push({
      //     index: maxIndex,
      //     count: count++,
      //     dateTime: dateTimeData[maxIndex],
      //     max: -1,
      //   });
      // }
    }

  }
  return cycleData;
}

function findIndexWindow(powerData: number[], index: number, window: number) {
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
      if (powerData[maxIndex] - powerData[i] > 5) {
        maxIndex = i + 1;
        break;
      }
    }
  }
  return maxIndex;
}

function windowDifference(powerData: number[], index: number, window: number) {
  if (powerData[index] - powerData[index - 1] <= 3) {
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
): SS2Result | null {
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

export function detectDefrostRecovery(
  powerData: number[],
  cycleData: CycleData[]
) {
  let threshold = powerData.reduce((p, c) => p + c, 0) / powerData.length;
  console.log("Defrost Recovery Threshold: ", threshold);
  let defrostRecoveryCycleIndex = [];

  for (let i = 1; i < cycleData.length - 1; i++) {
    const beforeCycle = cycleData[i - 1];
    const currentCycle = cycleData[i];

    if (
      (powerData[beforeCycle.index] + threshold) <
      powerData[currentCycle.index]
    ) {
      defrostRecoveryCycleIndex.push(currentCycle.index);
    }
  }
  console.log("Defrost Recovery Index: ", defrostRecoveryCycleIndex);
  return defrostRecoveryCycleIndex;
}

export function getEvaluateFrozenIndex(config: AnalyzeConfig) {
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

export function getEvaluateUnfrozenIndex(config: AnalyzeConfig) {
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
