import * as XLSX from "xlsx";
import { converter, type ExcelData } from "./excel.utils";
import { ExportRow, runSS1_manual } from "./iec.62552.3.ss1.util";
import {
  runSS2_manual,
  SS2Result,
  type PeriodBlock,
} from "./iec.62552.3.ss2.util";
import type { CycleData } from "./iec.62552.3.util";

export function exportSS1Excel(
  originalData: ExcelData,
  cycleData: CycleData[],
  timeData: Date[],
  periodBlocks: PeriodBlock[],
  numberOfTCC: number,
  fileName: string = "SS1_Export.xlsx"
) {
  const wb = XLSX.utils.book_new();
  const ws0 = workSheet0(originalData);
  const header: string[] = originalData[0] as string[];
  const unit: string[] = originalData[1] as string[];
  const rawData = originalData.slice(2);
  const exportRows: ExportRow[] = runSS1_manual(
    rawData,
    timeData,
    cycleData,
    numberOfTCC
  );

  const ws1 = workSheet1(header, unit, rawData, cycleData);
  const ws2 = workSheet2(exportRows);
  const ws3 = workSheet3(header, unit, rawData, cycleData, periodBlocks);
  XLSX.utils.book_append_sheet(wb, ws0, "Raw Data");
  XLSX.utils.book_append_sheet(wb, ws1, "TCC");
  XLSX.utils.book_append_sheet(wb, ws2, `B.3.2 ${numberOfTCC}TCC`);
  XLSX.utils.book_append_sheet(wb, ws3, `C 3.2`);
  XLSX.writeFile(wb, fileName);
}

function workSheet0(originalData: ExcelData) {
  return XLSX.utils.aoa_to_sheet(originalData);
}
function workSheet1(
  header: string[],
  unit: string[],
  rawData: ExcelData,
  cycleData: CycleData[]
) {
  let workSheetData: any[][] = [
    ["TCC", ...header],
    ["", ...unit],
  ];

  let result: any[][] = rawData.map((row) => ["", ...row]);
  for (const cycle of cycleData) {
    const index = cycle.index;
    const count = cycle.count;

    // rawData[index]에 TCC${count} 삽입
    if (index >= 0 && index < rawData.length) {
      result[index][0] = [`TCC${count + 1}`];
    }

    // rawData[index - 1]에 TCC${count - 1}.1 삽입
    if (count >= 1) {
      result[index - 1][0] = [`TCC${count}.1`];
    }
  }
  workSheetData = [...workSheetData, ...result];
  return XLSX.utils.aoa_to_sheet(workSheetData);
}

function workSheet2(exportRow: ExportRow[]) {
  let pss1 = 0;
  let tss1Unfrozen = 0;
  let tss2frozen = 0;
  let tssRt = 0;
  const selectedRow = exportRow.filter((row) => row.pss != 0);
  if (selectedRow.length == 1) {
    pss1 = selectedRow[0].pss;
    tss1Unfrozen = selectedRow[0].testPeriodUnfrozen;
    tss2frozen = selectedRow[0].testPeriodFrozen;
    tssRt = selectedRow[0].ambientTemp;
  }
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
  const workSheet = XLSX.utils.aoa_to_sheet([
    ["Pss1 no correction", "=", pss1, "W"],
    ["TSS1 Unfrozen", "=", tss1Unfrozen, "°C"],
    ["TSS2 Frozen", "=", tss2frozen, "°C"],
    ["TSS RT", "=", tssRt, "°C"],
    header,
    unit,
    ...exportRow.map(converter),
  ]);
  return workSheet;
}
function workSheet3(
  header: string[],
  unit: string[],
  rawData: ExcelData,
  cycleData: CycleData[],
  periodBlocks: PeriodBlock[]
) {
  let workSheetData: any[][] = [
    ["Note", "TCC", ...header],
    ["", "", ...unit],
  ];

  let result: any[][] = rawData.map((row) => ["","", ...row]);
  for (const cycle of cycleData) {
    const index = cycle.index;
    const count = cycle.count;

    // rawData[index]에 TCC${count} 삽입
    if (index >= 0 && index < rawData.length) {
      result[index][1] = [`TCC${count +1}`];
    }

    // rawData[index - 1]에 TCC${count - 1}.1 삽입
    if (count >= 1) {
      result[index - 1][1] = [`TCC${count}.1`];
    }
  }
  let previousDefrost = 0;
  let previousDuration = 0;
  for (const block of periodBlocks) {
    let periodDStart = block.periodD.start;
    let periodDEnd = block.periodD.end;
    let periodFStart = block.periodF.start;
    let periodFEnd = block.periodF.end;
    let heaterOn = block.heaterOn;
    let recovery = block.defrostRecoveryIndex;
    let nominalDefrost = block.nominalDefrostRecoveryIndex;

    if (block.checked && periodDEnd > 1 && periodFEnd > 1) {
      result[periodDStart][0] = "D start";
      result[periodDEnd][0] = "D end";
      result[periodFStart][0] = "F start";
      result[periodFEnd][0] = "F end";
    }

    if (heaterOn != 0) {
      result[heaterOn][0] = "Heater On";
    }
    if (recovery !=0) {
      result[recovery][0] = "Recovery";
    }
    if (nominalDefrost !=0) {
      result[nominalDefrost][0] = "Nominal Defrost Recovery";
    }
  }

  const ss2Result: SS2Result | null = runSS2_manual(
    rawData,
    cycleData,
    periodBlocks
  );
  let ResultBlock:any[][] = [];
  if (ss2Result != null) {
    ResultBlock = [
      [
        "",
        "",
        "Number Of TCC in D period",
        "Number Of TCC in F Period",
        "Length Of D",
        "Length Of F",
        "∆t D1",
        "∆t F1",
        "Spread Unfrozen Temp",
        "Spread Frozen Temp",
        "Spread of Power",
        "Spread of Power",
        "Ration D & F",
        "Time from D to previous heater on",
        "",
        `∆Edf`,
        `∆Thdr`,
        `∆Thdf`,
        `∆Tdf32`
      ],
      ["", "", "", "h", "h", "h", "h", "K", "K", "W", "%", "",  "h", "","","Wh","Kh","Kh","h"],
      [
        "",
        "Permitted",
        ">=3",
        ">=3",
        ">=3",
        ">=3",
        ">=3",
        ">=3",
        "< 0.5",
        "<0.5",
        "1",
        "<2%",
        "0.8 ~ 1.25",
        ">=5",
        "",
        ss2Result.Edf,
        ss2Result.Thdf.evaluateUnfrozen,
        ss2Result.Thdf.evaluateFrozen
      ],
      [
        "",
        "",
        ss2Result.dTCC,
        ss2Result.fTCC,
        ss2Result.dDuration,
        ss2Result.fDuration,
        ss2Result.dNominalDuration,
        ss2Result.fNominalDuration,
        ss2Result.dfSpreadUnfrozenTemp,
        ss2Result.dfSpreadFrozenTemp,
        ss2Result.dfSpreadPowerWatt,
        ss2Result.dfSpreadPowerPercent * 100,
        ss2Result.dfRatio,
        ss2Result.previousDefrostPeriodDDuration,
      ],
    ];
  }

  workSheetData = [...ResultBlock, ...workSheetData, ...result];
  return XLSX.utils.aoa_to_sheet(workSheetData);
}
function workSheet4() {}
