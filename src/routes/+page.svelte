<script>
  import ExcelGraph from "$lib/components/ExcelGraph.svelte";
  import { Button } from "$lib/components/ui/button";
  import openExcelFile from "$lib/util/excel.utils";

  let result = $state([]);
  const handleOpenFile = async () => {
    result = await openExcelFile();
  };
</script>

<main class="container">
  <Button onclick={handleOpenFile} size="sm">Select Excel File</Button>
  {#if result.length > 0}
    <ExcelGraph {result} />
  {:else}
    <p>No Data</p>
  {/if}
</main>
