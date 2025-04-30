import { differenceInSeconds } from "date-fns";
import {
  type AnalyzeConfig,
  isTwoComaprtment,
  isValidTV,
  selectedStore,
} from "../store/selectedStore";
import type { ExcelData } from "./excel.utils";
import getTestPeriodAverage, {
  ConstantTemperature,
  type CycleData,
  getConstValue,
  type Tdf,
} from "./iec.util";
import { get } from 'svelte/store';
import { getEvaluateFrozenIndex, getEvaluateUnfrozenIndex } from './iec.62552.3.util';

export function runSS1_manual(
  rawData: ExcelData,
  timeData: Date[],
  cycleData: CycleData[],
  numberOfTCC: number,
): ExportRow[] {
  let config = get(selectedStore);
  let evaluateFrozenIndex = getEvaluateFrozenIndex(config);
  let evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);

  return runSS1(
    cycleData,
    timeData,
    rawData,
    evaluateFrozenIndex,
    evaluateUnfrozenIndex,
    config,
    numberOfTCC
  );
}

export function runSS1(
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateFrozenIndex: number[],
  evaluateUnfrozenIndex: number[],
  config: AnalyzeConfig,
  numberOfTCC: number
): ExportRow[] {
  if (cycleData.length < numberOfTCC * 3) {
    alert("Not Enough TCC");
  }


  let exportData: ExportRow[] = [];
  for (let i = 0; i < cycleData.length - numberOfTCC * 3 - 1; i++) {
    const k = i;
    let blockA = [cycleData[k].index, cycleData[k + numberOfTCC].index];
    let blockB = [
      cycleData[k + numberOfTCC].index,
      cycleData[k + numberOfTCC * 2].index,
    ];
    let blockC = [
      cycleData[k + numberOfTCC * 2].index,
      cycleData[k + numberOfTCC * 3].index,
    ];

    let row = createExportRow(
      blockA,
      blockB,
      blockC,
      rawData,
      timeData,
      evaluateFrozenIndex,
      evaluateUnfrozenIndex,
      config
    );
    row.blockA = `TCC ${cycleData[k].count} to ${cycleData[k + numberOfTCC].count - 1}`;
    row.blockB = `TCC ${cycleData[k + numberOfTCC].count} to ${cycleData[k + numberOfTCC * 2].count - 1}`;
    row.blockC = `TCC ${cycleData[k + numberOfTCC * 2].count} to ${cycleData[k + numberOfTCC * 3].count - 1}`;

    row.blockATime = `${timeData[cycleData[k].index]} to ${timeData[cycleData[k + numberOfTCC].index]}`;
    row.blockBTime = `${timeData[cycleData[k + numberOfTCC].index]} to ${timeData[cycleData[k + numberOfTCC * 2].index]}`
    row.blockCTime = `${timeData[cycleData[k + numberOfTCC * 2].index]} to ${timeData[cycleData[k + numberOfTCC * 3].index]}`;
    exportData.push(row);
  }

  let minimumIndex = -1;
  let minim = 1000_000_000;

  for (let index = 0; index < exportData.length; index++) {
    const element = exportData[index];
    if (index < 2) {
      element.testPeriodValid = false;
    } else {
      if (
        exportData[index].valid &&
        exportData[index - 1].valid &&
        exportData[index - 2].valid
      ) {
        element.testPeriodValid = true;
        if (minim > element.spreadPower) {
          minim = element.spreadPower;
          minimumIndex = index;
        }
      } else {
        element.testPeriodValid = false;
      }
    }
  }

  let PSS = -1;
  if (minimumIndex != -1) {
    const target = exportData[minimumIndex];
    const k = minimumIndex;
    const constV = getConstValue(config.targetAmbient);

    const startIndex = cycleData[k].index;
    const endIndex = cycleData[k + numberOfTCC * 3].index;

    const PSS1 = target.testPeriodPower;
    const Tat = constV.Tat;
    const Tam = target.ambientTemp;
    const c1 = constV.c1;
    const c2 = constV.c2;

    const Tdf = calcTdf(rawData, startIndex, endIndex, config);

    const deno = calcDenominator(config, c1, c2, Tam, Tdf);
    const numer = calcNumer(config, c1, c2, Tam);
    const deltaCop = isTwoComaprtment(config)
      ? constV.deltaCopTwo
      : constV.deltaCopOne;

    exportData[minimumIndex].pss =
      PSS1 *
      (1 + (Tat - Tam) * (numer / deno)) *
      (1 / (1 + (Tat - Tam) * deltaCop));
    console.log(Tdf, PSS1);
  }
  return exportData;
}

function createExportRow(
  blockA: number[],
  blockB: number[],
  blockC: number[],
  rawData: ExcelData,
  timeData: Date[],
  evaluateFrozenIndex: number[],
  evaluateUnfrozenIndex: number[],
  config: AnalyzeConfig
): ExportRow {
  let row = new ExportRow();

  const startIndex = blockA[0];
  const endIndex = blockC[1];

  row.testPeriodUnfrozen = getTestPeriodAverage(
    rawData,
    startIndex,
    endIndex,
    evaluateUnfrozenIndex
  );

  row.testPeriodFrozen = getTestPeriodAverage(
    rawData,
    startIndex,
    endIndex,
    evaluateFrozenIndex
  );

  row.ambientTemp = getTestPeriodAverage(
    rawData,
    startIndex,
    endIndex,
    config.ambient
  );

  row.testPeriodPower = getTestPeriodAverage(rawData, startIndex, endIndex, [
    config.power,
  ]);

  row.testPeriodABC =
    differenceInSeconds(timeData[endIndex], timeData[startIndex]) / 3600;

  row.spreadUnfrozen = getSpread(
    rawData,
    blockA,
    blockB,
    blockC,
    evaluateUnfrozenIndex
  );

  row.spreadFrozen = getSpread(
    rawData,
    blockA,
    blockB,
    blockC,
    evaluateFrozenIndex
  );

  row.spreadPower = getSpreadPower(rawData, blockA, blockB, blockC, [
    config.power,
  ]);

  row.slopeUnfrozen = getSlope(
    rawData,
    blockA,
    blockC,
    evaluateUnfrozenIndex,
    row.testPeriodABC
  );

  row.slopeFrozen = getSlope(
    rawData,
    blockA,
    blockC,
    evaluateFrozenIndex,
    row.testPeriodABC
  );

  // convert to integer
  const mediumA = Math.trunc((blockA[1] + blockA[0]) / 2);
  const mediumC = Math.trunc((blockC[1] + blockC[0]) / 2);
  row.slopePower =
    Math.abs(
      getTestPeriodAverage(rawData, blockC[0], blockC[1], [config.power]) -
        getTestPeriodAverage(rawData, blockA[0], blockA[1], [config.power])
    ) /
    ((differenceInSeconds(timeData[mediumC], timeData[mediumA]) / 3600) *
      getTestPeriodAverage(rawData, blockA[0], blockC[1], [config.power]));
  row.permittedPowerSpread = getPermittedPowerSpread(row.testPeriodABC);

  row.valid = validate(row);
  // console.log(row);

  return row;
}

function getSpread(
  rawData: ExcelData,
  blockA: number[],
  blockB: number[],
  blockC: number[],
  indexes: number[]
) {
  let blockAValue = getTestPeriodAverage(
    rawData,
    blockA[0],
    blockA[1],
    indexes
  );
  let blockBValue = getTestPeriodAverage(
    rawData,
    blockB[0],
    blockB[1],
    indexes
  );
  let blockCValue = getTestPeriodAverage(
    rawData,
    blockC[0],
    blockC[1],
    indexes
  );

  return (
    Math.max(blockAValue, blockBValue, blockCValue) -
    Math.min(blockAValue, blockBValue, blockCValue)
  );
}

function getSpreadPower(
  rawData: ExcelData,
  blockA: number[],
  blockB: number[],
  blockC: number[],
  powerIndex: number[]
) {
  let blockAPower = getTestPeriodAverage(
    rawData,
    blockA[0],
    blockA[1],
    powerIndex
  );

  let blockBPower = getTestPeriodAverage(
    rawData,
    blockB[0],
    blockB[1],
    powerIndex
  );

  let blockCPower = getTestPeriodAverage(
    rawData,
    blockC[0],
    blockC[1],
    powerIndex
  );

  return (
    (Math.max(blockAPower, blockBPower, blockCPower) - Math.min(blockAPower,blockBPower, blockCPower)) /
    getTestPeriodAverage(rawData, blockA[0], blockC[1], powerIndex)
  ) * 100;
}

function getSlope(
  rawData: ExcelData,
  blockA: number[],
  blockC: number[],
  indexes: number[],
  testPeriod: number
) {
  return (
    Math.abs(
      getTestPeriodAverage(rawData, blockA[0], blockA[1], indexes) -
        getTestPeriodAverage(rawData, blockC[0], blockC[1], indexes)
    ) / testPeriod
  );
}

function getPermittedPowerSpread(testPeriod: number) {
  if (testPeriod <= 12) {
    return 1;
  } else if (testPeriod < 36) {
    return 1 + ((testPeriod - 12) / 1200) * 100;
  } else {
    return 3;
  }
}

function calcTdf(
  rawData: ExcelData,
  beginIndex: number,
  endIndex: number,
  config: AnalyzeConfig
): Tdf {
  let rtn: Tdf = {
    freshFood: -1000,
    cellar: -1000,
    pantry: -1000,
    wineStorage: -1000,
    chill: -1000,
    frozenZeroStar: -1000,
    frozenOneStar: -1000,
    frozenTwoStar: -1000,
    frozenThreeStar: -1000,
    frozenFourStar: -1000,
    evaluateFrozen: -1000,
    evaluateUnfrozen: -1000,
  };

  if (isValidTV(config.freshFood)) {
    rtn.freshFood = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.freshFood.temp
    );
  }

  if (isValidTV(config.cellar)) {
    rtn.cellar = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.cellar.temp
    );
  }

  if (isValidTV(config.pantry)) {
    rtn.pantry = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.pantry.temp
    );
  }

  if (isValidTV(config.wineStorage)) {
    rtn.wineStorage = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.wineStorage.temp
    );
  }

  if (isValidTV(config.chill)) {
    rtn.chill = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.chill.temp
    );
  }

  if (isValidTV(config.frozenZeroStar)) {
    rtn.frozenZeroStar = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.frozenZeroStar.temp
    );
  }

  if (isValidTV(config.frozenOneStar)) {
    rtn.frozenOneStar = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.frozenOneStar.temp
    );
  }

  if (isValidTV(config.frozenTwoStar)) {
    rtn.frozenTwoStar = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.frozenTwoStar.temp
    );
  }
  if (isValidTV(config.frozenThreeStar)) {
    rtn.frozenThreeStar = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.frozenThreeStar.temp
    );
  }
  if (isValidTV(config.frozenFourStar)) {
    rtn.frozenFourStar = getTestPeriodAverage(
      rawData,
      beginIndex,
      endIndex,
      config.frozenFourStar.temp
    );
  }

  return rtn;
}

function calcDenominator(
  config: AnalyzeConfig,
  c1: number,
  c2: number,
  Tam: number,
  tdf: Tdf
) {
  let value = 0;
  if (isValidTV(config.freshFood)) {
    value +=
      (config.freshFood.volume * (Tam - tdf.freshFood)) /
      (c1 * (18 + ConstantTemperature.FRESH_FOOD) + c2);
  }
  if (isValidTV(config.cellar)) {
    value +=
      (config.cellar.volume * (Tam - tdf.cellar)) /
      (c1 * (18 + ConstantTemperature.CELLAR) + c2);
  }
  if (isValidTV(config.pantry)) {
    value +=
      (config.pantry.volume * (Tam - tdf.pantry)) /
      (c1 * (18 + ConstantTemperature.PANTRY) + c2);
  }
  if (isValidTV(config.wineStorage)) {
    value +=
      (config.wineStorage.volume * (Tam - tdf.wineStorage)) /
      (c1 * (18 + ConstantTemperature.WINE_STORAGE) + c2);
  }
  if (isValidTV(config.chill)) {
    value +=
      (config.chill.volume * (Tam - tdf.chill)) /
      (c1 * (18 + ConstantTemperature.CHILL) + c2);
  }
  if (isValidTV(config.frozenZeroStar)) {
    value +=
      (config.frozenZeroStar.volume * (Tam - tdf.frozenZeroStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_ZERO_STAR) + c2);
  }
  if (isValidTV(config.frozenOneStar)) {
    value +=
      (config.frozenOneStar.volume * (Tam - tdf.frozenOneStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_ONE_STAR) + c2);
  }
  if (isValidTV(config.frozenTwoStar)) {
    value +=
      (config.frozenTwoStar.volume * (Tam - tdf.frozenTwoStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_TWO_STAR) + c2);
  }

  if (isValidTV(config.frozenThreeStar)) {
    value +=
      (config.frozenThreeStar.volume * (Tam - tdf.frozenThreeStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_THREE_STAR) + c2);
  }

  if (isValidTV(config.frozenFourStar)) {
    value +=
      (config.frozenFourStar.volume * (Tam - tdf.frozenFourStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_FOUR_STAR) + c2);
  }

  return value;
}

function calcNumer(config: AnalyzeConfig, c1: number, c2: number, Tam: number) {
  let value = 0;
  if (isValidTV(config.freshFood)) {
    value +=
      config.freshFood.volume /
      (c1 * (18 + ConstantTemperature.FRESH_FOOD) + c2);
  }

  if (isValidTV(config.cellar)) {
    value +=
      config.cellar.volume / (c1 * (18 + ConstantTemperature.CELLAR) + c2);
  }

  if (isValidTV(config.pantry)) {
    value +=
      config.pantry.volume / (c1 * (18 + ConstantTemperature.PANTRY) + c2);
  }

  if (isValidTV(config.wineStorage)) {
    value +=
      config.wineStorage.volume /
      (c1 * (18 + ConstantTemperature.WINE_STORAGE) + c2);
  }

  if (isValidTV(config.chill)) {
    value += config.chill.volume / (c1 * (18 + ConstantTemperature.CHILL) + c2);
  }

  if (isValidTV(config.frozenZeroStar)) {
    value +=
      config.frozenZeroStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_ZERO_STAR) + c2);
  }
  if (isValidTV(config.frozenOneStar)) {
    value +=
      config.frozenOneStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_ONE_STAR) + c2);
  }
  if (isValidTV(config.frozenTwoStar)) {
    value +=
      config.frozenTwoStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_TWO_STAR) + c2);
  }

  if (isValidTV(config.frozenThreeStar)) {
    value +=
      config.frozenThreeStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_THREE_STAR) + c2);
  }

  if (isValidTV(config.frozenFourStar)) {
    value +=
      config.frozenFourStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_FOUR_STAR) + c2);
  }

  return value;
}

const COLUMN_MAPPING: Record<keyof ExportRow, string> = {
  blockA: "Block A",
  blockB: "Block B",
  blockC: "Block C",
  testPeriodUnfrozen: "Test Period Unfrozen (°C)",
  testPeriodFrozen: "Test Period Frozen (°C)",
  testPeriodPower: "Test Period Power (W)",
  testPeriodABC: "Test Period (h)",
  ambientTemp: "Ambient Temperature (°C)",
  spreadUnfrozen: "Spread Unfrozen (K)",
  spreadFrozen: "Spread Frozen (K)",
  spreadPower: "Spread Power (%)",
  slopeUnfrozen: "Slope Unfrozen (K/h)",
  slopeFrozen: "Slope Frozen (K/h)",
  slopePower: "Slope Power (%/h)",
  permittedPowerSpread: "Permitted Power Spread (%)",
  valid: "IEC Creteria Annex B",
  testPeriodValid: "Test Period Valid",
  pss: "PSS",
  blockATime: "Block A Time",
  blockBTime: "Block B Time",
  blockCTime: "Block C Time",
};

export function transformDataForExcel(
  data: ExportRow[]
): Record<string, any>[] {
  return data.map((row) => {
    const transformedRow: Record<string, any> = {};
    for (const key in row) {
      if (COLUMN_MAPPING[key as keyof ExportRow]) {
        transformedRow[COLUMN_MAPPING[key as keyof ExportRow]] =
          row[key as keyof ExportRow];
      }
    }
    return transformedRow;
  });
}

export class ExportRow {
  blockA: string;
  blockB: string;
  blockC: string;

  testPeriodUnfrozen: number;

  testPeriodFrozen: number;

  testPeriodPower: number;
  testPeriodABC: number;

  ambientTemp: number;
  spreadUnfrozen: number;
  spreadFrozen: number;
  spreadPower: number;
  slopeUnfrozen: number;
  slopeFrozen: number;
  slopePower: number;

  permittedPowerSpread: number;
  valid: boolean;
  testPeriodValid: boolean;
  pss: number;
  
  blockATime: string = '';
  blockBTime: string = '';
  blockCTime: string = '';
  constructor(
    blockA: string = "",
    blockB: string = "",
    blockC: string = "",
    testPeriodUnfrozen: number = 0,
    testPeriodFrozen: number = 0,
    testPeriodPower: number = 0,
    testPeriodABC: number = 0,
    ambientTemp: number = 0,
    spreadUnfrozen: number = 0,
    spreadFrozen: number = 0,
    spreadPower: number = 0,
    slopeUnfrozen: number = 0,
    slopeFrozen: number = 0,
    slopePower: number = 0,
    permittedPowerSpread: number = 0,
    valid: boolean = false,
    testPeriodValid: boolean = false,
    pss: number = 0
  ) {
    this.blockA = blockA;
    this.blockB = blockB;
    this.blockC = blockC;
    this.testPeriodUnfrozen = testPeriodUnfrozen;
    this.testPeriodFrozen = testPeriodFrozen;
    this.testPeriodPower = testPeriodPower;
    this.testPeriodABC = testPeriodABC;
    this.ambientTemp = ambientTemp;
    this.spreadUnfrozen = spreadUnfrozen;
    this.spreadFrozen = spreadFrozen;
    this.spreadPower = spreadPower;
    this.slopeUnfrozen = slopeUnfrozen;
    this.slopeFrozen = slopeFrozen;
    this.slopePower = slopePower;
    this.permittedPowerSpread = permittedPowerSpread;
    this.valid = valid;
    this.testPeriodValid = testPeriodValid;
    this.pss = pss;
  }
}

function validate(row: ExportRow): boolean {
  if (row.testPeriodABC <= 6) return false;

  // Spread Temperature less than 0.25
  if (row.spreadUnfrozen >= 0.25) return false;
  if (row.spreadFrozen >= 0.25) return false;

  if (row.spreadPower > row.permittedPowerSpread) return false;

  if (row.slopePower >= 0.025) return false;

  return true;
}

function toArray(row: ExportRow): any[] {
  return [
    `${row.blockA}`
  ]
}
