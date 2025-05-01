import { type AnalyzeConfig } from "$lib/store/selectedStore";
import { type ExcelData } from "./excel.utils";

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

export interface Tdf {
  evaluateFrozen: number;
  evaluateUnfrozen: number;
  freshFood: number;
  cellar: number;
  pantry: number;
  wineStorage: number;
  chill: number;
  frozenZeroStar: number;
  frozenOneStar: number;
  frozenTwoStar: number;
  frozenThreeStar: number;
  frozenFourStar: number;
}

export interface CycleData {
  index: number;
  count: number;
  dateTime: Date;
  max: number;
}

export function getTestPeriodAverage(
  rawData: ExcelData, 
  startIndex: number, 
  endIndex: number,
  columns: number[]
) {
  let sums = new Array(columns.length).fill(0);

  for (let i = startIndex; i < endIndex; i++) {
    columns.forEach((col, idx) => {
      sums[idx] += rawData[i][col];
    });
  }

  let totalAvg = sums.reduce(
    (acc, sum) => acc + sum / (endIndex - startIndex),
    0
  );
  return totalAvg / columns.length;
}

export function getConstValue(ambient: number) {
  if (ambient == 32) {
    return {
      Tat: 32,
      c1: 0.011364,
      c2: 1.25,
      deltaCopTwo: -0.014,
      deltaCopOne: -0.019,
    };
  } else {
    return {
      Tat: 16,
      c1: 0.011364,
      c2: 1.25,
      deltaCopTwo: 0.0,
      deltaCopOne: -0.004,
    };
  }
}

export enum ConstantTemperature  {
  PANTRY = 17,
  WINE_STORAGE = 12,
  CELLAR = 12,
  FRESH_FOOD = 4,
  CHILL = 2,
  FROZEN_ZERO_STAR = 0,
  FROZEN_ONE_STAR = -6,
  FROZEN_TWO_STAR = -12,
  FROZEN_THREE_STAR = -18,
  FROZEN_FOUR_STAR = -18,
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
    }
  }
  return cycleData;
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
