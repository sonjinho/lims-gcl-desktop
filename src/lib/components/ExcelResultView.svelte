<script>
  import { chartYAxisStore } from "$lib/store/chartYAxisStore";
  import { Button, ButtonGroup, StepIndicator } from "flowbite-svelte";
  import DataSetting from "./DataSetting.svelte";
  import IECChartComponent from "./IECChartComponent.svelte";
  import ModelView from "./ModelView.svelte";

  export let result;

  function splitByElapsedTime(data) {
    if (!data) return [];
    const result = [];
    let currentChunk = [];
    let flag = false;

    for (const row of data) {
      if (!flag && row.includes("Power")) {
        if (currentChunk.length > 0) {
          result.push(currentChunk);
        }
        currentChunk = [row];
        flag = true;
      } else {
        currentChunk.push(row);
      }
    }

    if (currentChunk.length > 0) {
      result.push(currentChunk);
    }

    return result;
  }

  let data = result?.filter((row) => row && row.length !== 0) ?? [];
  let splitData = splitByElapsedTime(data);

  let vendor = splitData[0] ?? [];
  let chunkData = splitData.length > 1 ? splitData[1] : [];

  let sortedData = vendor.sort((a, b) =>
    a[0] === "Model" ? -1 : b[0] === "Model" ? 1 : 0
  );

  let currentStep = 1;
  let steps = ["Model", "Table Setting", "Chart"];

  function initYAxis() {
    const header = chunkData[0];
    const unit = chunkData[1];
    console.log(header, unit);
    $chartYAxisStore.series = [];

    for (let i = 0; i < header.length && i < unit.length; i++) {
      if (unit[i] && unit[i] !== null) {
        if (unit[i] !== "℃") {
          $chartYAxisStore.series.push({ header: header[i], yAxis: 1 });
        } else {
          $chartYAxisStore.series.push({ header: header[i], yAxis: 0 });
        }
      }
    }
  }
</script>

<main class=" p-6">
  <!-- <h3 class="text-base font-semibold">{steps[currentStep]}</h3> -->
  <StepIndicator {currentStep} {steps} />
  <div class="flex justify-end m-10">
    <ButtonGroup>
      <Button
        disabled={currentStep <= 1}
        onclick={() => {
          if (currentStep <= 1) {
            return;
          }
          currentStep = currentStep - 1;
        }}>Prev</Button
      >
      <Button
        onclick={() => {
          if (currentStep >= steps.length) {
            return;
          }
          if (currentStep == 2) {
            // init yAxis
            initYAxis();
          }
          currentStep = currentStep + 1;
        }}
        disabled={currentStep >= steps.length}>Next</Button
      >
    </ButtonGroup>
  </div>
  {#if currentStep === 1}
    <ModelView {vendor} />
  {:else if currentStep == 2}
    <DataSetting data={chunkData} />
  {:else if currentStep == 3}
    {#if chunkData.length > 0}
      <IECChartComponent data={chunkData} />
      <!-- <EChartComponent data={chunkData} /> -->
    {/if}
  {/if}
</main>
