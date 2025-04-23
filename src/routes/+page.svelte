<script>
  import ExcelResultView from "$lib/components/ExcelResultView.svelte";
  import { excelDataStore } from "$lib/store/excelDataStore";
  import { itemsStore } from "$lib/store/itemsStore";
  import { selectedStore } from "$lib/store/selectedStore";
  import { loadAll, loadById, SS1Config } from "$lib/util/db.util";
  import openExcelFile, { findExcelFile } from "$lib/util/excel.utils";
  import { Button, Select } from "flowbite-svelte";
  import { onMount } from "svelte";
  let result = $state([]);
  let items = $state([]);
  let configId = $state(-1);

  let filePath = $state("");
  onMount(async () => {
    let configs = await loadAll();
    if (configs && configs.length > 0) {
      items = configs.map((config) => ({
        value: config.id,
        name: config.name + " / Created At: " + config.createdAt,
      }));
    }
    items.unshift({ value: -1, name: "New Config" });
    itemsStore.set(items);
  });

  const handleOpenFile = async () => {
    const path = await findExcelFile();
    filePath = path;
    result = await openExcelFile(path);
  };

  async function handleOnChange() {
    console.log(configId);
    if (configId >= 0) {
      let loadConfig = await loadById(configId);
      console.log("loadConfig", loadConfig);
      selectedStore.set(JSON.parse(loadConfig.config));
    }
  }
</script>

<main class="container">
  <Button onclick={handleOpenFile} size="xs">Select Excel File</Button>
  {#if filePath}
    <p>{filePath}</p>
  {/if}
  {#if items.length > 0}
    <div>
      <Select bind:value={configId} items={$itemsStore} onchange={handleOnChange} />
    </div>
  {/if}

  {#if result.length > 0}
    <ExcelResultView {result} />
  {/if}
</main>
