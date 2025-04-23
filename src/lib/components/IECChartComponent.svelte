<script>
  import { exportToExcel } from "$lib/util/excel.utils";
  import IEC62552_ExportData, {
    IEC62552_ExportData_SS2,
  } from "$lib/util/iec.62552.3.util";
  import { convertToChartData } from "$lib/util/iec.chart.util";
  import * as echarts from "echarts";
  import {
    Button,
    ButtonGroup,
    Input,
    Label,
    Select,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";
  import { onDestroy, onMount } from "svelte";

  export let data;
  let chartContainer;
  let chartInstance;
  let isChartLoaded = false;

  const minDate = new Date(data[3][1]);
  const maxDate = new Date(data[data.length - 1][1]);
  const minDateStr = minDate.toISOString().slice(0, 16);
  const maxDateStr = maxDate.toISOString().slice(0, 16);
  let ssType = 0;
  let startTime = minDateStr;
  let endTime = maxDateStr;
  let numberOfTCC = 3;

  let exportRow = [];

  let ssItems = [
    {
      value: 0,
      name: "SS1",
    },
    {
      value: 1,
      name: "SS2",
    },
  ];

  function exportData() {
    console.log(ssType, startTime, endTime, numberOfTCC);
    if (ssType == 0) {
      exportRow = IEC62552_ExportData(
        data,
        new Date(startTime),
        new Date(endTime),
        numberOfTCC
      );
      exportToExcel(exportRow);
    } else {
      IEC62552_ExportData_SS2(
        data,
        new Date(startTime),
        new Date(endTime),
        numberOfTCC
      );
    }
  }
  function exportDataToExcel() {
    if (exportRow.length > 0) {
      // exportToExcel(
      //   IEC62552_ExportData(
      //     data,
      //     new Date(startTime),
      //     new Date(endTime),
      //     numberOfTCC
      //   )
      // );
    }
  }

  const handleResize = () => chartInstance?.resize();

  async function updateChart() {
    if (!chartContainer) {
      return;
    }

    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer);
    }

    const chartOption = await new Promise((resolve) => {
      setTimeout(() => {
        const result = convertToChartData(
          data,
          startTime,
          endTime,
          numberOfTCC,
          ssType
        );
        resolve(result);
      }, 0);
    });
    console.log("Render Chart");
    chartInstance.setOption(chartOption, true);
    isChartLoaded = true;
  }

  async function render() {
    isChartLoaded = false;
    await updateChart();
    isChartLoaded = true;
  }

  onMount(async () => {
    if (data && chartContainer) {
      isChartLoaded = false;
      await updateChart();
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

<div class="flex flex-wrap items-center justify-end gap-4 p-4">
  <div class="flex flex-col">
    <Label for="Type" class="text-sm font-semibold">
      Type
      <Select title="type" bind:value={ssType} items={ssItems} />
    </Label>
  </div>
  <!-- 시작 시간 -->
  <div class="flex flex-col">
    <Label for="start-time" class="text-sm font-semibold">
      Start Time
      <Input
        type="datetime-local"
        id="start-time"
        bind:value={startTime}
        min={minDateStr}
        max={maxDateStr}
      />
    </Label>
  </div>
  <!-- 종료 시간 -->
  <div class="flex flex-col">
    <Label for="end-time" class="text-sm font-semibold">
      End Time
      <Input
        type="datetime-local"
        id="end-time"
        bind:value={endTime}
        min={minDateStr}
        max={maxDateStr}
      />
    </Label>
  </div>
  <!-- 숫자 입력 -->
  <div class="flex flex-col">
    <Label for="tcc-count" class="text-sm font-semibold">
      Number of TCC
      <Input type="number" bind:value={numberOfTCC} />
    </Label>
  </div>
  <div class="flex flex-col justify-center items-center mt-5">
    <ButtonGroup>
      <Button onclick={render}>Render</Button>
    </ButtonGroup>
  </div>
  <!-- 버튼 -->
  <div class="flex flex-col justify-center items-center mt-5">
    <ButtonGroup>
      <Button onclick={exportData}>Verify</Button>
      <Button onclick={exportDataToExcel}>Export</Button>
    </ButtonGroup>
  </div>
</div>

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

{#if exportRow.length > 0 && ssType == 0}
  <div class="flex flex-wrap items-center justify-end gap-4 p-4">
    <div class="flex flex-col justify-center items-center mt-5">
      <ButtonGroup>
        <Button onclick={exportDataToExcel}>Export Date</Button>
      </ButtonGroup>
    </div>
  </div>
  <div>
    <Table>
      <TableHead>
        <TableHeadCell>Block A</TableHeadCell>
        <TableHeadCell>Block B</TableHeadCell>
        <TableHeadCell>Block C</TableHeadCell>
        <TableHeadCell>Unfrozen Period</TableHeadCell>
        <TableHeadCell>Frozen Period</TableHeadCell>
        <TableHeadCell>Power Period</TableHeadCell>
        <TableHeadCell>Total Period (A+B+C)</TableHeadCell>
        <TableHeadCell>Ambient Temperature</TableHeadCell>
        <TableHeadCell>Spread Unfrozen</TableHeadCell>
        <TableHeadCell>Spread Frozen</TableHeadCell>
        <TableHeadCell>Spread Power</TableHeadCell>
        <TableHeadCell>Slope Unfrozen</TableHeadCell>
        <TableHeadCell>Slope Frozen</TableHeadCell>
        <TableHeadCell>Slope Power</TableHeadCell>
        <TableHeadCell>Permitted Power Spread</TableHeadCell>
        <TableHeadCell>Valid</TableHeadCell>
        <TableHeadCell>Test Period Valid</TableHeadCell>
        <TableHeadCell>PSS</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each exportRow as row}
          <TableBodyRow>
            <TableBodyCell>{row.blockA}</TableBodyCell>
            <TableBodyCell>{row.blockB}</TableBodyCell>
            <TableBodyCell>{row.blockC}</TableBodyCell>
            <TableBodyCell>{row.testPeriodUnfrozen}</TableBodyCell>
            <TableBodyCell>{row.testPeriodFrozen}</TableBodyCell>
            <TableBodyCell>{row.testPeriodPower}</TableBodyCell>
            <TableBodyCell>{row.testPeriodABC}</TableBodyCell>
            <TableBodyCell>{row.ambientTemp}</TableBodyCell>
            <TableBodyCell>{row.spreadUnfrozen}</TableBodyCell>
            <TableBodyCell>{row.spreadFrozen}</TableBodyCell>
            <TableBodyCell>{row.spreadPower}</TableBodyCell>
            <TableBodyCell>{row.slopeUnfrozen}</TableBodyCell>
            <TableBodyCell>{row.slopeFrozen}</TableBodyCell>
            <TableBodyCell>{row.slopePower}</TableBodyCell>
            <TableBodyCell>{row.permittedPowerSpread}</TableBodyCell>
            <TableBodyCell>{row.valid ? "✅" : "❌"}</TableBodyCell>
            <TableBodyCell>{row.testPeriodValid ? "✅" : "❌"}</TableBodyCell>
            <TableBodyCell>{row.pss}</TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>
{/if}
