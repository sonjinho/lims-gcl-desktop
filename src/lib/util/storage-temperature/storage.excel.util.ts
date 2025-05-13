import { get } from "svelte/store";
import * as XLSX from "xlsx";
import {
  type AnalyzeConfig,
  isValidTV,
  selectedStore,
} from "../../store/selectedStore";
import { type ExcelData } from "../excel.utils";
import { type Period } from "../iec.62552.3.ss2.util";
import { differenceInSeconds } from 'date-fns';

export function exportStorageExcel(
  originalData: ExcelData,
  periodS: Period,
  periodE: Period,
  matrix: any[][],
) {
  const wb = XLSX.utils.book_new();
  const ws0 = workSheet0(originalData);
  XLSX.utils.book_append_sheet(wb, ws0, "Raw Data");
  const header: string[] = originalData[0] as string[];
  const unit: string[] = originalData[1] as string[];
  const rawData = originalData.slice(2);
  const ws1 = workSheet1(header, unit, rawData, periodS, periodE);
  XLSX.utils.book_append_sheet(wb, ws1, "Period");
  const ws2 = workSheet2(rawData, header, periodS, periodE,matrix);
  XLSX.utils.book_append_sheet(wb, ws2, "Result");
  XLSX.writeFile(wb, "Storage_Export.xlsx");
}

function workSheet0(originalData: ExcelData) {
  return XLSX.utils.aoa_to_sheet(originalData);
}
function workSheet1(
  header: string[],
  unit: string[],
  rawData: ExcelData,
  periodS: Period,
  periodE: Period
) {
  let workSheet: any[][] = [
    ["Period", ...header],
    ["", ...unit],
  ];
  let result: any[][] = rawData.map((row) => ["", ...row]);
  result[periodS.start][0] = "Period S start";
  result[periodS.end][0] = "Period S end";
  result[periodE.start][0] = "Period E start";
  result[periodE.end][0] = "Period E end";
  workSheet = workSheet.concat(result);
  return XLSX.utils.aoa_to_sheet(workSheet);
}
function workSheet2(
  rawData: ExcelData,
  header: string[],
  periodS: Period,
  periodE: Period,
  matrix: any[][],
) {
  const config = get(selectedStore);
  const unfrozenCompartment = toUnfrozenCompartment(config);
  const frozenCompartment = toFrozenCompartment(config);
  let firstRow = ["Target", "Result", "Frozen Compartment"];
  let merges = [
    {
      s:{
        r:0,
        c:0
      },
      e:  {
        r:2,
        c:0
      }
    },
    {
      s:{
        r:0,
        c:1
      },
      e:  {
        r:2,
        c:1
      }
    },
    {
      s: {
        r: 0,
        c: 2,
      },
      e: {
        r: 0,
        c: 2 + frozenCompartment.reduce((a, b) => a + b.temp.length, 0),
      },
    },
  ];
  let secondRow: string[] = [];
  let count = 2;
  for (let i = 0; i < frozenCompartment.length; i++) {
    secondRow[count] = frozenCompartment[i].name;
    merges.push({
      s: {
        r: 1,
        c: count
      },
      e: {
        r:1,
        c: count + frozenCompartment[i].temp.length -1
      }
    })
    count += frozenCompartment[i].temp.length;
  }
  console.log(secondRow);
  let thirdRow: string[] = [];
  count =0;
  for(let i =0 ; i < frozenCompartment.length; i++) {
    for (let j = 0; j < frozenCompartment[i].temp.length; j++) {
      thirdRow[2+(count++)] = header[frozenCompartment[i].temp[j]]
    }
  }
  
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  return ws;
}

interface Compartment {
  unfrozen: boolean;
  name: string;
  temp: number[];
}

function toUnfrozenCompartment(config: AnalyzeConfig): Compartment[] {
  let compartments: Compartment[] = [];
  if (isValidTV(config.freshFood)) {
    compartments.push({
      name: "Fresh-Food Compartment",
      unfrozen: true,
      temp: config.freshFood.temp,
    });
  }
  if (isValidTV(config.cellar)) {
    compartments.push({
      name: "Cellar Compartment",
      unfrozen: true,
      temp: config.cellar.temp,
    });
  }
  if (isValidTV(config.pantry)) {
    compartments.push({
      name: "Pantry Compartment",
      unfrozen: true,
      temp: config.pantry.temp,
    });
  }

  if (isValidTV(config.wineStorage)) {
    compartments.push({
      name: "Wine Storage Compartment",
      unfrozen: true,
      temp: config.wineStorage.temp,
    });
  }

  if (isValidTV(config.chill)) {
    compartments.push({
      name: "Chill Compartment",
      unfrozen: true,
      temp: config.chill.temp,
    });
  }

  return compartments;
}
function toFrozenCompartment(config: AnalyzeConfig): Compartment[] {
  let compartments: Compartment[] = [];
  if (isValidTV(config.frozenZeroStar)) {
    compartments.push({
      name: "0star",
      unfrozen: false,
      temp: config.frozenZeroStar.temp,
    });
  }
  if (isValidTV(config.frozenOneStar)) {
    compartments.push({
      name: "1star",
      unfrozen: false,
      temp: config.frozenOneStar.temp,
    });
  }
  if (isValidTV(config.frozenTwoStar)) {
    compartments.push({
      name: "2star",
      unfrozen: false,
      temp: config.frozenTwoStar.temp,
    });
  }
  if (isValidTV(config.frozenThreeStar)) {
    compartments.push({
      name: "3star",
      unfrozen: false,
      temp: config.frozenThreeStar.temp,
    });
  }
  if (isValidTV(config.frozenFourStar)) {
    compartments.push({
      name: "4star",
      unfrozen: false,
      temp: config.frozenFourStar.temp,
    });
  }

  return compartments;
}
function maxTemperature(
  rawData: ExcelData,
  tempIndex: number,
  from: number,
  to: number
): number {
  if (from == to) return 0;
  if (from >= to) return 0;
  if (from < 0 || to > rawData.length) return 0;
  let max = -1000;
  for (let i = from; i <= to; i++) {
    max = Math.max(max, rawData[i][tempIndex] as number);
  }
  return max;
}
function maxCompartment(
  rawData: ExcelData,
  tempIndexes: number[],
  from: number,
  to: number
): any {
  if (from == to) return 0;
  if (from >= to) return 0;
  const maxTemps = tempIndexes.map((tempIndex) =>
    maxTemperature(rawData, tempIndex, from, to)
  );
  const maxT = Math.max(...maxTemps);
  return maxT;
}
function averageTemp(
  rawData: ExcelData,
  tempIndex: number,
  from: number,
  to: number
): number {
  if (from == to) return 0;
  if (from >= to) return 0;
  if (from < 0 || to > rawData.length) return 0;
  let total = 0;
  for (let i = from; i <= to; i++) {
    total += rawData[i][tempIndex] as number;
  }
  return total / (to - from + 1);
}
function averageCompartment(
  rawData: ExcelData,
  tempIndexes: number[],
  from: number,
  to: number
): number {
  let total = tempIndexes.reduce(
    (a, b) => a + averageTemp(rawData, b, from, to),
    0
  );
  return total / tempIndexes.length;
}
function riseCompartment(
  rawData: ExcelData,
  tempIndexes: number[],
  from1: number,
  to1: number,
  from2: number,
  to2: number
): number {
  let first = maxCompartment(rawData, tempIndexes, from1, to1);
  let second = maxCompartment(rawData, tempIndexes, from2, to2);
  return second - first;
}
function differenceTemp(
  rawData: ExcelData,
  tempIndex: number,
  periodS: Period,
  periodE: Period
): number {
  return (
    averageTemp(rawData, tempIndex, periodE.start, periodE.end) -
    averageTemp(rawData, tempIndex, periodS.start, periodS.end)
  );
}
