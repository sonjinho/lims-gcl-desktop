<script>
  import ExcelResultView from "$lib/components/ExcelResultView.svelte";
  import openExcelFile from "$lib/util/excel.utils";
  import { Button } from 'flowbite-svelte';
  let result = $state([]);
  const handleOpenFile = async () => {
    result = await openExcelFile();
  };
</script>

<main class="container">

  <Button onclick={handleOpenFile} size="xs">Select Excel File</Button>
  {#if result.length > 0}
    <ExcelResultView {result} />
  {:else}
    <p>No Data</p>
  {/if}
</main>
