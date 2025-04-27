import { get } from "svelte/store";
import { selectedStore } from "../store/selectedStore";
import type { ExcelData } from "./excel.utils";
import type { SS2Result } from "./iec.62552.3.ss2.util";
import IEC62552_ExportData, {
  detectDefrostRecovery,
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

const enum SERIES_NAME {
  TCC = "TCC",
  PERIOD_X = "PERIOD X",
  PERIOD_Y = "PERIOD Y",
  PERIOD_D = "PERIOD D",
  PERIOD_F = "PERIOD F",
  PERIOD_DF = "PERIOD DF",
  PERIOD_XY = "PERIOD XY",
  NOMINAL = "NOMINAL",
}
const getColor = (index: number): string => {
  return COLORS[index % COLORS.length];
};

export function convertToChartDataManual(
  
) {

}
export function convertToChartData(
  excelData: ExcelData,
  startTime: string,
  endTime: string,
  cycleData: CycleData[],
  ssType: number = 0
) {


  const config = get(selectedStore);
  const headers = excelData[0].map(String);
  const units = excelData[1].map(String);
  const unitMap: Record<string, string> = {};
  headers.forEach((header, index) => {
    unitMap[header] = units[index];
  });

  const POWER_NAME = excelData[0][config.power] as string;
  const rawData = excelData.slice(2);
  const xAxisData = rawData.map((row) =>
    new Date(row[config.xAxis] as string).getTime()
  );

  const powerData = rawData.map((row) => Number(row[config.power]) || 0);

  const midngihtLines = getMidnightLines(xAxisData);

  let series = seriesData(headers, rawData, xAxisData, unitMap);
  const baselineSeries = getBaseLineSeries(midngihtLines);
  const cycleDashedSeries = getCycleDashedData(cycleData, xAxisData);
  const defrostDashedSeries = getDefrostDashedData(
    cycleData,
    powerData,
    xAxisData
  );

  console.log(defrostDashedSeries);

  let chartSeries: any[] = [];
  let periodXTooltip = "";
  let periodYTooltip = "";
  let periodDTooltip = "";
  let periodFTooltip = "";

  if (ssType == 1) {
    const result: SS2Result | null = IEC62552_ExportData_SS2(
      excelData,
      new Date(startTime),
      new Date(endTime)
    );
    if (result) {
      const periodX = drawSinglePeriodData(
        SERIES_NAME.PERIOD_X,
        xAxisData,
        result.ss2.PeriodX,
        6
      );

      periodXTooltip += `TimeDuration: ${result.periodD.duration}h <br/>`;
      periodXTooltip += `Power: ${result.periodD.power}W <br/>`;
      periodXTooltip += `UnFrozen Temperature: ${result.periodD.unfrozenTemp}℃ <br/>}`;
      periodXTooltip += `Frozen Temperature: ${result.periodD.frozenTemp}℃ <br/>`;

      const periodY = drawSinglePeriodData(
        SERIES_NAME.PERIOD_Y,
        xAxisData,
        result.ss2.PeriodY,
        6
      );
      periodYTooltip += `TimeDuration: ${result.periodF.duration}h <br/>`;
      periodYTooltip += `Power: ${result.periodF.power}W <br/>`;
      periodYTooltip += `UnFrozen Temperature: ${result.periodF.unfrozenTemp}℃ <br/>`;
      periodYTooltip += `Frozen Temperature: ${result.periodF.frozenTemp}℃ <br/>`;

      const periodD = drawSinglePeriodData(
        SERIES_NAME.PERIOD_D,
        xAxisData,
        result.ss2.PeriodD,
        7
      );
      periodDTooltip += `TimeDuration: ${result.periodX.duration}h <br/>`;
      periodDTooltip += `&Delta;Edf: ${result.Edf} Wh <br/>`;
      periodDTooltip += `&Delta;Unfrozen Thdf: ${result.Thdf.evaluateFrozen} <br/>`;
      periodDTooltip += `&Delta;Frozen Thdf: ${result.Thdf.evaluateFrozen} <br/>`;

      const periodF = drawSinglePeriodData(
        SERIES_NAME.PERIOD_F,
        xAxisData,
        result.ss2.PeriodF,
        7
      );
      periodFTooltip += `TimeDuration: ${result.periodY.duration}h <br/>`;
      periodFTooltip += `Power: ${result.periodY.power}W <br/>`

      const nominal = drawSinglePeriodData(
        SERIES_NAME.NOMINAL,
        xAxisData,
        [result.ss2.NominalDefrostRecoveryIndex],
        1
      );

      //@ts-ignore
      series = [periodD, periodF, periodX, periodY, nominal, ...series];
    }
  }
  chartSeries = [
    ...chartSeries,
    baselineSeries,
    cycleDashedSeries,
    defrostDashedSeries,
    ...series,
  ];

  const legendData = chartSeries.map((s, index) => ({
    name: s.name,
    selected: index < 8 || s.name == POWER_NAME,
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
        // tooltipStr += "Index #" + params[0].dataIndex + "<br/>";
        // if (params.length > 0) {
        //   const targetIndex = params[0].dataIndex;

        //   let closestKey = null;
        //   for (let i = cycleKeys.length - 1; i >= 0; i--) {
        //     if (cycleKeys[i] <= targetIndex) {
        //       closestKey = cycleKeys[i];
        //       break;
        //     }
        //   }

        //   if (closestKey !== null) {
        //     tooltipStr += "TCC: " + cycleDataIndex.get(closestKey) + "<br/>";
        //   } else {
        //     tooltipStr += "TCC: X<br/>";
        //   }
        // }
        params.forEach((param) => {
          const seriesName = param.seriesName;
          const value = param.value[1];
          const unit = unitMap[seriesName] || "";
          switch (seriesName) {
            case SERIES_NAME.PERIOD_X:
              tooltipStr += periodXTooltip;
              break;
            case SERIES_NAME.PERIOD_Y:
              tooltipStr += periodYTooltip;
              break;
            case SERIES_NAME.PERIOD_D:
              tooltipStr += periodDTooltip;
              break;
            case SERIES_NAME.PERIOD_F:
              tooltipStr += periodFTooltip;
              break;
            case SERIES_NAME.PERIOD_XY:
            case SERIES_NAME.PERIOD_DF:
              tooltipStr += `${seriesName}: ${value} ${param.dataIndex}<br/>`;
              break;
            case SERIES_NAME.TCC:
              tooltipStr += `${param.marker} TCC: #${param.dataIndex}<br/>`;
              break;
            default:
              tooltipStr += `${param.marker} ${seriesName}: ${value} ${unit}<br/>`;
              break;
          }
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
      label: {
        show: true,
        formatter: () => `${cycle.count}`,
      },
    };
  });

  return {
    name: SERIES_NAME.TCC,
    type: "line",
    silent: true,
    symbol: "none",
    data: cycleData.map((tcc) => [xAxisData[tcc.index], 0]),
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

function drawSinglePeriodData(
  header: string,
  xAxisData: number[],
  periodData: number[],
  colorIndex: number = 2
) {
  return {
    name: header,
    type: "line",
    data: xAxisData
      .filter(
        (value, index) => periodData[0] <= index && periodData[1] >= index
      )
      .map((value) => [value, 20 + colorIndex]),
    markLine: {
      symbol: "none",
      data: periodData.map((value) => ({
        xAxis: xAxisData[value],
        label: {
          show: true,
          formatter: () => convertToTimeFormat(new Date(xAxisData[value])),
        },
      })),
      lineStyle: {
        color: getColor(colorIndex),
        type: "dashed",
        width: 2,
      },
    },
    lineStyle: {
      color: getColor(colorIndex),
      width: 1,
      type: "solid",
    },
    triggerLineEvent: true,
    itemStyle: {
      color: getColor(colorIndex),
      width: 1,
      type: "solid",
    },
    symbol: "none",
    yAxisIndex: 0, // 또는 1
  };
}

function drawPeriodData(
  header: string,
  xAxisData: number[],
  periodData: number[],
  colorIndex: number = 2
) {
  return {
    name: header,
    type: "line",
    data: periodData.map((value) => [xAxisData[value], 0]),
    markLine: {
      symbol: "none",
      data: periodData.map((value) => ({
        xAxis: xAxisData[value],
        label: {
          show: true,
          formatter: () => convertToTimeFormat(new Date(xAxisData[value])),
        },
      })),
      lineStyle: {
        color: getColor(colorIndex),
        type: "dashed",
        width: 2,
      },
    },
    lineStyle: {
      color: getColor(colorIndex),
      width: 1,
      type: "solid",
    },
    triggerLineEvent: true,
    itemStyle: {
      color: getColor(colorIndex),
      width: 1,
      type: "solid",
    },
    symbol: "none",
    yAxisIndex: 0, // 또는 1
  };
}
const getDefrostDashedData = (
  cycleData: CycleData[],
  powerData: number[],
  xAxisData: number[]
) => {
  const indexes: number[] = detectDefrostRecovery(powerData, cycleData);
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
