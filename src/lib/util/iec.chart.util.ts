import { chartYAxisStore } from "$lib/store/chartYAxisStore";
import { get } from "svelte/store";
import { isValidTV, selectedStore } from "../store/selectedStore";
import type { ExcelData } from "./excel.utils";
import {
  runSS2_manual,
  SS2Result,
} from "./iec.62552.3.ss2.util";
import { type CycleData, type PeriodBlock } from '$lib/types/period';
import { type Tdf } from "./iec.62552.3.util";

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

export const enum SERIES_NAME {
  TCC = "TCC",
  PERIOD_X = "PERIOD X",
  PERIOD_Y = "PERIOD Y",
  PERIOD_D = "PERIOD D",
  PERIOD_F = "PERIOD F",
  PERIOD_DF = "PERIOD DF",
  PERIOD_XY = "PERIOD XY",
  NOMINAL = "NOMINAL",
}
export const getColor = (index: number): string => {
  return COLORS[index % COLORS.length];
};

export function convertToChartData(
  excelData: ExcelData,
  cycleData: CycleData[],
  periodBlocks: PeriodBlock[],
  ssType: number = 0,
  selectedIndex: number = -1
) {
  const config = get(selectedStore);
  const yAxisStore = get(chartYAxisStore);
  const headers = excelData[0].map(String);
  const units = excelData[1].map(String);
  // complete   this
  const yAxisMap: Record<string, number> = Object.fromEntries(
    yAxisStore.series.map(({ header, yAxis }) => [
      header,
      yAxis % yAxisStore.yAxis.length,
    ])
  );

  const yAxis = yAxisStore.yAxis.map((axis, index) => {
    return {
      type: "value",
      name: axis.name,
      position: "left" /* index == 0 ? "left" : "right" */,
      min: axis.min,
      max: axis.max,
      axisLine: {
        show: true,
        lineStyle: {
          color: getColor(axis.color),
        },
      },
      offset: 60 * index,
      axisLabel: {
        formatter: (val: any) => `${val}`,
        rotate: 45,
      },
    };
  });

  const POWER_NAME = excelData[0][config.power] as string;
  const rawData = excelData.slice(2);
  const xAxisData = rawData.map((row) =>
    new Date(row[config.xAxis] as string).getTime()
  );

  const midnightLines = getMidnightLines(xAxisData);

  let series = seriesData(headers, rawData, xAxisData, yAxisMap);
  const baselineSeries = getBaseLineSeries(midnightLines);
  const cycleDashedSeries = getCycleDashedData(
    cycleData,
    xAxisData,
  );
  const defrostDashedSeries = getDefrostRecoveryData(
    periodBlocks.map((block) => block.defrostRecoveryIndex),
    xAxisData,
    10
  );

  // console.log(defrostDashedSeries);

  let chartSeries: any[] = [];
  let periodXTooltip = "";
  let periodYTooltip = "";
  let periodDTooltip = "";
  let periodFTooltip = "";

  if (periodBlocks.length > 0) {
    let nonLastBlock = [];
    nonLastBlock = periodBlocks
      .filter(
      (periodBlock) => periodBlock.checked
    );

    let chartSS2Result = runSS2_manual(rawData, cycleData, nonLastBlock);
    let periodX = ssType != 0 ? drawSinglePeriodData(
      SERIES_NAME.PERIOD_X,
      xAxisData,
      nonLastBlock
        .map((periodBlock) => periodBlock.periodX)
        .map((period) => [period.start, period.end])
        .flat(),
      6
    ) : null;

    let periodY = ssType  != 0 ? drawSinglePeriodData(
      SERIES_NAME.PERIOD_Y,
      xAxisData,
      nonLastBlock
        .map((periodBlock) => periodBlock.periodY)
        .map((period) => [period.start, period.end])
        .flat(),
      6
    ) : null;

    const periodD = drawSinglePeriodData(
      SERIES_NAME.PERIOD_D,
      xAxisData,
      nonLastBlock
        .map((periodBlock) => periodBlock.periodD)
        .map((period) => [period.start, period.end])
        .flat(),
      7
    );

    const periodF = drawSinglePeriodData(
      SERIES_NAME.PERIOD_F,
      xAxisData,
      nonLastBlock
        .map((periodBlock) => periodBlock.periodF)
        .map((period) => [period.start, period.end])
        .flat(),
      7
    );

    const nominal = getDefrostRecoveryData(
      nonLastBlock.map(
        (periodBlock) => periodBlock.nominalDefrostRecoveryIndex
      ),
      xAxisData,
      9
    );
    if (chartSS2Result != null && chartSS2Result) {
      if (ssType !=0) {
        periodXTooltip = getXYTooltip(chartSS2Result);
        periodYTooltip = periodXTooltip;
      }
      periodDTooltip = getDFTooltip(chartSS2Result);
      periodFTooltip = getDFTooltip(chartSS2Result);
    }

    if (ssType == 0) {
      //@ts-ignore
      series = [periodD, periodF, nominal, ...series];
    } else  {
      //@ts-ignore
      series = [periodD, periodF, periodX, periodY, nominal, ...series];
    }
  }

  if (selectedIndex > 0 && selectedIndex < xAxisData.length) {
    const selectedSeries = selectedLine(xAxisData[selectedIndex]);
    chartSeries = [...chartSeries, selectedSeries];
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

  const zoomIndex = yAxisStore.yAxis
    .filter((axis) => axis.zoom)
    .map((axis, index) => index);

  const option = {
    grid: {
      left: "15%", // 또는 '5px', 0 등으로 줄일 수 있음
      right: "5%",
      // top: 0,
      // bottom: 0,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        label: {
          margin: 10,
        },
      },
      formatter: triggerFormat(
        POWER_NAME,
        cycleData,
        periodXTooltip,
        periodYTooltip,
        periodDTooltip,
        periodFTooltip
      ),
    },
    legend: {
      data: legendData.map((s) => s.name),
      selected: Object.fromEntries(legendData.map((d) => [d.name, d.selected])),
      type: "scroll",
      orient: "horizontal", // 수평 배치
      top: 0,
      width: "50%", // 컨테이너 너비의 50%로 설정
      height: 60, // 두 줄에 맞는 높이 설정 (항목 높이와 간격에 따라 조정)
      align: "auto",
      itemGap: 10, // 항목 간 간격
      itemHeight: 14, // 범례 항목의 높이 (기본값 14)
      pageButtonPosition: "end", // 스크롤 버튼 위치
      pageButtonGap: 10, // 스크롤 버튼과 항목 간 간격
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
    yAxis,
    dataZoom: [
      { type: "slider", xAxisIndex: zoomIndex, start: 0, end: 100 },
      { type: "inside", xAxisIndex: zoomIndex, start: 0, end: 100 },
      {
        type: "slider",
        yAxisIndex: zoomIndex,
        start: 0,
        end: 100,
      },
      {
        type: "inside",
        yAxisIndex: zoomIndex,
        start: 0,
        end: 100,
      },
    ],
    series: chartSeries,
    large: true,
    animation: false,
  };
  return option;
}

const getCycleDashedData = (
  cycleData: CycleData[],
  xAxisData: number[],
) => {
  let markLineData = cycleData
    .map((cycle, index) => {
      return {
        xAxis: xAxisData[cycle.index],
        lineStyle: { type: "dashed", color: "#888", width: 0.7 },
        symbol: "none",
        label: {
          show: true,
          formatter: () => `${cycle.count +1}`,
        },
      };
    });

  return {
    name: SERIES_NAME.TCC,
    type: "line",
    silent: true,
    symbol: "none",
    data: cycleData
      .map((tcc) => [xAxisData[tcc.index], 0]),
    markLine: {
      silent: true,
      symbol: "none",
      data: markLineData,
    },
    yAxisIndex: 0,
  };
};
function triggerFormat(
  POWER_NAME: string,
  cycleData: CycleData[],
  periodXTooltip: string,
  periodYTooltip: string,
  periodDTooltip: string,
  periodFTooltip: string
) {
  return (params: any[]) => {
    const date = new Date(params[0].axisValue);
    const timeStr = convertToTimeFormat(date);

    let tooltipStr = `${timeStr}<br/>`;

    let selectedParam = params.filter(
      (param) => param.seriesName == POWER_NAME
    )[0];
    if (selectedParam) {
      tooltipStr +=
        "data Index: " +
        params.filter((param) => param.seriesName == POWER_NAME)[0].dataIndex +
        "<br/>";
    }
    if (selectedParam) {
      let dataIndex = selectedParam.dataIndex;
      for (let i = 0; i < cycleData.length; i++) {
        if (cycleData[i].index > dataIndex) {
          if (i == 0) {
            break;
          }
          tooltipStr += `TCC: ${cycleData[i - 1].count + 1}, index: ${
            cycleData[i - 1].index
          } <br/>`;
          break;
        }
      }
    }

    params.forEach((param) => {
      const seriesName = param.seriesName;
      const value = param.value[1];

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
          tooltipStr += `${param.marker} ${seriesName}: ${value}<br/>`;
          break;
      }
    });
    return tooltipStr;
  };
}

function selectedLine(index: number) {
  return {
    name: "selected",
    type: "line",
    data: [],
    lineStyle: { color: "rgb(255,0,0)" },
    itemStyle: { color: "rgb(255,0,0)" },
    symbol: "none",
    markLine: {
      silent: true,
      symbol: "none",
      lineStyle: { type: "dashed", color: "rgb(255,0,0)" },
      data: [index].map((time) => ({
        xAxis: time,
        label: {
          show: true,
          formatter: () => convertToTimeFormat(new Date(time)),
        },
      })),
    },
    triggerLineEvent: true,
    yAxisIndex: 0,
  };
}
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
  yAxisMap: Record<string, number>
) {
  return headers.slice(2).map((header, colIndex) => {
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
      yAxisIndex: yAxisMap[header] ?? 0,
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
      .filter((value, index) => {
        let rtn = false;
        for (let i = 0; i < periodData.length; i += 2) {
          if (periodData[i] <= index && periodData[i + 1] >= index) {
            rtn = true;
            break;
          }
        }
        return rtn;
      })
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

const getDefrostRecoveryData = (
  indexes: number[],
  xAxisData: number[],
  colorIndex: number = 7
) => {
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
          lineStyle: {
            type: "dashed",
            color: getColor(colorIndex),
            width: 1.0,
          },
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

export function convertToTimeFormat(date: Date) {
  if (!date) {
    return "";
  }
  const hours = date.getHours() % 12 || 12;
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  return `${
    date.getMonth() + 1
  }/${date.getDate()}/${date.getFullYear()} ${hours}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")} ${ampm}`;
}

function getXYTooltip(result: SS2Result): string {
  let tooltipStr = "";
  tooltipStr += `Duration X: ${result.xDuration}h <br/>`;
  tooltipStr += `Duration Y: ${result.yDuration}h <br/>`;
  tooltipStr += `Number of TCC X: ${result.xTCC} <br/>`;
  tooltipStr += `Number of TCC Y: ${result.yTCC} <br/>`;
  tooltipStr += `Ratio XY: ${result.xyRatio} <br/>`;
  tooltipStr += `Unfrozen Temp X: ${result.xUnfrozenTemp}℃ <br/>`;
  tooltipStr += `Unfrozen Temp Y: ${result.yUnfrozenTemp}℃ <br/>`;
  tooltipStr += `Spread Unfrozen Temp: ${result.xySpreadUnfrozenTemp} K <br/>`;
  tooltipStr += `Frozen Temp X: ${result.xFrozenTemp}℃ <br/>`;
  tooltipStr += `Frozen Temp Y: ${result.yFrozenTemp}℃ <br/>`;
  tooltipStr += `Spread Frozen Temp: ${result.xySpreadFrozenTemp} K <br/>`;
  tooltipStr += `Power X: ${result.xPower}W <br/>`;
  tooltipStr += `Power Y: ${result.yPower}W <br/>`;
  tooltipStr += `Spread Power#1: ${result.xySpreadPowerPercent * 100}% <br/>`;
  tooltipStr += `Spread Power#2: ${result.xySpreadPowerWatt}W <br/>`;
  tooltipStr += `Energy X-Y: ${result.xyEnergy}Wh <br/>`;
  tooltipStr += `PSS2: ${result.PSS2} <br/>`;
  tooltipStr += `Edf: ${result.Edf} <br/>`;
  tooltipStr += `PSS: ${result.PSS} <br/>`;

  tooltipStr += `<br/>`;
  return tooltipStr;
}

function getDFTooltip(result: SS2Result): string {
  let tooltipStr = "";
  tooltipStr += `Duration D: ${result.dDuration}h <br/>`;
  tooltipStr += `Duration F: ${result.fDuration}h <br/>`;
  tooltipStr += `Number of TCC D: ${result.dTCC} <br/>`;
  tooltipStr += `Number of TCC F: ${result.fTCC} <br/>`;
  tooltipStr += `Ratio DF: ${result.dfRatio} <br/>`;
  tooltipStr += `D - Nominal Duration: ${result.dNominalDuration}h <br/>`;
  tooltipStr += `F - Nominal Duration: ${result.fNominalDuration}h <br/>`;
  tooltipStr += `D - Unfrozen Temp: ${result.dUnfrozenTemp}℃ <br/>`;
  tooltipStr += `F - Unfrozen Temp: ${result.fUnfrozenTemp}℃ <br/>`;
  tooltipStr += `Spread Unfrozen Temp: ${result.dfSpreadUnfrozenTemp} K <br/>`;
  tooltipStr += `D - Frozen Temp: ${result.dFrozenTemp}℃ <br/>`;
  tooltipStr += `F - Frozen Temp: ${result.fFrozenTemp}℃ <br/>`;
  tooltipStr += `Spread Frozen Temp: ${result.dfSpreadFrozenTemp} K <br/>`;
  tooltipStr += `Power D: ${result.dPower}W <br/>`;
  tooltipStr += `Power F: ${result.fPower}W <br/>`;
  tooltipStr += `Spread Power#1: ${result.dfSpreadPowerPercent * 100}% <br/>`;
  tooltipStr += `Spread Power#2: ${result.dfSpreadPowerWatt}W <br/>`;
  tooltipStr += `${printTdf(result.Thdf, "Thdf-")}<br/>`;
  tooltipStr += `${printTdf(result.TSS2, "TSS2-")}<br/>`;

  tooltipStr += `<br/>`;
  return tooltipStr;
}

function printTdf(tdf: Tdf, prefix: string = "", postfix: string = "<br/>") {
  let str = "";
  const config = get(selectedStore);
  if (isValidTV(config.freshFood)) {
    str += prefix + "Fresh Food: " + tdf.freshFood + postfix;
  }
  if (isValidTV(config.cellar)) {
    str += prefix + "Cellar: " + tdf.cellar + postfix;
  }
  if (isValidTV(config.pantry)) {
    str += prefix + "Pantry: " + tdf.pantry + postfix;
  }
  if (isValidTV(config.wineStorage)) {
    str += prefix + "Wine Storage: " + tdf.wineStorage + postfix;
  }
  if (isValidTV(config.chill)) {
    str += prefix + "Chill: " + tdf.chill + postfix;
  }
  if (isValidTV(config.frozenZeroStar)) {
    str += prefix + "Frozen Zero Star: " + tdf.frozenZeroStar + postfix;
  }
  if (isValidTV(config.frozenOneStar)) {
    str += prefix + "Frozen One Star: " + tdf.frozenOneStar + postfix;
  }
  if (isValidTV(config.frozenTwoStar)) {
    str += prefix + "Frozen Two Star: " + tdf.frozenTwoStar + postfix;
  }
  if (isValidTV(config.frozenThreeStar)) {
    str += prefix + "Frozen Three Star: " + tdf.frozenThreeStar + postfix;
  }
  if (isValidTV(config.frozenFourStar)) {
    str += prefix + "Frozen Four Star: " + tdf.frozenFourStar + postfix;
  }

  return str;
}
