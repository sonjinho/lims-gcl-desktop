<script>
  import { selectedStore } from "$lib/store/selectedStore";
  import { save, SS1Config } from "$lib/util/db.util";
  import { TemperatureIndex } from "$lib/util/iec.62552.3.util";
  import {
    Button,
    ButtonGroup,
    Heading,
    Hr,
    Input,
    Label,
    MultiSelect,
    Select,
  } from "flowbite-svelte";
  import { onMount } from "svelte";

  export let data;

  let header = data[0] || []; // header가 undefined일 경우 빈 배열로 초기화

  async function saveSelection() {
    let ss1Config = new SS1Config();
    ss1Config.name = $selectedStore.name;
    ss1Config.config = JSON.stringify($selectedStore);
    console.log(ss1Config);
    save(ss1Config);
    alert('Save')
  }
  const unfrozenItems = [
    {
      value: TemperatureIndex.FRESH_FOOD,
      name: "FRESH FOOD",
    },
    {
      value: TemperatureIndex.CELLAR,
      name: "CELLAR",
    },
    {
      value: TemperatureIndex.PANTRY,
      name: "PANTRY",
    },
    {
      value: TemperatureIndex.CHILL,
      name: "CHILL",
    },
  ];

  const frozenItems = [
    {
      value: TemperatureIndex.FROZEN_0_STAR,
      name: "FROZEN ZERO STAR",
    },
    {
      value: TemperatureIndex.FROZEN_1_STAR,
      name: "FROZEN ONE STAR",
    },
    {
      value: TemperatureIndex.FROZEN_2_STAR,
      name: "FROZEN TWO STAR",
    },
    {
      value: TemperatureIndex.FROZEN_3_STAR,
      name: "FROZEN THREE STAR",
    },
    {
      value: TemperatureIndex.FROZEN_4_STAR,
      name: "FROZEN FOUR STAR",
    },
  ];

  let items = header.map((item, index) => ({ value: index, name: item }));
</script>

{#if $selectedStore}
  <div class="mt-4">
    <ButtonGroup class="w-full">
      <Input type="text" required bind:value={$selectedStore.name} />
      <Button on:click={saveSelection}>Save</Button>
    </ButtonGroup>
  </div>
  <div class="grid grid-cols-1 gap-6">
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Target Ambient</Label
      >

      <Select
        bind:value={$selectedStore.targetAmbient}
        placeholder="Ambient"
        items={[
          { value: 32, name: "32" },
          { value: 16, name: "16" },
        ]}
      ></Select>
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Time</Label>
      <Select
        bind:value={$selectedStore.xAxis}
        {items}
        class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-primary-600"
      />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Power</Label>
      <Select bind:value={$selectedStore.power} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Integ. Power</Label>
      <Select bind:value={$selectedStore.integPower} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Ambient</Label>
      <MultiSelect bind:value={$selectedStore.ambient} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Evaluate Unfrozen</Label
      >
      <Select
        bind:value={$selectedStore.evaluateUnfrozen}
        items={unfrozenItems}
      />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Evaluate Frozen</Label
      >
      <Select bind:value={$selectedStore.evaluateFrozen} items={frozenItems} />
    </div>
  </div>
  <Hr />
  <Heading tag="h4">Unfrozen</Heading>
  <div class="grid grid-cols-2 gap-6">
    <!-- UnFrozen -->

    <div>
      <Label class="block text-sm font-medium text-gray-700">Fresh Food</Label>
      <MultiSelect bind:value={$selectedStore.freshFood.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Fresh Food Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.freshFood.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700">Cellar</Label>
      <MultiSelect bind:value={$selectedStore.cellar.temp} {items} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Cellar Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.cellar.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700">Pantry</Label>
      <MultiSelect bind:value={$selectedStore.pantry.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Pantry Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.pantry.volume} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Wine Storage</Label
      >
      <MultiSelect bind:value={$selectedStore.wineStorage.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Wine Storage Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.wineStorage.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700">Chill</Label>
      <MultiSelect bind:value={$selectedStore.chill.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Chill Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.chill.volume} />
    </div>
  </div>
  <Hr />
  <Heading tag="h4">Frozen</Heading>
  <div class="grid grid-cols-2 gap-6 pb-24">
    <!-- Frozen -->
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (0 Star)</Label
      >
      <MultiSelect bind:value={$selectedStore.frozenZeroStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (0 Star) Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.frozenZeroStar.volume} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (1 Star)</Label
      >
      <MultiSelect bind:value={$selectedStore.frozenOneStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (1 Star) Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.frozenOneStar.volume} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (2 Star)</Label
      >
      <MultiSelect bind:value={$selectedStore.frozenTwoStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (2 Star) Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.frozenTwoStar.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (3 Star)</Label
      >
      <MultiSelect bind:value={$selectedStore.frozenThreeStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (3 Star) Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.frozenThreeStar.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (4 Star)</Label
      >
      <MultiSelect bind:value={$selectedStore.frozenFourStar.temp} {items} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (4 Star) Volume</Label
      >
      <Input type="number" bind:value={$selectedStore.frozenFourStar.volume} />
    </div>
  </div>
{/if}
