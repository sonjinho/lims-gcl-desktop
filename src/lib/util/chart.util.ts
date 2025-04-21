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

  const powerIndex = headers.findIndex(
    (header) => header.toLocaleLowerCase() == "power"
  );
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

  let detectSeries = getCycleDashedData(powerData, xAxisData);
  const cycleSeries = {
    name: "cycle",
    type: "line" as const,
    data: [],
    lineStyle: { color: CYCLE_COLOR, width: 0.1 },
    itemStyle: { color: CYCLE_COLOR },
    symbol: "none" as const,
    markLine: detectSeries[0],
    yAxisIndex: 1,
  };

  const defrostRecoverySeries = {
    name: "DefrostRecovery",
    type: "line" as const,
    data: [],
    symbol: "none" as const,
    lineStyle: { color: "rgb(255, 99, 132)", width: 0.1 },
    markLine: detectSeries[1],
    yAxisIndex: 0,
  };

  console.log(
    "Finish PreProcessing: " + (new Date().getTime() - start.getTime()) + "ms"
  );
  return {
    series: [baselineSeries, cycleSeries, defrostRecoverySeries, ...series], // 기존 시리즈에 baseline 추가
    unitMap,
  };
};

function detectCycleData(dateTimeData: Date[], powerData: number[]) {
  const set = new Set();

  let cycleData = [];
  let count = 0;
  let threshold = 20;

  for (let i = 0; i < dateTimeData.length - 6; i++) {
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

    if (currentPower > 3) {
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
        max: -1,
      });
    }
  }
  return cycleData;
}

export const getCycleDashedData = (
  powerData: any[], // powerData는 Excel 데이터의 한 열로 가정
  timeData: number[],
) => {
  const set = new Set();

  let cycleData = detectCycleData(timeData, powerData);

  let defrostRecoveryPeriod = [];

  for (let i = 1; i < cycleData.length - 1; i++) {
    let index = i - 1;
    let maxIndex = 0;

    const beforeCycle = cycleData[index];
    const currentCycle = cycleData[i];
    const nextCycle = cycleData[i + 1];

    if (beforeCycle.max == -1) {
      let max = -1;
      for (let j = beforeCycle.index; j < currentCycle.index; j++) {
        if (max < powerData[j]) {
          max = powerData[j];
        }
      }
      beforeCycle.max = max;
    }

    if (currentCycle.max == -1) {
      let max = -1;
      for (let j = currentCycle.index; j < nextCycle.index; j++) {
        if (max < powerData[j]) {
          max = powerData[j];
          maxIndex = j;
        }
      }
      currentCycle.max = max;
    }

    if (beforeCycle.max * 1.5 < currentCycle.max) {
      defrostRecoveryPeriod.push(maxIndex);
    }
  }

  let series = [];

  let markLineData = cycleData.map((cycle) => {
    return {
      xAxis: timeData[cycle.index],
      lineStyle: { type: "dashed", color: CYCLE_COLOR, width: 1 }, // 굵기 조정
      symbol: ["none", "none"],
      symbolSize: [0, 0],
      label: {
        show: false,
        formatter: () => formatDateTime(new Date(timeData[i])),
      },
    };
  });

  series.push({
    silent: true,
    symbol: ["none"],
    lineStyle: { type: "dashed", color: CYCLE_COLOR, width: 0.1 }, // 기본 스타일에서 굵기 조정
    data: markLineData,
  });

  let defrostRecoverySeries = defrostRecoveryPeriod.map((index) => {
    return {
      xAxis: timeData[index],
      lineStyle: { type: "dashed", color: "rgb(255, 99, 132)", width: 1 }, // 굵기 조정
      symbol: ["none", "none"],
      symbolSize: [0, 0],
      label: {
        show: false,
        formatter: () => formatDateTime(new Date(timeData[index])),
      },
    };
  });

  series.push({
    silent: true,
    symbol: ["none"],
    lineStyle: { type: "dashed", color: "rgb(255, 99, 132)", width: 0.1 }, // 기본 스타일에서 굵기 조정
    data: defrostRecoverySeries,
  })

  return series;
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
