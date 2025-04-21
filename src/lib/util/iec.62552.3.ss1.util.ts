import { differenceInSeconds } from "date-fns";
import {
  AnaylzeConfig,
  isTwoComaprtment,
  isValidTV,
} from "../store/selectedStore";
import { ExcelData } from "./excel.utils";
import { CycleData, getConstValue, Tdf } from "./iec.62552.3.util";
import getTestPeriodAverage, { ConstantTemperature } from "./iec.util";

function run(
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateFrozenIndex: number[],
  evaluateUnfrozenIndex: number[],
  config: AnaylzeConfig,
  numberOfTCC: number
): ExportRow[] {
  if (cycleData.length < numberOfTCC * 3) {
    alert("Not Enough TCC");
  }

  if (
    differenceInSeconds(
      cycleData[numberOfTCC].dateTime,
      cycleData[0].dateTime
    ) <
    2 * 3600
  ) {
    alert("Invalid, More Than 2hr!");
  }

  let exportData: ExportRow[] = [];
  for (let i = 0; i < cycleData.length - numberOfTCC * 3 - 1; i++) {
    const k = i;
    let blockA = [cycleData[k].index, cycleData[k + numberOfTCC - 1].index];
    let blockB = [
      cycleData[k + numberOfTCC].index,
      cycleData[k + numberOfTCC * 2 - 1].index,
    ];
    let blockC = [
      cycleData[k + numberOfTCC * 2].index,
      cycleData[k + numberOfTCC * 3 - 1].index,
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

    const PSS1 = target.spreadPower;
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
  config: AnaylzeConfig
): ExportRow {
  let row = new ExportRow();

  const startIndex = blockA[0];
  const endIndex = blockC[1] + 1;

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

  row.permittedPowerSpread = getPermittedPowerSpread(row.testPeriodABC);

  row.valid = validate(row);

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
    Math.max(blockAPower, blockBPower, blockCPower) /
    getTestPeriodAverage(rawData, blockA[0], blockC[1], powerIndex)
  );
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
  config: AnaylzeConfig
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
  config: AnaylzeConfig,
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

function calcNumer(config: AnaylzeConfig, c1: number, c2: number, Tam: number) {
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
};

function transformDataForExcel(data: ExportRow[]): Record<string, any>[] {
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

class ExportRow {
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
