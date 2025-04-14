<script>
  import {
    convertExcelDataToChartData,
    getMarkLineData,
    getMidnightLines,
  } from "$lib/util/chart.util.js";
  import * as echarts from "echarts";
  import { onDestroy, onMount } from "svelte";
  import ExportData from "./ExportData.svelte";

  export let data;
  
  let chartContainer;
  let chartInstance;
  let customMarkLines = [];
  let xAxisData = [];
  let unitMap = {};
  let isChartLoaded = false;

  const handleResize = () => chartInstance?.resize();

  async function updateChart() {
    if (!chartContainer) {
      console.error("Chart container is not ready yet");
      return;
    }

    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer);
    }

    // 비동기적으로 데이터 변환 처리
    const chartData = await new Promise((resolve) => {
      setTimeout(() => {
        const result = convertExcelDataToChartData(
          data,
          customMarkLines,
          data.length
        );
        resolve(result);
      }, 0); // 메인 스레드에서 벗어나도록 setTimeout 사용
    });

    const { series } = chartData;
    unitMap = chartData.unitMap;
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
      selected: index < 7,
    }));

    const option = {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
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
            const unit = unitMap[seriesName] || "";
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
      series,
      large: true,
      animation: false,
    };

    chartInstance.setOption(option, true);
    
    isChartLoaded = true; // 모든 작업 완료 후 로드 상태 업데이트
  }

  onMount(async () => {
    if (data && chartContainer) {
      isChartLoaded = false; // 로딩 시작
      await updateChart(); // 비동기 작업 대기
      window.addEventListener("resize", handleResize);
    }
  });

  onDestroy(() => {
    window.removeEventListener("resize", handleResize);
    if (chartInstance) {
      chartInstance.dispose();
    }
  });
</script>

<ExportData analyzeData={data} />

<div class="h-screen w-full relative" style="zoom: 100% !important;">
  <div bind:this={chartContainer} class="h-full w-full"></div>
  {#if !isChartLoaded}
    <div
      class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75"
    >
      <p class="text-lg font-semibold">Loading...</p>
    </div>
  {/if}
</div>