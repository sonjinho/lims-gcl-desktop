<script>
  import EChartComponent from "./EChartComponent.svelte";
  import DataSetting  from "./DataSetting.svelte";
  import { Button } from "flowbite-svelte";
  import ExcelResultView from "./ExcelResultView.svelte";

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

  let isOpen = false;
</script>

{#if !result || result.length === 0}
  <div>No Data to Display</div>
{:else}
<ExcelResultView/>

  <div>
    <div class="flex justify-end">
      <Button
        onclick={() => {
          isOpen = !isOpen;
        }}
      >
        {#if isOpen}
          Hide
        {:else}
          Show
        {/if}
        Model Information</Button
      >
    </div>

    <!-- {#if isOpen}
      <div class="mb-4 p-4 bg-blue-100 rounded-md">
        <strong>Model:</strong>
        {sortedData.find((row) => row[0] === "Model")?.[1] ?? "N/A"}
      </div>

      <div class="max-h-80 overflow-y-auto border rounded-md p-2">
        <table class="w-full border border-gray-300">
          <thead>
            <tr class="bg-gray-200">
              <th class="border px-4 py-2 text-left">Key</th>
              <th class="border px-4 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {#each vendor as row}
              <tr>
                <td class="border px-4 py-2 font-semibold">{row[0]}</td>
                <td class="border px-4 py-2">{row[1] ?? "-"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if} -->

    <!-- {#if chunkData.length > 0}
      <DataSetting data ={chunkData}/>
    {/if} -->

    <!-- {#if chunkData.length > 0}
      <EChartComponent data={chunkData} />
    {/if} -->
  </div>
{/if}
