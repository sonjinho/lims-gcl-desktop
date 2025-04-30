<script>
  import { selectedStore } from "$lib/store/selectedStore";
  import {
    exportSS1ToExcel,
    exportSS2ToExcelPeriodBlock,
  } from "$lib/util/excel.utils";
  import { runSS1_manual } from "$lib/util/iec.62552.3.ss1.util";
  import {
    getAutoDefrostRecoveryPeriod,
    PeriodBlock,
  } from "$lib/util/iec.62552.3.ss2.util";
  import { getCycleData } from "$lib/util/iec.62552.3.util";
  import {
    convertToChartData,
    convertToTimeFormat,
  } from "$lib/util/iec.chart.util";
  import * as echarts from "echarts";
  import {
    Button,
    ButtonGroup,
    Input,
    Label,
    Radio,
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
  import EditChartModal from "./EditChartModal.svelte";

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

  let selectedIndex = 0;
  // set default 0
  let mode = 0;
  let ssType = 0;
  let startTime = minDateStr;
  let endTime = maxDateStr;
  let numberOfTCC = 3;
  let editTarget = 0;
  let open = false;
  let rawData = [];
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
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      exportSS1ToExcel(
        rawData,
        cycleData.filter(
          (cycle) =>
            startDate.getTime() <= cycle.dateTime.getTime() &&
            cycle.dateTime.getTime() <= endDate.getTime()
        ),
        timeData,
        numberOfTCC
      );
    } else {
      exportSS2ToExcelPeriodBlock(rawData, cycleData, periodBlocks);
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

    console.log(periodBlocks);
    const chartOption = await new Promise((resolve) => {
      setTimeout(() => {
        const result = convertToChartData(
          data,
          startTime,
          endTime,
          cycleData,
          periodBlocks,
          ssType,
          selectedIndex
        );
        resolve(result);
      }, 0);
    });
    console.log("Render Chart");
    chartInstance.setOption(chartOption, true);
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    exportRow = runSS1_manual(
      rawData,
      timeData,
      cycleData.filter(
        (cycle) =>
          startDate.getTime() <= cycle.dateTime.getTime() &&
          cycle.dateTime.getTime() <= endDate.getTime()
      ),
      numberOfTCC
    );
    isChartLoaded = true;
  }

  async function render() {
    isChartLoaded = false;
    await updateChart();
    isChartLoaded = true;
  }

  onMount(async () => {
    console.log(startTime, endTime);
    rawData = data.slice(2);

    cycleData = getCycleData(
      rawData,
      new Date(startTime),
      new Date(endTime),
      config
    );

    timeData = rawData.map((row) => new Date(row[config.xAxis]));

    periodBlocks = getAutoDefrostRecoveryPeriod(rawData, cycleData, config);
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
    const newRow = {
      index: cycleData[currentIndex].index,
      count: cycleData[currentIndex].count + 1,
    };
    // 현재 인덱스 다음에 새로운 행 삽입
    cycleData = [
      ...cycleData.slice(0, currentIndex + 1),
      newRow,
      ...cycleData.slice(currentIndex + 1).map((row) => ({
        ...row,
        index: row.index, // 이후 행들의 index를 1씩 증가
        count: row.count + 1
      })),
    ];
  }

  function deleteRow(index) {
    cycleData = cycleData
      .filter((_, i) => i !== index) // 해당 인덱스의 행 제거
      .map((row) => ({
        ...row,
        count: row.count > cycleData[index].count ? row.count - 1 : row.count, // 삭제된 행 이후의 index를 1씩 감소
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
      lastPeriod: false,
    };
    periodBlocks = [
      ...periodBlocks.slice(0, index + 1),
      newBlock,
      ...periodBlocks.slice(index + 1),
    ];
  }

  // PeriodBlock 삭제
  function deletePeriodBlock(index) {
    if (periodBlocks.length > 1) {
      periodBlocks = periodBlocks.filter((_, i) => i !== index);
    }
  }

  function handleModal() {
    open=false;
    updateChart();
  }
</script>

<div class="flex justify-end">
  <ButtonGroup>
    <Button
      onclick={() => {
        open = true;
      }}>Edit chart</Button
    >
  </ButtonGroup>
</div>
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
<div class="flex flex-wrap items-center justify-end gap-4 p-4">
  <div class="flex justify-end">
    <Input type="number" step="1" bind:value={selectedIndex} />
  </div>
  <div class="flex justify-end">
    <ButtonGroup>
      <Button
        onclick={() => {
          updateChart();
        }}>Show</Button
      >
    </ButtonGroup>
  </div>
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
      <Button
        onclick={() => {
          submitManual();
        }}>Submit</Button
      >
    </div>
  </div>
  {#if editTarget == 0 && timeData.length > 0}
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
              <Input
                type="number"
                bind:value={cycle.index}
                step="1"
                onchange={() => {
                  cycle.dateTime = timeData[cycle.index];
                  cycle.count = index;
                }}
              />
            </TableBodyCell>
            <TableBodyCell>
              <p>{index}</p>
            </TableBodyCell>
            <TableBodyCell>
              <p>{convertToTimeFormat(timeData[cycle.index])}</p>
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
  {:else if editTarget == 1 && periodBlocks.length > 0 && timeData.length > 0}
    {#each periodBlocks as block, index}
      <h3 class="font-semibold">
        <Radio
          name="select"
          onclick={() => {
            periodBlocks.forEach((periodBlock, i) => {
              periodBlock.checked = i == index;
            });
          }}
          bind:checked={block.checked}
        >
          Block {index + 1}</Radio
        >
      </h3>
      <div class="flex justify-end">
        <ButtonGroup>
          <Button
            onclick={() => {
              addPeriodBlock(index);
            }}><CirclePlusSolid /></Button
          >
          <Button
            onclick={() => {
              deletePeriodBlock(index);
            }}><CircleMinusSolid /></Button
          >
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
                {convertToTimeFormat(timeData[block.periodX.start])}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodX.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {convertToTimeFormat(timeData[block.periodX.end])}
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
                {convertToTimeFormat(timeData[block.periodY.start])}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodY.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {convertToTimeFormat(timeData[block.periodY.end])}
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
                {convertToTimeFormat(timeData[block.periodD.start])}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodD.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {convertToTimeFormat(timeData[block.periodD.end])}
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
                {convertToTimeFormat(timeData[block.periodF.start])}
              </p></TableBodyCell
            >
            <TableBodyCell>
              <Input type="number" step="1" bind:value={block.periodF.end} />
            </TableBodyCell>
            <TableBodyCell
              ><p>
                {convertToTimeFormat(timeData[block.periodF.end])}
              </p></TableBodyCell
            >
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell>
              <Label>
                Last Defrost
                <Toggle bind:checked={block.lastPeriod} class="my-4" />
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
                {convertToTimeFormat(timeData[block.defrostRecoveryIndex])}
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
                {convertToTimeFormat(
                  timeData[block.nominalDefrostRecoveryIndex]
                )}
              </p>
            </TableBodyCell>
          </TableBodyRow>
        </TableBody>
      </Table>
    {/each}
  {/if}
{/if}
{#if exportRow.length > 0 && ssType == 0}
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
<EditChartModal bind:open on:event={handleModal}/>
