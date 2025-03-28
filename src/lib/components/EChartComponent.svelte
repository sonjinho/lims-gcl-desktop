<script>
  import {
    convertExcelDataToChartData,
    getMidnightLines,
    getMarkLineData,
  } from "$lib/utils/chart.util.js";
  import * as echarts from "echarts";
  import { onDestroy, onMount } from "svelte";

  export let data;
  let chartContainer;
  let chartInstance;
  let customMarkLines = [];
  let xAxisData = [];
  let unitMap = {}; // 단위 맵을 컴포넌트 수준에서 저장

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
      const nearestTime = findNearestValue(clickedTime, xAxisData);
      customMarkLines.push(nearestTime);
      updateMarkLines();
    }
  };

  const findNearestValue = (target, values) => {
    return values.reduce((prev, curr) =>
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
  };

  function updateChart() {
    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer);
    }

    const chartData = convertExcelDataToChartData(
      data,
      customMarkLines,
      data.length
    );
    const { series } = chartData;
    unitMap = chartData.unitMap; // convertExcelDataToChartData에서 unitMap 가져오기
    xAxisData = data.slice(2).map((row) => {
      const parsedDate = new Date(row[1]);
      if (isNaN(parsedDate.getTime())) {
        console.error(`Invalid date: ${row[1]}`);
        return 0;
      }
      return parsedDate.getTime();
    });

    const legendData = series.map((s, index) => ({
      name: s.name,
      selected: index < 5,
    }));

    const option = {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          // params는 배열이며, 각 series의 데이터 포함
          const date = new Date(params[0].axisValue);
          const hours = date.getHours() % 12 || 12;
          const ampm = date.getHours() >= 12 ? "PM" : "AM";
          const timeStr = `${
            date.getMonth() + 1
          }/${date.getDate()}/${date.getFullYear()} ${hours}:${String(
            date.getMinutes()
          ).padStart(
            2,
            "0"
          )}:${String(date.getSeconds()).padStart(2, "0")} ${ampm}`;

          let tooltipStr = `${timeStr}<br/>`;
          params.forEach((param) => {
            const seriesName = param.seriesName;
            const value = param.value[1];
            const unit = unitMap[seriesName] || ""; // 단위 가져오기
            tooltipStr += `${param.marker} ${seriesName}: ${value} ${unit}<br/>`;
          });
          return tooltipStr;
        },
      },
      legend: {
        data: series.map((s) => s.name),
        selected: Object.fromEntries(
          legendData.map((item) => [item.name, item.selected])
        ),
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
      yAxis: [
        {
          type: "value",
          name: "Temperature (℃)",
          position: "left",
          min: -30,
          max: 30,
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
<div class="container bg-background text-foreground">
  <div class="grid grid-cols-3 gap-6">
    <p>Block A</p>
    <p>Block B</p>
    <p>Block C</p>
  </div>
  <input type="text" />
</div>

<div bind:this={chartContainer} style="width: 100%; height: 800px;"></div>
