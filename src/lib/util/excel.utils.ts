import { isValidTV, selectedStore } from "$lib/store/selectedStore";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { get } from "svelte/store";
import * as XLSX from "xlsx";
import { ExportRow, runSS1_manual } from "./iec.62552.3.ss1.util";
import {
  runSS2_manual,
  SS2Result,
  type PeriodBlock,
} from "./iec.62552.3.ss2.util";
import type { CycleData, Tdf } from "./iec.62552.3.util";

export type ExcelData = (string | number | null | Date)[][]; // Date 타입 추가

export async function findExcelFile(): Promise<string | null> {
  const selected = await open({
    title: "Excel File (xlsx, xls, xlsb)",
    filters: [{ name: "Excel 파일", extensions: ["xlsx", "xls", "xlsb"] }],
    multiple: false,
    directory: false,
  });
  return selected;
}

export default async function openExcelFile(
  selected: string
): Promise<ExcelData | null> {
  try {
    console.log(selected);
    let start = new Date();
    const fileData = await readFile(selected);
    const workbook = XLSX.read(fileData, {
      type: "array",
      cellDates: false, // 날짜를 Date 객체로 반환
      dense: true,
      sheets: 0,
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    //@ts-ignore
    let jsonData: ExcelData = XLSX.utils
      .sheet_to_json(worksheet, {
        header: 1,
        raw: true, // 날짜를 시리얼 넘버 대신 변환된 값으로 반환
        defval: null,
      })
      //@ts-ignore
      .filter((row) => row.some((cell) => cell !== null && cell !== ""));
    console.log(
      "Finish Default Parse: " + (new Date().getTime() - start.getTime()) + "ms"
    );
    jsonData = jsonData.map((row) => {
      let trimmedRow = [...row]; // 행 복사
      while (
        trimmedRow.length > 0 &&
        trimmedRow[trimmedRow.length - 1] === null
      ) {
        trimmedRow.pop(); // 맨 뒤가 null이면 제거
      }
      return trimmedRow;
    });

    const optimizedData = jsonData.map((row) =>
      row.map((cell) => {
        if (typeof cell === "number" && cell > 25569) {
          // Excel 날짜 시리얼 넘버 체크
          const date = new Date((cell - 25569) * 86400 * 1000);
          return date.toISOString().replace("T", " ").slice(0, 19); // "YYYY-MM-DD HH:MM:SS"
        }
        return cell;
      })
    );
    let end = new Date();
    // console.log(optimizedData)
    console.log("Duration: " + (end.getTime() - start.getTime()) + "ms");

    return optimizedData;
  } catch (error) {
    console.error("Read Excel File Error:", error);
    return null;
  }
}

export function exportSS2ToExcel(
  rawData: ExcelData,
  cycleData: CycleData[],
  block: PeriodBlock[],
  fileName: string = "SS2_Export.xlsx"
) {
  const result = runSS2_manual(rawData, cycleData, block);

  if (!result) {
    alert("No Valid Select");
    return;
  }
  if (result == null) {
    alert("No Valid Select");
    return;
  }

  result;

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet(workSheet1(result));
  XLSX.utils.book_append_sheet(wb, ws1, "Result");

  const ws2 = XLSX.utils.aoa_to_sheet(workSheet2(result));
  XLSX.utils.book_append_sheet(wb, ws2, "PeriodX,Y");

  const ws3 = XLSX.utils.aoa_to_sheet(workSheet3(result));
  XLSX.utils.book_append_sheet(wb, ws3, "PeriodD,F");

  XLSX.writeFile(wb, fileName);
}

export function exportSS1ToExcel(
  rawData: ExcelData,
  cycleData: CycleData[],
  timeData: Date[],
  numberOfTCC: number,
  fileName: string = "SS1_Export.xlsx"
) {
  const exportRows = runSS1_manual(rawData, timeData, cycleData, numberOfTCC);
  const header = [
    "Block A",
    "Block B",
    "Block C",
    "Test Period Unfrozen",
    "Test Period Frozen",
    "Test Period Power",
    "Test Period (A-B-C)",
    "Ambient Temp (A-B-C)",
    "Spread Unfrozen (A-B-C)",
    "Spread Frozen (A-B-C)",
    "Spread Power (A-B-C)",
    "Slope Unfrozen (A-C)",
    "Slope Frozen (A-C)",
    "Slope Power (A-C)",
    "Permitted Power Spread",
    "IEC Criteria Annex B",
    "Test Period Valid",
    "PSS",
  ];
  //Celsius, Celsius, Watt, h, Cellsius, Kelvin
  const unit = [
    "TCCs",
    "TCCs",
    "TCCs",
    "°C",
    "°C",
    "W",
    "h",
    "K",
    "K",
    "%",
    "K/h",
    "K/h",
    "%/h",
    "%",
    "",
    "",
    "",
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([
    header,
    unit,
    ...exportRows.map(converter),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SS1 Result");
  XLSX.writeFile(workbook, fileName);
}

export function converter(row: ExportRow): any[] {
  return [
    row.blockA,
    row.blockB,
    row.blockC,
    row.testPeriodUnfrozen,
    row.testPeriodFrozen,
    row.testPeriodPower,
    row.testPeriodABC,
    row.ambientTemp,
    row.spreadUnfrozen,
    row.spreadFrozen,
    row.spreadPower,
    row.slopeUnfrozen,
    row.slopeFrozen,
    row.slopePower,
    row.permittedPowerSpread,
    row.valid ? "TRUE" : "FALSE",
    row.testPeriodValid ? "VALID" : "INVALID",
    row.pss,
  ];
}

function workSheet1(result: SS2Result): any[] {
  return [
    ["PSS", result.PSS],
    ["PSS2", result.PSS2],
    ["Tat", result.Tat],
    ["Tam", result.Tam],
    ["c1", result.c1],
    ["c2", result.c2],
    ["Edf", result.Edf],
    ["Thdf"],
    ...convertTdfToArray(result.Thdf),
    ["TSS2"],
    ...convertTdfToArray(result.TSS2),
  ];
}

function convertTdfToArray(tdf: Tdf): any[] {
  const config = get(selectedStore);
  let result: any[] = [];
  if (isValidTV(config.freshFood)) {
    result = [...result, ["", "Fresh food", tdf.freshFood]];
  }

  if (isValidTV(config.cellar)) {
    result = [...result, ["", "Cellar", tdf.cellar]];
  }
  if (isValidTV(config.wineStorage)) {
    result = [...result, ["", "Wine Storage", tdf.wineStorage]];
  }
  if (isValidTV(config.chill)) {
    result = [...result, ["", "Chill", tdf.chill]];
  }
  if (isValidTV(config.frozenZeroStar)) {
    result = [...result, ["", "Frozen Zero Star", tdf.frozenZeroStar]];
  }
  if (isValidTV(config.frozenOneStar)) {
    result = [...result, ["", "Frozen One Star", tdf.frozenOneStar]];
  }
  if (isValidTV(config.frozenTwoStar)) {
    result = [...result, ["", "Frozen Two Star", tdf.frozenTwoStar]];
  }
  if (isValidTV(config.frozenThreeStar)) {
    result = [...result, ["", "Frozen Three Star", tdf.frozenThreeStar]];
  }
  if (isValidTV(config.frozenFourStar)) {
    result = [...result, ["", "Frozen Four Star", tdf.frozenFourStar]];
  }

  return result;
}

export function workSheet2(result: SS2Result): any[] {
  let validLength =
    result.xyRatio >= 0.8 &&
    result.xyRatio <= 1.25 &&
    result.xTCC >= 4 &&
    result.yTCC >= 4 &&
    result.xDuration >= 4 &&
    result.yDuration >= 4 &&
    result.xTCC == result.yTCC;

  let validPower =
    result.xySpreadPowerPercent < 0.02 || result.xySpreadPowerWatt < 1;
  return [
    ["Parameter", "Period X", "Period Y", "Spread/Criteria", "Notes"],
    [
      "Length",
      `${result.xDuration} (${result.xTCC} TCC)`,
      `${result.yDuration} (${result.yTCC} TCC)`,
      `${result.xyRatio}`,
      `(${validLength ? "OK" : "Fail"})0.8 to 1.25, >=4h, >= 4TCC`,
    ],
    [
      "Power W",
      `${result.xPower}`,
      `${result.yPower}`,
      `${result.xySpreadPowerPercent * 100}% and ${result.xySpreadPowerWatt}W`,
      `(${validPower ? "OK" : "Fail"}) < 2% or < 1W`,
    ],
    [
      "Fresh Food ℃",
      `${result.xUnfrozenTemp}`,
      `${result.yUnfrozenTemp}`,
      `${result.xySpreadUnfrozenTemp}`,
      `(${result.xySpreadFrozenTemp < 0.5 ? "OK" : "Fail"}) < 0.5 K`,
    ],
    [
      "Freezer ℃",
      `${result.xFrozenTemp}`,
      `${result.yFrozenTemp}`,
      `${result.xySpreadFrozenTemp}`,
      `(${result.xySpreadFrozenTemp < 0.5 ? "OK" : "Fail"}) < 0.5 K`,
    ],
  ];
}

export function workSheet3(result: SS2Result): any[] {
  let validLength =
    result.dfRatio >= 0.8 &&
    result.dfRatio <= 1.25 &&
    result.dTCC >= 3 &&
    result.fTCC >= 3 &&
    result.dDuration >= 3 &&
    result.fDuration >= 3 &&
    result.dTCC == result.fTCC;

  let validPower =
    result.dfSpreadPowerPercent < 0.02 || result.dfSpreadPowerWatt < 1;

  return [
    ["Parameter", "Period D", "Period F", "Spread/Criteria", "Notes"],
    [
      "Length",
      `${result.dDuration} (${result.dTCC} TCC)`,
      `${result.fDuration} (${result.fTCC} TCC)`,
      `${result.dfRatio}`,
      `(${validLength ? "OK" : "Fail"})0.8 to 1.25, >=3h, >= 3TCC`,
    ],
    [
      "Power W",
      `${result.dPower}`,
      `${result.fPower}`,
      `${result.dfSpreadPowerPercent * 100}% and ${result.dfSpreadPowerWatt}W`,
      `(${validPower ? "OK" : "Fail"}) < 2% or < 1W`,
    ],
    [
      "Fresh Food ℃",
      `${result.dUnfrozenTemp}`,
      `${result.fUnfrozenTemp}`,
      `${result.dfSpreadUnfrozenTemp}`,
      `(${result.dfSpreadFrozenTemp < 0.5 ? "OK" : "Fail"}) < 0.5 K`,
    ],
    [
      "Freezer ℃",
      `${result.dFrozenTemp}`,
      `${result.fFrozenTemp}`,
      `${result.dfSpreadFrozenTemp}`,
      `(${result.dfSpreadFrozenTemp < 0.5 ? "OK" : "Fail"}) < 0.5 K`,
    ],
  ];
}
