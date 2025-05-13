import { chartYAxisStore } from "$lib/store/chartYAxisStore";
import { selectedStore } from "$lib/store/selectedStore";
import * as echarts from "echarts";
import { get } from "svelte/store";
import type { ExcelData } from "../excel.utils";
import type { CycleData } from "../iec.62552.3.util";
import { convertToTimeFormat, getColor, SERIES_NAME } from "../iec.chart.util";

export function storageTemperatureChartOption(
  excelData: ExcelData,
  cycleData: CycleData[]
): echarts.EChartsCoreOption {
  const config = get(selectedStore);
  const headers = excelData[0].map(String);
  const rawData = excelData.slice(2);
  const yAxisStore = get(chartYAxisStore);

  const POWER_NAME = excelData[0][config.power] as string;

  const xAxisData = rawData.map((row) =>
    new Date(row[config.xAxis] as string).getTime()
  );

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

  const zoomIndex = yAxisStore.yAxis
    .filter((axis) => axis.zoom)
    .map((axis, index) => index);
  const tccSeries = getCycleDashedData(cycleData, xAxisData);
  const chartSeries = seriesData(headers, rawData, xAxisData, yAxisMap);
  const series = [tccSeries, ...chartSeries];
  const legendData = series.map((s, index) => ({
    name: s.name,
    selected:
      s.name !== excelData[0][config.integPower] &&
      (index < 8 || s.name == POWER_NAME),
  }));
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        label: {
          margin: 10,
        },
      },
      formatter: (params:any[]) => {
        let tooltipStr = "";
        tooltipStr +=
          "data Index: " +
          params.filter((param) => param.seriesName == POWER_NAME)[0]
            .dataIndex +
          "<br/>";
        return tooltipStr;
      },
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
    series,
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
    animation:false,
  } as echarts.EChartsOption;
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
