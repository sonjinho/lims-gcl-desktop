<script>
  import { selectedFields } from "$lib/store/selectedStore";
  import {
    Button,
    ButtonGroup,
    Checkbox,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";
  import { onMount, tick } from "svelte";
  import { writable } from "svelte/store";

  export let data;

  let header = data[0] || []; // header가 undefined일 경우 빈 배열로 초기화
  let checkedValues = writable([]);

  // 초기화 함수
  function initializeCheckedValues(initialData) {
    const values = header.map((_, index) => ({
      xAxis: initialData.xAxis?.includes(index + 1) || false,
      power: initialData.power?.includes(index + 1) || false,
      ambient: initialData.ambient?.includes(index + 1) || false,
      unfrozen: initialData.unfrozen?.includes(index + 1) || false,
      frozen: initialData.frozen?.includes(index + 1) || false,
    }));
    checkedValues.set(values);
  }

  onMount(async () => {
    // 기본값으로 초기화
    initializeCheckedValues({
      xAxis: [],
      power: [],
      ambient: [],
      unfrozen: [],
      frozen: [],
    });

    // 저장된 데이터가 있으면 반영
    selectedFields.subscribe((savedData) => {
      initializeCheckedValues(savedData);
    })();

    await tick(); // 렌더링 완료 대기
  });

  function saveSelection() {
    let updatedSelection = {
      xAxis: [],
      power: [],
      ambient: [],
      unfrozen: [],
      frozen: [],
    };

    $checkedValues.forEach((row, index) => {
      if (row.xAxis) updatedSelection.xAxis.push(index + 1);
      if (row.power) updatedSelection.power.push(index + 1);
      if (row.ambient) updatedSelection.ambient.push(index + 1);
      if (row.unfrozen) updatedSelection.unfrozen.push(index + 1);
      if (row.frozen) updatedSelection.frozen.push(index + 1);
    });

    selectedFields.set(updatedSelection);
    console.log("Saved:", updatedSelection);
  }
</script>

<div class="flex justify-end mt-4">
  <ButtonGroup>
    <Button on:click={saveSelection}>Save</Button>
  </ButtonGroup>
</div>

<Table>
  <TableHead>
    <TableHeadCell class="h-6 px-2 py-1 text-xs">Field</TableHeadCell>
    <TableHeadCell class="h-6 px-2 py-1 text-xs">
      <div class="flex items-center justify-center">X Axis Data (Date Time)</div>
    </TableHeadCell>
    <TableHeadCell class="h-6 px-2 py-1 text-xs">
      <div class="flex items-center justify-center">Power</div>
    </TableHeadCell>
    <TableHeadCell class="h-6 px-2 py-1 text-xs">
      <div class="flex items-center justify-center">Ambient</div>
    </TableHeadCell>
    <TableHeadCell class="h-6 px-2 py-1 text-xs">
      <div class="flex items-center justify-center">Unfrozen</div>
    </TableHeadCell>
    <TableHeadCell class="h-6 px-2 py-1 text-xs">
      <div class="flex items-center justify-center">Frozen</div>
    </TableHeadCell>
  </TableHead>
  <TableBody>
    {#if $checkedValues.length > 0}
      {#each header as item, index}
        <TableBodyRow class="h-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <TableBodyCell class="h-6 px-2 py-1 text-xs">{item}</TableBodyCell>
          <TableBodyCell class="h-6 px-2 py-1">
            <div class="flex items-center justify-center">
              <Checkbox class="h-3 w-3" bind:checked={$checkedValues[index].xAxis} />
            </div>
          </TableBodyCell>
          <TableBodyCell class="h-6 px-2 py-1">
            <div class="flex items-center justify-center">
              <Checkbox class="h-3 w-3" bind:checked={$checkedValues[index].power} />
            </div>
          </TableBodyCell>
          <TableBodyCell class="h-6 px-2 py-1">
            <div class="flex items-center justify-center">
              <Checkbox class="h-3 w-3" bind:checked={$checkedValues[index].ambient} />
            </div>
          </TableBodyCell>
          <TableBodyCell class="h-6 px-2 py-1">
            <div class="flex items-center justify-center">
              <Checkbox class="h-3 w-3" bind:checked={$checkedValues[index].unfrozen} />
            </div>
          </TableBodyCell>
          <TableBodyCell class="h-6 px-2 py-1">
            <div class="flex items-center justify-center">
              <Checkbox class="h-3 w-3" bind:checked={$checkedValues[index].frozen} />
            </div>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    {:else}
      <TableBodyRow>
        <TableBodyCell colspan="6" class="text-center py-4">
          Loading...
        </TableBodyCell>
      </TableBodyRow>
    {/if}
  </TableBody>
</Table>