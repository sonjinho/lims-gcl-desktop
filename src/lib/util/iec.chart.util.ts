import { get } from "svelte/store";
import { selectedStore } from "../store/selectedStore";
import type { ExcelData } from "./excel.utils";
import { detectDefrostRecovery, type SS2 } from "./iec.62552.3.ss2.util";
import IEC62552_ExportData, {
  getCycleData,
  IEC62552_ExportData_SS2,
} from "./iec.62552.3.util";
import type { CycleData } from "./iec.util";

const COLORS = [
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

const getColor = (index: number): string => {
  return COLORS[index % COLORS.length];
};

export function convertToChartData(
  excelData: ExcelData,
  startTime: string,
  endTime: string,
  numberOfTCC: number = 3,
  ssType: number = 0
) {
  // console.log(startTime, endTime, numberOfTCC, ssType);
  // console.log(new Date(startTime), new Date(endTime), numberOfTCC, ssType);
  const exportRow = IEC62552_ExportData(
    excelData,
    new Date(startTime),
    new Date(endTime),
    numberOfTCC
  );

  


  const config = get(selectedStore);
  const headers = excelData[0].map(String);
  const units = excelData[1].map(String);
  const unitMap: Record<string, string> = {};
  headers.forEach((header, index) => {
    unitMap[header] = units[index];
  });

  const rawData = excelData.slice(2);
  const xAxisData = rawData.map((row) =>
    new Date(row[config.xAxis] as string).getTime()
  );
  const cycleData = getCycleData(
    rawData,
    new Date(startTime),
    new Date(endTime),
    config
  );

  const powerData = rawData.map((row) => Number(row[config.power]) || 0);

  const midngihtLines = getMidnightLines(xAxisData);

  const series = seriesData(headers, rawData, xAxisData, unitMap);
  const baselineSeries = getBaseLineSeries(midngihtLines);
  const cycleDashedSeries = getCycleDashedData(cycleData, xAxisData);
  const defrostDashedSeries = getDefrostDashedData(
    cycleData,
    powerData,
    xAxisData
  );

  console.log(defrostDashedSeries);
  let chartSeries = [
    baselineSeries,
    cycleDashedSeries,
    defrostDashedSeries,
    ...series,
  ];

  // const result: SS2 | null = IEC62552_ExportData_SS2(
  //   excelData,
  //   new Date(startTime),
  //   new Date(endTime),
  //   numberOfTCC
  // );

  // if (result) {
  //   // not null
  //   result.PeriodD
  //   let period = [...result.PeriodD, ...result.PeriodF, ...result.PeriodX, ...result.PeriodY, result.NominalDefrostRecoveryIndex];
  // }

  const legendData = chartSeries.map((s, index) => ({
    name: s.name,
    selected: index < 8,
  }));
  let cycleDataIndex: Map<number, number> = new Map<number, number>();
  cycleData.forEach((cycle, index) => {
    cycleDataIndex.set(cycle.index, index);
  });

  const cycleKeys = Array.from(cycleDataIndex.keys()).sort((a, b) => a - b);

  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        const date = new Date(params[0].axisValue);
        const timeStr = convertToTimeFormat(date);

        let tooltipStr = `${timeStr}<br/>`;
        if (params.length > 0) {
          const targetIndex = params[0].dataIndex;

          let closestKey = null;
          for (let i = cycleKeys.length - 1; i >= 0; i--) {
            if (cycleKeys[i] <= targetIndex) {
              closestKey = cycleKeys[i];
              break;
            }
          }

          if (closestKey !== null) {
            tooltipStr += "TCC: " + cycleDataIndex.get(closestKey) + "<br/>";
          } else {
            tooltipStr += "TCC: X<br/>";
          }
        }
        params.forEach((param) => {
          const seriesName = param.seriesName;
          const value = param.value[1];
          const unit = unitMap[seriesName] || "";
          tooltipStr += `${param.marker} ${seriesName}: ${value} ${unit}<br/>`;
        });
        return tooltipStr;
      },
    },
    legend: {
      data: legendData.map((s) => s.name),
      selected: Object.fromEntries(legendData.map((d) => [d.name, d.selected])),
      type: "scroll",
      top: 0,
    },
    toolbox: {
      feature: {
        restore: { title: "Reset" },
      },
      right: 20,
    },
    xAxis: {
      type: "time",
      axisLabel: {
        formatter: (value: any) => {
          const date = new Date(value);
          return convertToTimeFormat(date);
        },
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Temperature (℃)",
        position: "left",
        min: -30,
        max: 40,
      },
      {
        type: "value",
        name: "Power (W, Wh)",
        position: "right",
        min: 0,
        max: 600,
      },
    ],
    dataZoom: [
      { type: "slider", xAxisIndex: 0, start: 0, end: 100 },
      { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
    ],
    series: chartSeries,
    large: true,
    animation: false,
  };
  return option;
}

const getCycleDashedData = (cycleData: CycleData[], xAxisData: number[]) => {
  let markLineData = cycleData.map((cycle, index) => {
    return {
      xAxis: xAxisData[cycle.index],
      lineStyle: { type: "dashed", color: "#888", width: 0.7 },
      symbol: "none",
      tooltip: {
        trigger: "axis",
        show: true,
        formatter: (params: any[]) => {
          console.log(params);
          return "TCC " + index;
        },
      },
      label: {
        show: false,
        formatter: () => convertToTimeFormat(new Date(xAxisData[cycle.index])),
      },
    };
  });

  return {
    name: "TCC",
    type: "line",
    silent: true,
    symbol: "none",
    data: [],
    markLine: {
      silent: true,
      symbol: "none",
      data: markLineData,
    },
    yAxisIndex: 0,
  };
};
function getBaseLineSeries(midngihtLines: number[]) {
  return {
    name: "baseline",
    type: "line" as const,
    data: [],
    lineStyle: { color: "#999" },
    itemStyle: { color: "#999" },
    symbol: "none" as const,
    markLine: {
      silent: true,
      symbol: "none",
      lineStyle: { type: "dashed", color: "#999" },
      data: midngihtLines.map((time) => ({
        xAxis: time,
        label: {
          show: true,
          formatter: () => convertToTimeFormat(new Date(time)),
        },
      })),
    },
    yAxisIndex: 0,
  };
}

function seriesData(
  headers: string[],
  rawData: ExcelData,
  xAxisData: number[],
  unitMap: Record<string, string>
) {
  return headers.slice(2).map((header, colIndex) => {
    const unit = unitMap[header];
    const isPowerUnit = unit !== "℃";
    return {
      name: header,
      type: "line" as const,
      data: rawData.map((row, rowIndex) => [
        xAxisData[rowIndex],
        Number(row[colIndex + 2]) || 0,
      ]),
      lineStyle: { color: getColor(colIndex), width: 0.5 },
      itemStyle: { color: getColor(colIndex) },
      symbol: "none",
      triggerLineEvent: true,
      yAxisIndex: isPowerUnit ? 1 : 0,
    };
  });
}

const getDefrostDashedData = (
  cycleData: CycleData[],
  powerData: number[],
  xAxisData: number[]
) => {
  const indexes: number[] = detectDefrostRecovery(cycleData, powerData);
  console.log(indexes);
  return {
    name: "Defrost Cycle Index",
    type: "line",
    silent: true,
    symbol: "none",
    data: [],
    yAxisIndex: 1,
    markLine: {
      silent: true,
      symbol: "none",
      data: indexes.map((index) => {
        return {
          xAxis: xAxisData[index],
          lineStyle: { type: "dashed", color: "rgb(255, 99, 132)", width: 1.0 },
          symbol: "none",
          label: {
            show: false,
            formatter: () => convertToTimeFormat(new Date(xAxisData[index])),
          },
        };
      }),
    },
  };
};

const getMidnightLines = (xAxisDate: number[]): number[] => {
  const uniqueMidnights = new Set<number>();
  xAxisDate.forEach((timestamp) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    uniqueMidnights.add(date.getTime());
  });
  return Array.from(uniqueMidnights).sort((a, b) => a - b);
};

function convertToTimeFormat(date: Date) {
  const hours = date.getHours() % 12 || 12;
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  return `${
    date.getMonth() + 1
  }/${date.getDate()}/${date.getFullYear()} ${hours}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")} ${ampm}`;
}
