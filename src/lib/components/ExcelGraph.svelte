<script>
  import EChartComponent from "./EChartComponent.svelte";

  export let result;
  function splitByElapsedTime(data) {
    if (!data) return [];
    const result = [];
    let currentChunk = [];

    for (const row of data) {
      if (row[0] === "Elapsed Time") {
        if (currentChunk.length > 0) {
          result.push(currentChunk);
        }
        currentChunk = [row]; // 새로운 그룹 시작
      } else {
        currentChunk.push(row);
      }
    }

    if (currentChunk.length > 0) {
      result.push(currentChunk);
    }

    return result;
  }

  let data = result.filter((row) => row).filter((row) => row.length !== 0);
  let [vendor, chunkData] = splitByElapsedTime(data);
</script>

{#if !result || result.length === 0}
  <div>No Data to Display</div>
{:else if chunkData}
  <div>
    <h2>Excel Data Graph</h2>
    <!-- <p>{JSON.stringify(vendor, null, 2)}</p> -->
    <EChartComponent data={chunkData}/>
  </div>
{/if}
