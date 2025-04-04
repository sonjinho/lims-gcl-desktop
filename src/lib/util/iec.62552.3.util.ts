//@ts-nocheck
import { selectedStore } from "$lib/store/selectedStore";
import { get } from "svelte/store";
import { ExcelColumn, ExcelData, exportToExcel } from "./excel.utils";

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

  let dateTimeData = [];
  let powerData = [];

  for (let i = 0; i < rawData.length; i++) {
    dateTimeData.push(new Date(rawData[i][X_AXIS_INDEX]));
    powerData.push(rawData[i][POWER_INDEX]);
  }

  const set = new Set();

  let cycleData = [];
  let count = 0;
  let threshold = 20;
  for (let i = 0; i < dateTimeData.length - 6; i++) {
    if (startDate.getTime() > dateTimeData[i].getTime()) {
      continue;
    }
    if (endDate.getTime() < dateTimeData[i].getTime()) {
      break;
    }
    const currentPower = Number(powerData[i]) || 0; // 숫자가 아닌 경우 0으로 처리
    const nextPower2 = Number(powerData[i + 5]) || 0; // i+2 값
    const comparePower1 = Number(powerData[i + 1]) || 0; // i+1 값
    const comparePower2 = Number(powerData[i + 2]) || 0; // i+1 값
    const comparePower3 = Number(powerData[i + 3]) || 0; // i+1 값
    const comparePower4 = Number(powerData[i + 4]) || 0; // i+1 값

    // 조건 1: powerData[i]와 powerData[i+1]의 차이가 5보다 작으면 스킵
    if (currentPower > comparePower1 - 5) {
      continue; // 스킵
    }

    if (currentPower > comparePower2 - 5) {
      continue; // 스킵
    }

    if (currentPower > comparePower3 - 5) {
      continue; // 스킵
    }

    if (currentPower > comparePower4 - 5) {
      continue; // 스킵
    }

    if (currentPower > 10) {
      continue;
    }

    if (currentPower < nextPower2 - threshold) {
      // cycle
      if (
        set.has(i - 1) ||
        set.has(i - 2) ||
        set.has(i - 3) ||
        set.has(i - 4) ||
        set.has(i - 5)
      ) {
        continue;
      }
      set.add(i);
      cycleData.push({
        index: i,
        count: count++,
        dateTime: dateTimeData[i],
      });
    }
  }

  console.log(cycleData.length);
  if (cycleData.length < numberOfTCC * 3) {
    console.log("Not enough Time");
  }

  if (
    cycleData[numberOfTCC].dateTime.getTime() -
      cycleData[0].dateTime.getTime() <
    2 * 60 * 60 * 1000
  ) {
    console.log(
      "Invalid, More than 2hr: current :",
      (cycleData[numberOfTCC].dateTime.getTime() -
        cycleData[0].dateTime.getTime()) /
        1000 /
        60
    );
  }

  let firstCycle = cycleData[0];

  let exportData = [];

  for (let i = 0; i < cycleData.length - numberOfTCC * 3 - 1; i++) {
    // more than 2hr
    // block A
    const k = i;
    let blockA = [k, k + numberOfTCC - 1];
    let blockB = [k + numberOfTCC, k + numberOfTCC * 2 - 1];
    let blockC = [k + numberOfTCC * 2, k + numberOfTCC * 3 - 1];

    let row = new ExportRow();
    row.blockA = blockA.join(" to ");
    row.blockB = blockB.join(" to ");
    row.blockC = blockC.join(" to ");

    const startIndex = cycleData[blockA[0]].index;
    const endIndex = cycleData[blockC[1] + 1].index;

    const value = {
      rawData,
      startIndex,
      endIndex,
    };
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
      // [
      //   ExcelColumn.TC_7,
      //   ExcelColumn.TC_8,
      //   ExcelColumn.TC_9,
      //   ExcelColumn.TC_10,
      //   ExcelColumn.TC_13,
      // ]
    );
    // row.testPeriodFrozen2Star = getTestPeriodAverage(
    //   rawData,
    //   startIndex,
    //   endIndex,
    //   [ExcelColumn.TC_11, ExcelColumn.TC_12]
    // );
    row.ambientTemp = getTestPeriodAverage(rawData, startIndex, endIndex, config.ambient);
    row.testPeriodPower = getTestPeriodAverage(rawData, startIndex, endIndex, [POWER_INDEX]);
    row.testPeriodABC =
      (dateTimeData[endIndex - 1].getTime() -
        dateTimeData[startIndex].getTime()) /
      60 /
      60 /
      1000;

    let blockAUnfrozen = getTestPeriodAverage(
      rawData,
      cycleData[blockA[0]].index,
      cycleData[blockA[1] + 1].index,
      evaluateUnfrozenIndex
      // [ExcelColumn.TC_3, ExcelColumn.TC_4, ExcelColumn.TC_5]
    );

    let blockBUnfrozen = getTestPeriodAverage(
      rawData,
      cycleData[blockB[0]].index,
      cycleData[blockB[1] + 1].index,
      evaluateUnfrozenIndex
    );

    let blockCUnfrozen = getTestPeriodAverage(
      rawData,
      cycleData[blockC[0]].index,
      cycleData[blockC[1] + 1].index,
      evaluateUnfrozenIndex
    );

    // Spread Unfrozen
    row.spreadUnfrozen =
      Math.max(blockAUnfrozen, blockBUnfrozen, blockCUnfrozen) -
      Math.min(blockAUnfrozen, blockBUnfrozen, blockCUnfrozen);

    // Spread Frozen
    let blockAFrozen = getTestPeriodAverage(
      rawData,
      cycleData[blockA[0]].index,
      cycleData[blockA[1] + 1].index,
      evaluateFrozenIndex
    );

    let blockBFrozen = getTestPeriodAverage(
      rawData,
      cycleData[blockB[0]].index,
      cycleData[blockB[1] + 1].index,
      evaluateFrozenIndex
    );
    let blockCFrozen = getTestPeriodAverage(
      rawData,
      cycleData[blockC[0]].index,
      cycleData[blockC[1] + 1].index,
      evaluateFrozenIndex
    );

    // Spread Frozen
    row.spreadFrozen =
      Math.max(blockAFrozen, blockBFrozen, blockCFrozen) -
      Math.min(blockAFrozen, blockBFrozen, blockCFrozen);

    let blockAPower = getTestPeriodAverage(
      rawData,
      cycleData[blockA[0]].index,
      cycleData[blockA[1] + 1].index,
      [POWER_INDEX]
    );
    let blockBPower = getTestPeriodAverage(
      rawData,
      cycleData[blockB[0]].index,
      cycleData[blockB[0] + 1].index,
      [POWER_INDEX]
    );
    let blockCPower = getTestPeriodAverage(
      rawData,
      cycleData[blockC[0]].index,
      cycleData[blockC[1] + 1].index,
      [POWER_INDEX]
    );

    // Spread Power
    row.spreadPower =
      Math.max(blockAPower, blockBPower, blockCPower) / row.testPeriodPower;

    // Slope Unfrozen
    row.slopeUnfrozen =
      Math.abs(blockAUnfrozen - blockCUnfrozen) / row.testPeriodABC;

    // Slope Frozen
    row.slopeFrozen = Math.abs(blockAFrozen - blockCFrozen) / row.testPeriodABC;

    // Slope Power
    row.slopePower =
      Math.abs(blockCPower - blockAPower) /
      row.testPeriodABC /
      row.testPeriodPower;

    // Permitted Power
    if (row.testPeriodABC <= 12) {
      row.permittedPowerSpread = 1;
    } else if (row.testPeriodABC < 36) {
      row.permittedPowerSpread = 1 + ((row.testPeriodABC - 12) / 1200) * 100;
    } else {
      row.permittedPowerSpread = 3;
    }

    // Validate
    row.valid = row.validate();

    exportData.push(row);
  }
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
      } else {
        element.testPeriodValid = false;
      }
    }
  }
  exportData.

  exportToExcel(transformDataForExcel(exportData));
  return exportData;
}

function getTestPeriodAverage(rawData, startIndex, endIndex, columns) {
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

function formatLocalTime(date) {
  const pad = (num) => num.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // 0부터 시작하므로 +1
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function findRowWithMinSpreadPower(exportData: ExportRow[]): ExportRow | undefined {
  // testPeriodValid가 true인 항목 필터링
  const validRows = exportData.filter(row => row.testPeriodValid);

  // 결과가 없으면 undefined 반환
  if (validRows.length === 0) return undefined;

  // spreadPower가 최소인 객체 찾기
  return validRows.reduce((minRow, currentRow) => {
    return currentRow.spreadPower < minRow.spreadPower ? currentRow : minRow;
  });
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

  validate(): boolean {
    // If has TCC then longer than 6hr
    if (this.testPeriodABC <= 6) return false;

    // Spread Temperature less than 0.25
    if (this.spreadUnfrozen >= 0.25) return false;
    if (this.spreadFrozen >= 0.25) return false;

    if (this.spreadPower > this.permittedPowerSpread) return false;

    if (this.slopePower >= 0.025) return false;

    return true;
  }
}
