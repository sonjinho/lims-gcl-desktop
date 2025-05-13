<script>
  import SS2ResultTable from "./SS2ResultTable.svelte";

  import { selectedStore } from "$lib/store/selectedStore";
  import {
    loadByFileName,
    loadChartConfigs,
    saveLimsResult,
  } from "$lib/util/db.util";
  import { exportSS1Excel } from "$lib/util/excel.ss1.util";
  import { exportSS2ToExcel } from "$lib/util/excel.utils";
  import { runSS1_manual } from "$lib/util/iec.62552.3.ss1.util";
  import {
    getAutoDefrostRecoveryPeriod,
    getSS1DefrostRecoveryPeriod,
    PeriodBlock,
    runSS2_manual,
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
    Modal,
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
  import SS1ResultTable from "./SS1ResultTable.svelte";

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
  let numberOfTCC = 1;
  let editTarget = 0;
  let open = false;
  let rawData = [];
  let cycleData = [];
  let periodBlocks = [new PeriodBlock()];
  let ss1PeriodBlocks = [new PeriodBlock()];
  let timeData = [];
  let exportRow = [];
  let fileName = "";
  let selectedSaveConfig = null;

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
      exportSS1Excel(data, cycleData, timeData, ss1PeriodBlocks, numberOfTCC);
    } else {
      exportSS2ToExcel(rawData, cycleData, periodBlocks);
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
          ssType == 0 ? ss1PeriodBlocks : periodBlocks,
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
    rawData = data.slice(2);

    cycleData = getCycleData(
      rawData,
      new Date(startTime),
      new Date(endTime),
      config
    );

    timeData = rawData.map((row) => new Date(row[config.xAxis]));

    if (ssType == 0) {
      ss1PeriodBlocks = getSS1DefrostRecoveryPeriod(rawData, cycleData, config);
    } else {
      periodBlocks = getAutoDefrostRecoveryPeriod(rawData, cycleData, config);
    }
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
        count: row.count + 1,
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

  function addSS1PeriodBlock(index) {
    const newBlock = {
      periodD: { start: 0, end: 0 },
      periodF: { start: 0, end: 0 },
      periodX: { start: 0, end: 0 },
      periodY: { start: 0, end: 0 },
      heaterOn: 0,
      defrostRecoveryIndex: 0,
      nominalDefrostRecoveryIndex: 0,
      lastPeriod: false,
    };
    ss1PeriodBlocks = [
      ...ss1PeriodBlocks.slice(0, index + 1),
      newBlock,
      ...ss1PeriodBlocks.slice(index + 1),
    ];
  }

  function addPeriodBlock(index) {
    const newBlock = {
      periodD: { start: 0, end: 0 },
      periodF: { start: 0, end: 0 },
      periodX: { start: 0, end: 0 },
      periodY: { start: 0, end: 0 },
      heaterOn: 0,
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

  function deleteSS1PeriodBlock(index) {
    if (ss1PeriodBlocks.length > 1) {
      ss1PeriodBlocks = ss1PeriodBlocks.filter((_, i) => i !== index);
    }
  }

  // PeriodBlock 삭제
  function deletePeriodBlock(index) {
    if (periodBlocks.length > 1) {
      periodBlocks = periodBlocks.filter((_, i) => i !== index);
    }
  }

  function handleModal() {
    open = false;
    updateChart();
  }

  let openLoadConfigModal = false;
  let chartSettingConfig;
  let configItems = [];
  let selectedLoadConfig;
  async function loadConfigModal() {
    configItems = (await loadChartConfigs()).map((config) => ({
      value: config.fileName,
      name: config.fileName,
    }));
    openLoadConfigModal = true;
  }

  async function loadSelectedChartConfig() {
    if (selectedLoadConfig) {
      const loadConfig = await loadByFileName(selectedLoadConfig);
      if (loadConfig != null) {
        console.log(loadConfig);
        cycleData = loadConfig.cycleData.map((cycle) => ({
          ...cycle,
          dateTime: timeData[cycle.index],
        }));
        periodBlocks = loadConfig.periodBlocks;
        ss1PeriodBlocks = loadConfig.ss1PeriodBlocks;
        await updateChart();
      }
    }
    openLoadConfigModal = false;
  }

  let openSaveConfigModal = false;
  async function saveConfigModal() {
    openSaveConfigModal = true;
    configItems = (await loadChartConfigs()).map((config) => ({
      value: config.fileName,
      name: config.fileName,
    }));
  }

  async function saveConfig() {
    let name = fileName;
    if (selectedSaveConfig) {
      name = selectedSaveConfig;
    }
    const dataConfig = {
      cycleData,
      periodBlocks,
      ss1PeriodBlocks
    };

    await saveLimsResult(name, dataConfig);
    openSaveConfigModal = false;
  }
</script>

<div class="flex justify-end gap-4">
  <ButtonGroup>
    <Button onclick={loadConfigModal}>Load</Button>
    <Button onclick={saveConfigModal}>Save</Button>
  </ButtonGroup>
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

<div class="h-[75vh] w-full relative" style="zoom: 100% !important;">
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
            name: "Period - SS1",
          },
          {
            value: 2,
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
              <p>{index + 1}</p>
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
  {:else if editTarget == 1}
    {#each ss1PeriodBlocks as block, index}
      <h3 class="font-semibold">
        <Radio
          name="select"
          onclick={() => {
            ss1PeriodBlocks.forEach((periodBlock, i) => {
              periodBlock.checked = i == index;
            });
          }}
          bind:checked={block.checked}
        >
          Block {index + 1}</Radio
        >
      </h3>
      <div class="flex justify-end">
        <Toggle class="mx-5" bind:checked={block.tccMode}>TCC mode</Toggle>
        <ButtonGroup>
          <Button
            onclick={() => {
              addSS1PeriodBlock(index);
            }}><CirclePlusSolid /></Button
          >
          <Button
            onclick={() => {
              deleteSS1PeriodBlock(index);
            }}><CircleMinusSolid /></Button
          >
        </ButtonGroup>
      </div>
      {#if block.tccMode}
        <Table>
          <TableHead>
            <TableHeadCell>Target</TableHeadCell>
            <TableHeadCell>Start TCC</TableHeadCell>
            <TableHeadCell>Start Time</TableHeadCell>
            <TableHeadCell>End TCC (Before)</TableHeadCell>
            <TableHeadCell>End Time</TableHeadCell>
          </TableHead>
          <TableBody>
            <TableBodyRow>
              <TableBodyCell>Period D</TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodD.start}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodD.start])}</p>
              </TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index - 1,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodD.end}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodD.end])}</p>
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>Period F</TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodF.start}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodF.start])}</p>
              </TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index - 1,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodF.end}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodF.end])}</p>
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>Last Defrost</TableBodyCell>
              <TableBodyCell>Heater On</TableBodyCell>
              <TableBodyCell>Defrost Recovery</TableBodyCell>
              <TableBodyCell>Nominal Centre</TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>
                <Toggle bind:checked={block.lastPeriod} class="my-4"></Toggle>
              </TableBodyCell>
              <TableBodyCell>
                <Input type="number" step="1" bind:value={block.heaterOn} />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.defrostRecoveryIndex}
                />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.nominalDefrostRecoveryIndex}
                />
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell></TableBodyCell>
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.heaterOn])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.defrostRecoveryIndex])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(
                    timeData[block.nominalDefrostRecoveryIndex]
                  )}
                </p></TableBodyCell
              >
            </TableBodyRow>
          </TableBody>
        </Table>
      {:else}
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
              <TableBodyCell>Period D</TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.periodD.start}
                />
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
                <Input
                  type="number"
                  step="1"
                  bind:value={block.periodF.start}
                />
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
              <TableBodyCell>Last Defrost</TableBodyCell>
              <TableBodyCell>Heater On</TableBodyCell>
              <TableBodyCell>Defrost Recovery</TableBodyCell>
              <TableBodyCell>Nominal Centre</TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>
                <Toggle bind:checked={block.lastPeriod} class="my-4"></Toggle>
              </TableBodyCell>
              <TableBodyCell>
                <Input type="number" step="1" bind:value={block.heaterOn} />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.defrostRecoveryIndex}
                />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.nominalDefrostRecoveryIndex}
                />
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell></TableBodyCell>
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.heaterOn])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.defrostRecoveryIndex])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(
                    timeData[block.nominalDefrostRecoveryIndex]
                  )}
                </p></TableBodyCell
              >
            </TableBodyRow>
          </TableBody>
        </Table>
      {/if}
    {/each}
  {:else if editTarget == 2 && periodBlocks.length > 0 && timeData.length > 0}
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
        <Toggle class="mx-5" bind:checked={block.tccMode}>TCC mode</Toggle>
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
      {#if block.tccMode}
        <Table>
          <TableHead>
            <TableHeadCell>Target</TableHeadCell>
            <TableHeadCell>Start TCC</TableHeadCell>
            <TableHeadCell>Start Time</TableHeadCell>
            <TableHeadCell>End TCC (Before)</TableHeadCell>
            <TableHeadCell>End Time</TableHeadCell>
          </TableHead>
          <TableBody>
            <TableBodyRow>
              <TableBodyCell>Period X</TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count + 1,
                  }))}
                  bind:value={block.periodX.start}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodX.start])}</p>
              </TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodX.end}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodX.end])}</p>
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>Period Y</TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodY.start}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodY.start])}</p>
              </TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodY.end}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodY.end])}</p>
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>Period D</TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodD.start}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodD.start])}</p>
              </TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodD.end}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodD.end])}</p>
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>Period F</TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodF.start}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodF.start])}</p>
              </TableBodyCell>
              <TableBodyCell>
                <Select
                  items={cycleData.map((cycle) => ({
                    value: cycle.index,
                    name: cycle.count,
                  }))}
                  bind:value={block.periodF.end}
                />
              </TableBodyCell>
              <TableBodyCell>
                <p>{convertToTimeFormat(timeData[block.periodF.end])}</p>
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>Last Defrost</TableBodyCell>
              <TableBodyCell>Heater On</TableBodyCell>
              <TableBodyCell>Defrost Recovery</TableBodyCell>
              <TableBodyCell>Nominal Centre</TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>
                <Toggle bind:checked={block.lastPeriod} class="my-4"></Toggle>
              </TableBodyCell>
              <TableBodyCell>
                <Input type="number" step="1" bind:value={block.heaterOn} />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.defrostRecoveryIndex}
                />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.nominalDefrostRecoveryIndex}
                />
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell></TableBodyCell>
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.heaterOn])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.defrostRecoveryIndex])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(
                    timeData[block.nominalDefrostRecoveryIndex]
                  )}
                </p></TableBodyCell
              >
            </TableBodyRow>
          </TableBody>
        </Table>
      {:else}
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
                <Input
                  type="number"
                  step="1"
                  bind:value={block.periodX.start}
                />
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
                <Input
                  type="number"
                  step="1"
                  bind:value={block.periodY.start}
                />
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
                <Input
                  type="number"
                  step="1"
                  bind:value={block.periodD.start}
                />
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
                <Input
                  type="number"
                  step="1"
                  bind:value={block.periodF.start}
                />
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
              <TableBodyCell>Last Defrost</TableBodyCell>
              <TableBodyCell>Heater On</TableBodyCell>
              <TableBodyCell>Defrost Recovery</TableBodyCell>
              <TableBodyCell>Nominal Centre</TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell>
                <Toggle bind:checked={block.lastPeriod} class="my-4"></Toggle>
              </TableBodyCell>
              <TableBodyCell>
                <Input type="number" step="1" bind:value={block.heaterOn} />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.defrostRecoveryIndex}
                />
              </TableBodyCell>
              <TableBodyCell>
                <Input
                  type="number"
                  step="1"
                  bind:value={block.nominalDefrostRecoveryIndex}
                />
              </TableBodyCell>
            </TableBodyRow>
            <TableBodyRow>
              <TableBodyCell></TableBodyCell>
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.heaterOn])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(timeData[block.defrostRecoveryIndex])}
                </p></TableBodyCell
              >
              <TableBodyCell>
                <p>
                  {convertToTimeFormat(
                    timeData[block.nominalDefrostRecoveryIndex]
                  )}
                </p></TableBodyCell
              >
            </TableBodyRow>
          </TableBody>
        </Table>
      {/if}
    {/each}
  {/if}
{/if}
{#if exportRow.length > 0 && ssType == 0}
  <SS1ResultTable {exportRow}></SS1ResultTable>
{/if}
{#if periodBlocks.length > 0 && ssType == 1}
  {#await runSS2_manual(rawData, cycleData, periodBlocks)}
    <h2>Loading ...</h2>
  {:then ss2Result}
    {#if ss2Result != null}
      <SS2ResultTable {ss2Result}></SS2ResultTable>
    {/if}
  {/await}
{/if}
<EditChartModal bind:open on:event={handleModal} />
<Modal bind:open={openLoadConfigModal} title="Load Config">
  <Select items={configItems} bind:value={selectedLoadConfig}></Select>
  {#snippet footer()}
    <Button onclick={loadSelectedChartConfig}>Load</Button>
  {/snippet}
</Modal>
<Modal bind:open={openSaveConfigModal} title="Save Config">
  <Input type="text" bind:value={fileName} placeholder="New Config Name"/>
  <Select items={configItems} bind:value={selectedSaveConfig}></Select>
  {#snippet footer()}
    <Button onclick={saveConfig}>Save</Button>
  {/snippet}
</Modal>
