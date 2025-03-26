<script>
  import ExcelGraph from "$lib/components/ExcelGraph.svelte";
  import openExcelFile from "$lib/utils/excel.utils";

  let result = $state([]);
  const handleOpenFile = async () => {
    result = await openExcelFile();
  };
</script>

<main class="container">
  <button onclick={handleOpenFile}>Select Excel File</button>
  {#if result.length > 0}
    <ExcelGraph {result} />
  {/if}
</main>
