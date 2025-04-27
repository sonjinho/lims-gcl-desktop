<script>
  import { selectedStore } from "$lib/store/selectedStore";
  import { exportSS2ToExcel, exportToExcel } from "$lib/util/excel.utils";
  import { PeriodBlock } from "$lib/util/iec.62552.3.ss2.util";
  import IEC62552_ExportData, {
    getCycleData,
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
    Toggle,
  } from "flowbite-svelte";
  import { CircleMinusSolid, CirclePlusSolid } from "flowbite-svelte-icons";
  import { onDestroy, onMount } from "svelte";

  export let data;
  let chartContainer;
  let chartInstance;
  let isChartLoaded = false;

  const config = $selectedStore;
  const minDate = new Date(data[3][config.xAxis]);
  const maxDate = new Date(data[data.length - 1][config.xAxis]);
  const minDateStr = toLocalDatetimeString(minDate);
  const maxDateStr = toLocalDatetimeString(maxDate);

  function toLocalDatetimeString(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  }
  // set default 0
  let mode = 1;
  let ssType = 0;
  let startTime = minDateStr;
  let endTime = maxDateStr;
  let numberOfTCC = 3;
  let editTarget = 1;

  let cycleData = [];
  let periodBlocks = [new PeriodBlock()];
  let timeData = [];
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
      let ss2Result = IEC62552_ExportData_SS2(
        data,
        new Date(startTime),
        new Date(endTime)
      );
      if (ss2Result) {
        exportSS2ToExcel(ss2Result);
      }
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

  async function submitManual() {
    if (mode == 0) {
      return;
    }

    await updateChart();



  }

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
          cycleData,
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
    console.log(startTime, endTime);
    const rawData = data.slice(2);

    cycleData = getCycleData(
      rawData,
      new Date(startTime),
      new Date(endTime),
      config
    );

    timeData = rawData.map((row) => new Date(row[config.xAxis]));
    console.log(cycleData);
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

  function addRow(currentIndex) {
    const newRow = { index: cycleData[currentIndex].index + 1, count: 0 };
    // 현재 인덱스 다음에 새로운 행 삽입
    cycleData = [
      ...cycleData.slice(0, currentIndex + 1),
      newRow,
      ...cycleData.slice(currentIndex + 1).map((row) => ({
        ...row,
        index: row.index + 1, // 이후 행들의 index를 1씩 증가
      })),
    ];
  }

  function deleteRow(index) {
    cycleData = cycleData
      .filter((_, i) => i !== index) // 해당 인덱스의 행 제거
      .map((row) => ({
        ...row,
        index: row.index > cycleData[index].index ? row.index - 1 : row.index, // 삭제된 행 이후의 index를 1씩 감소
      }));
  }

  function addPeriodBlock(index) {
    const newBlock = {
      periodD: { start: 0, end: 0 },
      periodF: { start: 0, end: 0 },
      periodX: { start: 0, end: 0 },
      periodY: { start: 0, end: 0 },
      defrostRecoveryIndex: 0,
      nominalDefrostRecoveryIndex: 0,
      lastPeriod: false
    };
    periodBlocks = [
      ...periodBlocks.slice(0, index + 1),
      newBlock,
      ...periodBlocks.slice(index + 1)
    ];
  }

  // PeriodBlock 삭제
  function deletePeriodBlock(index) {
    if (periodBlocks.length > 1) {
      periodBlocks = periodBlocks.filter((_, i) => i !== index);
    }
  }
  
</script>

<div class="flex flex-wrap items-center justify-end gap-4 p-4">
  <div class="flex flex-col">
    <Label for="mode" class="text-sm font-semibold">
      Mode
      <Select
        title="mode"
        bind:value={mode}
        items={[
          { value: 0, name: "Auto" },
          { value: 1, name: "Manual" },
        ]}
      />
    </Label>
  </div>
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
      <Button onclick={exportData}>Verify</Button>
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

{#if mode == 1}
  <div class="flex flex-wrap items-center justify-end gap-4 p-4">
    <div class="flex flex-col">
      <Select
        bind:value={editTarget}
        items={[
          {
            value: 0,
            name: "TCC",
          },
          {
            value: 1,
            name: "Period - SS2",
          },
        ]}
      />
    </div>
    <div class="flex flex-col">
      <Button onclick={()=>{submitManual();}}>Submit</Button>
    </div>
  </div>
  {#if editTarget == 0}
    <Table>
      <TableHead>
        <TableHeadCell>
          <p>Time Index</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>#TCC</p>
        </TableHeadCell>
        <TableHeadCell>Time</TableHeadCell>
        <TableHeadCell>Action</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each cycleData as cycle, index}
          <TableBodyRow>
            <TableBodyCell>
              <Input type="number" bind:value={cycle.index} step="1" />
            </TableBodyCell>
            <TableBodyCell>
              <p>{index}</p>
            </TableBodyCell>
            <TableBodyCell>
              <p>{timeData[cycle.index]?.toISOString() ?? "N/A"}</p>
            </TableBodyCell>
            <TableBodyCell>
              <ButtonGroup>
                <Button onclick={() => addRow(index)}>
                  <CirclePlusSolid />
                </Button>
                <Button onclick={() => deleteRow(index)}>
                  <CircleMinusSolid />
                </Button>
              </ButtonGroup>
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  {:else if editTarget == 1}
    {#each periodBlocks as block, index}
    <h3 class="font-semibold">Block {index + 1}</h3>
    <div class="flex justify-end">
      <ButtonGroup>
        <Button onclick={()=>{addPeriodBlock(index)}}><CirclePlusSolid/></Button>
        <Button onclick={()=>{deletePeriodBlock(index)}}><CircleMinusSolid/></Button>
      </ButtonGroup>
    </div>
      <Table>
        <TableHead>
          <TableHeadCell>Target</TableHeadCell>
          <TableHeadCell>Start Index</TableHeadCell>
          <TableHeadCell>Start Time</TableHeadCell>
          <TableHeadCell>End Index</TableHeadCell>
          <TableHeadCell>End Time</TableHeadCell>
        </TableHead>
        <TableBody>
          <TableBodyRow>
            <TableBodyCell>Period X</TableBodyCell>
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodX.start} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodX.start]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodX.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodX.end]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell>Period Y</TableBodyCell>
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodY.start} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodY.start]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodY.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodY.end]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell>Period D</TableBodyCell>
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodD.start} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodD.start]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodD.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodD.end]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell>Period F</TableBodyCell>
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodF.start} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodF.start]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodF.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {timeData[block.periodF.end]?.toISOString() ?? "N/A"}
              </p></TableBodyCell
            >
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell>
              <Label>
                Last Defrost
                <Toggle bind:value={block.lastPeriod} class="my-4"/>
              </Label>
            </TableBodyCell>
            <TableBodyCell>
              <Label>
                Defrost Recovery Index
                <Input
                  type="number"
                  step="1"
                  bind:value={block.defrostRecoveryIndex}
                />
              </Label>
            </TableBodyCell>
            <TableBodyCell>
              <p>
                {timeData[block.defrostRecoveryIndex]?.toISOString() ?? "N/A"}
              </p>
            </TableBodyCell>
            <TableBodyCell>
              <Label>
                Nominal Defrost Recovery Index
                <Input
                  type="number"
                  step="1"
                  bind:value={block.nominalDefrostRecoveryIndex}
                />
              </Label>
            </TableBodyCell>
            <TableBodyCell>
              <p>
                {timeData[block.nominalDefrostRecoveryIndex]?.toISOString() ?? "N/A"}
              </p>
            </TableBodyCell>
            
          </TableBodyRow>
        </TableBody>
      </Table>
    {/each}
  {/if}
{/if}
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
