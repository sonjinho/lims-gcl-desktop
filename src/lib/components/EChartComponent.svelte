<script>
  import {
    convertExcelDataToChartData,
    getMarkLineData,
    getMidnightLines,
  } from "$lib/utils/chart.util.js";
  import * as echarts from "echarts";
  import { onDestroy, onMount } from "svelte";

  export let data;
  let chartContainer;
  let chartInstance;
  let customMarkLines = [];
  let xAxisData = []; // X축 데이터를 캐싱

  const handleResize = () => chartInstance?.resize();

  const handleDoubleClick = (event) => {
    event.event.preventDefault();
    const pointInPixel = [event.offsetX, event.offsetY];
    const pointInGrid = chartInstance.convertFromPixel(
      { seriesIndex: 0 },
      pointInPixel
    );

    if (chartInstance.containPixel("grid", pointInPixel)) {
      const clickedTime = pointInGrid[0];
      const nearestTime = findNearestValue(clickedTime, xAxisData); // 가장 가까운 값 찾기
      customMarkLines.push(nearestTime);
      updateMarkLines();
    }
  };

  // 가장 가까운 값을 찾는 함수
  const findNearestValue = (target, values) => {
    return values.reduce((prev, curr) =>
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
  };

  function updateChart() {
    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer);
    }

    const { series } = convertExcelDataToChartData(
      data,
      customMarkLines,
      10000
    );
    xAxisData = data.slice(2).map((row) => new Date(row[1]).getTime()); // 캐싱

    const legendData = series.map((s, index) => ({
      name: s.name,
      selected: index < 5,
    }));

    const option = {
      tooltip: { trigger: "axis" },
      legend: {
        data: series.map((s) => s.name),
        selected: Object.fromEntries(
          legendData.map((item) => [item.name, item.selected])
        ),
        orient: "vertical",
        right: 10,
        top: 40,
        bottom: 20, // legend를 아래로 이동
      },
      toolbox: {
        feature: {
          restore: { title: "Reset" }, // 초기화 버튼 추가
        },
        right: 20, // toolbox 위치 조정 (오른쪽 여백)
      },
      xAxis: {
        type: "time",
        name: "Date Time",
        axisLabel: {
          formatter: (value) => {
            const date = new Date(value);
            const hours = date.getHours() % 12 || 12;
            const ampm = date.getHours() >= 12 ? "PM" : "AM";
            return `${
              date.getMonth() + 1
            }/${date.getDate()}/${date.getFullYear()} ${hours}:${String(
              date.getMinutes()
            ).padStart(
              2,
              "0"
            )}:${String(date.getSeconds()).padStart(2, "0")} ${ampm}`;
          },
        },
      },
      yAxis: { type: "value", name: "Values" },
      dataZoom: [
        { type: "slider", xAxisIndex: 0, start: 0, end: 100 },
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
      ],
      series,
      large: true,
      animation: false,
    };

    chartInstance.setOption(option, true);
  }

  function updateMarkLines() {
    if (!chartInstance || !data) return;

    const midnightLines = getMidnightLines(xAxisData);
    const markLineData = getMarkLineData(midnightLines, customMarkLines);

    chartInstance.setOption({
      series: [{ markLine: markLineData }],
    });
  }

  onMount(() => {
    if (data) {
      updateChart();
      window.addEventListener("resize", handleResize);
      chartInstance.getZr().on("dblclick", handleDoubleClick);
    }
  });

  onDestroy(() => {
    window.removeEventListener("resize", handleResize);
    if (chartInstance) {
      chartInstance.getZr().off("dblclick", handleDoubleClick);
      chartInstance.dispose();
    }
  });
</script>

<div bind:this={chartContainer} style="width: 100%; height: 800px;"></div>
