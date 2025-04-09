// utils/chartUtils.ts
// @ts-nocheck
import { ExcelData } from "./excel.utils";

const CYCLE_COLOR = "#00A8E8";
export const COLORS = [
  "rgb(75, 192, 192)",
  "rgb(255, 99, 132)",
  "rgb(54, 162, 235)",
  "rgb(255, 206, 86)",
  "rgb(153, 102, 255)",
  "rgb(255, 159, 64)",
  "rgb(0, 128, 0)",
  "rgb(255, 105, 180)",
  "rgb(0, 191, 255)",
  "rgb(255, 215, 0)",
  "rgb(138, 43, 226)",
  "rgb(50, 205, 50)",
  "rgb(255, 140, 0)",
  "rgb(70, 130, 180)",
  "rgb(220, 20, 60)",
  "rgb(123, 104, 238)",
  "rgb(34, 139, 34)",
  "rgb(218, 165, 32)",
  "rgb(186, 85, 211)",
  "rgb(30, 144, 255)",
  "rgb(255, 69, 0)",
  "rgb(147, 112, 219)",
  "rgb(60, 179, 113)",
  "rgb(255, 182, 193)",
  "rgb(135, 206, 235)",
  "rgb(244, 164, 96)",
  "rgb(106, 90, 205)",
  "rgb(154, 205, 50)",
  "rgb(255, 127, 80)",
  "rgb(64, 224, 208)",
  "rgb(221, 160, 221)",
  "rgb(250, 128, 114)",
  "rgb(95, 158, 160)",
  "rgb(240, 230, 140)",
  "rgb(100, 149, 237)",
  "rgb(144, 238, 144)",
  "rgb(255, 228, 181)",
  "rgb(176, 224, 230)",
  "rgb(219, 112, 147)",
  "rgb(32, 178, 170)",
  "rgb(238, 130, 238)",
  "rgb(173, 216, 230)",
  "rgb(255, 250, 205)",
  "rgb(143, 188, 143)",
  "rgb(240, 128, 128)",
];

export const getMidnightLines = (xAxisData: number[]): number[] => {
  const uniqueMidnights = new Set<number>();
  xAxisData.forEach((timestamp) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    uniqueMidnights.add(date.getTime());
  });
  return Array.from(uniqueMidnights).sort((a, b) => a - b);
};

export const getColor = (index: number): string => {
  return COLORS[index % COLORS.length];
};

export const formatDateTime = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
    date.getSeconds()
  ).padStart(2, "0")}`;
};

export const convertExcelDataToChartData = (
  excelData: ExcelData,
  customMarkLines: number[] = [],
  maxPoints: number = 1000
) => {
  const start = new Date();

  const units = excelData[1].map(String);
  const headers = excelData[0].map(String);
  const unitMap: Record<string, string> = {};
  headers.forEach((header, index) => {
    unitMap[header] = units[index];
  });
  const dataRows = excelData.slice(2);

  const powerIndex = headers.findIndex((header) => header.toLocaleLowerCase() == "power");
  // console.log(powerIndex, headers)

  const xAxisData = dataRows.map((row) => new Date(row[1]).getTime());
  // console.log(xAxisData);
  const powerData = dataRows.map((row) => Number(row[powerIndex]) || 0);
  const midnightLines = getMidnightLines(xAxisData);

  // console.log("unitMap:", unitMap);

  // 기본 시리즈 데이터 (기존 데이터)
  const series = headers.slice(2).map((header, colIndex) => {
    const unit = unitMap[header];
    const isPowerUnit = unit !== "℃";

    return {
      name: header,
      type: "line" as const,
      data: dataRows.map((row, rowIndex) => [
        xAxisData[rowIndex],
        Number(row[colIndex + 2]) || 0,
      ]),
      lineStyle: { color: getColor(colIndex), width: 0.7 },
      itemStyle: { color: getColor(colIndex) },
      symbol: "none" as const,
      triggerLineEvent: true,
      yAxisIndex: isPowerUnit ? 1 : 0,
    };
  });

  // "baseline" 시리즈 추가
  const baselineSeries = {
    name: "baseline",
    type: "line" as const,
    data: [], // 실제 데이터는 없고 markLine만 사용
    lineStyle: { color: "#999" },
    itemStyle: { color: "#999" },
    symbol: "none" as const,
    markLine: getMarkLineData(midnightLines, customMarkLines),
    yAxisIndex: 0, // 필요에 따라 조정 가능
  };

  const cycleSeries = {
    name: "cycle",
    type: "line" as const,
    data: [],
    lineStye: { color: CYCLE_COLOR },
    itemStyle: { color: CYCLE_COLOR },
    symbol: "none" as const,
    markLine: getCycleDashedData(powerData, xAxisData),
    yAxisIndex: 1,
  };

  console.log(
    "Finish PreProcessing: " + (new Date().getTime() - start.getTime()) + "ms"
  );
  return {
    series: [baselineSeries, cycleSeries, ...series], // 기존 시리즈에 baseline 추가
    unitMap,
  };
};

export const getCycleDashedData = (
  powerData: any[], // powerData는 Excel 데이터의 한 열로 가정
  timeData: number[],
  threshold: number = 30
) => {
  const markLines: any[] = [];
  const set = new Set();

  // powerData와 timeData의 길이가 동일하다고 가정
  for (let i = 0; i < powerData.length - 6; i++) {
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
    // 조건 2: currentPower가 nextPower(i+2)보다 threshold 이상 작을 때
    if (currentPower < nextPower2 - threshold) {
      if (
        set.has(i - 1) ||
        set.has(i - 2) ||
        set.has(i - 3) ||
        set.has(i - 4) ||
        set.has(i - 5)
      ) {
        continue;
      }
      markLines.push({
        xAxis: timeData[i], // 해당 시점에 markLine 추가
        lineStyle: { type: "dashed", color: CYCLE_COLOR, width: 1 }, // 굵기 조정
        symbol: ["none", "none"],
        symbolSize: [0, 0],
        label: {
          show: false,
          formatter: () => formatDateTime(new Date(timeData[i])),
        },
      });
      set.add(i);
    }
  }

  return {
    silent: true,
    symbol: ["none"],
    lineStyle: { type: "dashed", color: CYCLE_COLOR, width: 1 }, // 기본 스타일에서 굵기 조정
    data: markLines,
  };
};

export const getMarkLineData = (
  midnightLines: number[],
  customMarkLines: number[]
) => ({
  silent: true,
  symbol: ["none"],
  lineStyle: { type: "dashed", color: "#999" },
  data: [
    ...midnightLines.map((time) => ({
      xAxis: time,
      label: {
        show: true,
        formatter: () => formatDateTime(new Date(time)),
      },
    })),
    ...customMarkLines.map((time) => ({
      xAxis: time,
      lineStyle: { type: "dashed", color: CYCLE_COLOR },
      symbol: ["none"],
      label: {
        show: true,
        formatter: () => formatDateTime(new Date(time)),
      },
    })),
  ],
});

const downsampleData = (
  dataRows: any[],
  xAxisData: number[],
  colIndex: number,
  maxPoints: number
) => {
  const rawData = dataRows.map((row, rowIndex) => [
    xAxisData[rowIndex],
    Number(row[colIndex + 2]) || 0,
  ]);

  try {
    return rawData;
    // return downsampleProcessData(rawData, maxPoints);
  } catch (error) {
    console.error("Downsampling failed:", error);
    return [];
  }
};
