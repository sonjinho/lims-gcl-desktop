<script>
  import { selectedStore } from "$lib/store/selectedStore";
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

  let config; // 깊은 복사 필요 시 별도 처리

  onMount(() => {
    config = $selectedStore;
  });
  function saveSelection() {
    console.log(config);
    selectedStore.set({ ...config }); // 새로운 객체로 설정
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

<div class="flex justify-end mt-4">
  <ButtonGroup>
    <Button on:click={saveSelection}>Save</Button>
  </ButtonGroup>
</div>
{#if config}
  <div class="grid grid-cols-1 gap-6">
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Target Ambient</Label
      >

      <Select
        bind:value={config.targetAmbient}
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
        bind:value={config.xAxis}
        {items}
        class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-primary-600"
      />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Power</Label>
      <Select bind:value={config.power} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Ambient</Label>
      <MultiSelect bind:value={config.ambient} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Evaluate Unfrozen</Label
      >
      <Select bind:value={config.evaluateUnfrozen} items={unfrozenItems} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Evaluate Frozen</Label
      >
      <Select bind:value={config.evaluateFrozen} items={frozenItems} />
    </div>
  </div>
  <Hr />
  <Heading tag="h4">Unfrozen</Heading>
  <div class="grid grid-cols-2 gap-6">
    <!-- UnFrozen -->

    <div>
      <Label class="block text-sm font-medium text-gray-700">Fresh Food</Label>
      <MultiSelect bind:value={config.freshFood.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Fresh Food Volume</Label
      >
      <Input type="number" bind:value={config.freshFood.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700">Cellar</Label>
      <MultiSelect bind:value={config.cellar.temp} {items} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Cellar Volume</Label
      >
      <Input type="number" bind:value={config.cellar.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700">Pantry</Label>
      <MultiSelect bind:value={config.pantry.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Pantry Volume</Label
      >
      <Input type="number" bind:value={config.pantry.volume} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Wine Storage</Label
      >
      <MultiSelect bind:value={config.wineStorage.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Wine Storage Volume</Label
      >
      <Input type="number" bind:value={config.wineStorage.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700">Chill</Label>
      <MultiSelect bind:value={config.chill.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700">Chill Volume</Label
      >
      <Input type="number" bind:value={config.chill.volume} />
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
      <MultiSelect bind:value={config.frozenZeroStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (0 Star) Volume</Label
      >
      <Input type="number" bind:value={config.frozenZeroStar.volume} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (1 Star)</Label
      >
      <MultiSelect bind:value={config.frozenOneStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (1 Star) Volume</Label
      >
      <Input type="number" bind:value={config.frozenOneStar.volume} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (2 Star)</Label
      >
      <MultiSelect bind:value={config.frozenTwoStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (2 Star) Volume</Label
      >
      <Input type="number" bind:value={config.frozenTwoStar.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (3 Star)</Label
      >
      <MultiSelect bind:value={config.frozenThreeStar.temp} {items} />
    </div>
    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (3 Star) Volume</Label
      >
      <Input type="number" bind:value={config.frozenThreeStar.volume} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (4 Star)</Label
      >
      <MultiSelect bind:value={config.frozenFourStar.temp} {items} />
    </div>

    <div>
      <Label class="block text-sm font-medium text-gray-700"
        >Frozen (4 Star) Volume</Label
      >
      <Input type="number" bind:value={config.frozenFourStar.volume} />
    </div>
  </div>
{/if}
