<script lang="ts">
  import EditChartModal from "$lib/components/EditChartModal.svelte";
  import { selectedStore } from "$lib/store/selectedStore";
  import { storageTempConfigStore } from "$lib/store/storageTempConfigStore";
  import {
    loadChartConfigs,
    loadStorageByFileName,
    loadStorageChartConfigs,
    saveLimsStorageResult,
  } from "$lib/util/db.util";
  import type { ExcelData } from "$lib/util/excel.utils";
  import { getCycleData, type CycleData } from "$lib/util/iec.62552.3.util";
  import { convertToTimeFormat } from "$lib/util/iec.chart.util";
  import { storageTemperatureChartOption } from "$lib/util/storage-temperature/storage.chart.util";
  import { exportStorageExcel } from "$lib/util/storage-temperature/storage.excel.util";

  import * as echarts from "echarts";
  import {
    Button,
    ButtonGroup,
    Input,
    Modal,
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
  import { onDestroy } from "svelte";
  import StorageTemperatureTable from "./StorageTemperatureTable.svelte";

  let { data } = $props();
  let rawData: ExcelData = data.slice(2);
  let chartContainer: any;
  let chartInstance: echarts.ECharts;
  let isChartLoaded = $state(false);
  let cycleData: CycleData[] = $state([]);
  let timeData: Date[] = $state([]);
  let tccMode = $state(false);
  let editTcc = $state(false);
  const config = $selectedStore;

  const handleResize = () => chartInstance?.resize();

  async function updateChart() {
    if (!chartContainer) {
      return;
    }

    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer);
    }

    const chartOption: echarts.EChartsCoreOption = await new Promise(
      (resolve) => {
        setTimeout(() => {
          const result: echarts.EChartsCoreOption =
            storageTemperatureChartOption(data, cycleData);
          resolve(result);
        }, 0);
      }
    );
    chartInstance.setOption(chartOption, true);
    isChartLoaded = true;
  }

  $effect(() => {
    cycleData = getCycleData(
      rawData,
      new Date(2000, 1, 1),
      new Date(2099, 1, 1),
      config
    );
    timeData = rawData.map((row) => new Date(row[config.xAxis] as string));
    updateChart();
    window.addEventListener("resize", handleResize);
  });

  onDestroy(() => {
    window.removeEventListener("resize", handleResize);
    if (chartInstance) {
      chartInstance.dispose();
    }
  });

  function addRow(currentIndex: number) {
    const newRow: CycleData = {
      index: cycleData[currentIndex].index,
      count: cycleData[currentIndex].count + 1,
      dateTime: timeData[cycleData[currentIndex].index],
      max: -1,
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

  function deleteRow(index: number) {
    cycleData = cycleData
      .filter((_, i) => i !== index) // 해당 인덱스의 행 제거
      .map((row) => ({
        ...row,
        count: row.count > cycleData[index].count ? row.count - 1 : row.count, // 삭제된 행 이후의 index를 1씩 감소
      }));
  }

  let open = $state(false);
  function handleModal() {
    open = false;
    updateChart();
  }

  //@ts-ignore
  function tableToMatrix(table) {
    const rows = table.rows;
    const matrix: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      matrix[i] = matrix[i] || [];
      let colIndex = 0;

      for (let j = 0; j < row.cells.length; j++) {
        const cell = row.cells[j];

        // 다음 비어 있는 칸을 찾음
        while (matrix[i][colIndex] !== undefined) {
          colIndex++;
        }

        const rowspan = cell.rowSpan || 1;
        const colspan = cell.colSpan || 1;
        const value = cell.textContent.trim();

        for (let r = 0; r < rowspan; r++) {
          for (let c = 0; c < colspan; c++) {
            const ri = i + r;
            const ci = colIndex + c;
            matrix[ri] = matrix[ri] || [];
            matrix[ri][ci] = r === 0 && c === 0 ? value : "";
          }
        }

        colIndex += colspan;
      }
    }

    return matrix;
  }

  let fileName = $state("");
  let openLoadConfigModal = $state(false);
  let chartSettingConfig = $state(null);
  let configItems: any[] = $state([]);
  let selectedLoadConfig = $state(null);
  let selectedSaveConfig = $state(null);
  async function loadConfigModal() {
    configItems = (await loadStorageChartConfigs()).map((config) => ({
      value: config.fileName,
      name: config.fileName,
    }));
    openLoadConfigModal = true;
  }

  async function loadSelectedChartConfig() {
    if (selectedLoadConfig) {
      const loadConfig = await loadStorageByFileName(selectedLoadConfig);
      if (loadConfig != null) {
        console.log(loadConfig);
        cycleData = loadConfig.cycleData.map((cycle) => ({
          ...cycle,
          dateTime: timeData[cycle.index],
        }));
        $storageTempConfigStore.periodS = loadConfig.periodS;
        $storageTempConfigStore.periodE = loadConfig.periodE;
        await updateChart();
      }
    }
    openLoadConfigModal = false;
  }

  let openSaveConfigModal = $state(false);
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
      periodS: $storageTempConfigStore.periodS,
      periodE: $storageTempConfigStore.periodE,
    };

    await saveLimsStorageResult(name, dataConfig);
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
        editTcc = !editTcc;
      }}
    >
      Edit TCC
    </Button>
    <Button
      onclick={() => {
        open = true;
      }}>Setting</Button
    >
    <Button
      onclick={() => {
        const unfrozenTable = document.getElementById("unfrozenTable");
        const frozenTable = document.getElementById("frozenTable");
        const frozenMatrix = tableToMatrix(frozenTable);
        const unfrozenMatrix = tableToMatrix(unfrozenTable);
        exportStorageExcel(
          data,
          $storageTempConfigStore.periodS,
          $storageTempConfigStore.periodE,
          [...frozenMatrix, ...unfrozenMatrix]
        );
      }}
    >
      Export
    </Button>
  </ButtonGroup>
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
<div>
  {#if editTcc}
    <div class="justify-end flex">
      <ButtonGroup>
        <Button
          onclick={() => {
            updateChart();
          }}
          >Update
        </Button>
      </ButtonGroup>
    </div>
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
  {/if}
</div>
<br />
<br />
<br />
<div>
  <div class="flex justify-end">
    <Toggle bind:checked={tccMode}>TCC Mode</Toggle>
  </div>
  {#if tccMode}
    <Table>
      <TableHead>
        <TableHeadCell>
          <p>Target</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>Start TCC</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>Start Time</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>End TCC (before)</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>End Time</p>
        </TableHeadCell>
      </TableHead>
      <TableBody>
        <TableBodyRow>
          <TableBodyCell><p>Period S</p></TableBodyCell>
          <TableBodyCell>
            <Select
              items={cycleData.map((cycle) => ({
                value: cycle.index,
                name: cycle.count,
              }))}
              bind:value={$storageTempConfigStore.periodS.start}
            />
          </TableBodyCell>
          <TableBodyCell>
            {convertToTimeFormat(
              timeData[$storageTempConfigStore.periodS.start]
            )}
          </TableBodyCell>
          <TableBodyCell>
            <Select
              items={cycleData.map((cycle) => ({
                value: cycle.index - 1,
                name: cycle.count,
              }))}
              bind:value={$storageTempConfigStore.periodS.end}
            />
          </TableBodyCell>
          <TableBodyCell>
            {convertToTimeFormat(timeData[$storageTempConfigStore.periodS.end])}
          </TableBodyCell>
        </TableBodyRow>
        <TableBodyRow>
          <TableBodyCell><p>Period E</p></TableBodyCell>
          <TableBodyCell>
            <Select
              items={cycleData.map((cycle) => ({
                value: cycle.index,
                name: cycle.count,
              }))}
              bind:value={$storageTempConfigStore.periodE.start}
            />
          </TableBodyCell>
          <TableBodyCell>
            {convertToTimeFormat(
              timeData[$storageTempConfigStore.periodE.start]
            )}
          </TableBodyCell>
          <TableBodyCell>
            <Select
              items={cycleData.map((cycle) => ({
                value: cycle.index - 1,
                name: cycle.count,
              }))}
              bind:value={$storageTempConfigStore.periodE.end}
            />
          </TableBodyCell>
          <TableBodyCell>
            {convertToTimeFormat(timeData[$storageTempConfigStore.periodE.end])}
          </TableBodyCell>
        </TableBodyRow>
      </TableBody>
    </Table>
  {:else}
    <Table>
      <TableHead>
        <TableHeadCell>
          <p>Target</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>Start Index</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>Start Time</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>End Index</p>
        </TableHeadCell>
        <TableHeadCell>
          <p>End Time</p>
        </TableHeadCell>
      </TableHead>
      <TableBody>
        <TableBodyRow>
          <TableBodyCell><p>Period S</p></TableBodyCell>
          <TableBodyCell
            ><Input
              type="number"
              step="1"
              min="1"
              bind:value={$storageTempConfigStore.periodS.start}
            /></TableBodyCell
          >
          <TableBodyCell
            >{convertToTimeFormat(
              timeData[$storageTempConfigStore.periodS.start]
            )}</TableBodyCell
          >
          <TableBodyCell
            ><Input
              type="number"
              step="1"
              min="1"
              bind:value={$storageTempConfigStore.periodS.end}
            /></TableBodyCell
          >
          <TableBodyCell
            >{convertToTimeFormat(
              timeData[$storageTempConfigStore.periodS.end]
            )}</TableBodyCell
          >
        </TableBodyRow>
        <TableBodyRow>
          <TableBodyCell><p>Period E</p></TableBodyCell>
          <TableBodyCell
            ><Input
              type="number"
              step="1"
              min="1"
              bind:value={$storageTempConfigStore.periodE.start}
            /></TableBodyCell
          >
          <TableBodyCell
            >{convertToTimeFormat(
              timeData[$storageTempConfigStore.periodE.start]
            )}</TableBodyCell
          >
          <TableBodyCell
            ><Input
              type="number"
              step="1"
              min="1"
              bind:value={$storageTempConfigStore.periodE.end}
            /></TableBodyCell
          >
          <TableBodyCell
            >{convertToTimeFormat(
              timeData[$storageTempConfigStore.periodE.end]
            )}</TableBodyCell
          >
        </TableBodyRow>
      </TableBody>
    </Table>
  {/if}
</div>
<div>
  <StorageTemperatureTable {data} />
</div>
<EditChartModal bind:open on:event={handleModal} />
<Modal bind:open={openLoadConfigModal} title="Load Config">
  <Select items={configItems} bind:value={selectedLoadConfig}></Select>
  <svelte:fragment slot="footer">
    <Button onclick={loadSelectedChartConfig}>Load</Button>
  </svelte:fragment>
</Modal>
<Modal bind:open={openSaveConfigModal} title="Save Config">
  <Input type="text" bind:value={fileName} placeholder="New Config Name" />
  <Select items={configItems} bind:value={selectedSaveConfig}></Select>
  <svelte:fragment slot="footer">
    <Button onclick={saveConfig}>Save</Button>
  </svelte:fragment>
</Modal>
