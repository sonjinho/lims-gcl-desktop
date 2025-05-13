<script>
  import StorageTemperatureResultView from "$lib/components/storage-temperature/StorageTemperatureResultView.svelte";
  import { selectedStore } from "$lib/store/selectedStore";
  import { loadAll, loadById } from "$lib/util/db.util";
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
  });

  const handleOpenFile = async () => {
    const path = await findExcelFile();
    if (path != null) {
      filePath = path;
      result = await openExcelFile(path);
    }
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

<main>
  <div class="flex items-center space-x-4">
    <Button on:click={handleOpenFile} size="xs">Select File</Button>

    {#if items.length > 0}
      <Select bind:value={configId} {items} on:change={handleOnChange} />
    {/if}
  </div>

  {#if filePath}
    <p>{filePath}</p>
  {/if}

  {#if result.length > 0}
    <StorageTemperatureResultView {result} />
  {/if}
</main>