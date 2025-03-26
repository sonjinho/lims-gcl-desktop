// utils/chartUtils.ts
// @ts-nocheck
import { processData as downsampleProcessData } from "downsample-lttb";
import { ExcelData } from "./excel.utils";

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
};

export const convertExcelDataToChartData = (
  excelData: ExcelData,
  customMarkLines: number[] = [],
  maxPoints: number = 1000
) => {
  const headers = excelData[0].map(String);
  const dataRows = excelData.slice(2);
  const xAxisData = dataRows.map((row) => new Date(row[1]).getTime());
  const midnightLines = getMidnightLines(xAxisData);

  return {
    series: headers.slice(2).map((header, colIndex) => ({
      name: header,
      type: "line" as const,
      data: downsampleData(dataRows, xAxisData, colIndex, maxPoints),
      lineStyle: { color: getColor(colIndex), width: 0.7 },
      itemStyle: { color: getColor(colIndex) },
      symbol: "none" as const,
      triggerLineEvent: true,
      markLine: colIndex === 0 ? getMarkLineData(midnightLines, customMarkLines) : undefined,
    })),
  };
};

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
    return downsampleProcessData(rawData, maxPoints);
  } catch (error) {
    console.error("Downsampling failed:", error);
    return [];
  }
};

export const getMarkLineData = (midnightLines: number[], customMarkLines: number[]) => ({
  silent: true,
  symbol: ["none"],
  lineStyle: { type: "dashed", color: "#999" },
  data: [
    ...midnightLines.map((time) => ({
      xAxis: time,
      label: { show: true, formatter: () => formatDateTime(new Date(time)) },
    })),
    ...customMarkLines.map((time) => ({
      xAxis: time,
      lineStyle: { type: "dashed", color: "#FF5733" },
      symbol: ["none"],
      label: { show: true, formatter: () => formatDateTime(new Date(time)) },
    })),
  ],
});