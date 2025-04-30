<script>
  import { chartYAxisStore } from "$lib/store/chartYAxisStore";
  import {
    Button,
    ButtonGroup,
    Input,
    Label,
    Modal,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Toggle,
  } from "flowbite-svelte";
  import { CircleMinusOutline } from "flowbite-svelte-icons";
  import { createEventDispatcher } from "svelte";

  export let open;
  const dispatch = createEventDispatcher();
  function submit() {
    dispatch("event",{});
  }
</script>

<Modal size="xl" title="Edit Chart" bind:open autoclose={false}>
  <Table title="Y Axis">
    <TableHead>
      <TableHeadCell>Index</TableHeadCell>
      <TableHeadCell>Name</TableHeadCell>
      <TableHeadCell>Min</TableHeadCell>
      <TableHeadCell>Max</TableHeadCell>
      <TableHeadCell>Color</TableHeadCell>
      <TableHeadCell>Action</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each $chartYAxisStore.yAxis as yAxis, index}
        <TableBodyRow>
          <TableBodyCell>
            <Input type="number" step="1" bind:value={yAxis.index} />
          </TableBodyCell>
          <TableBodyCell>
            <Input type="text" bind:value={yAxis.name} />
          </TableBodyCell>
          <TableBodyCell>
            <Input type="number" bind:value={yAxis.min} />
          </TableBodyCell>
          <TableBodyCell>
            <Input type="number" bind:value={yAxis.max} />
          </TableBodyCell>
          <TableBodyCell>
            <Input type="number" bind:value={yAxis.color} />
          </TableBodyCell>
          <TableBodyCell>
            {#if index > 1}
            <ButtonGroup>
              <Button
                onclick={() => {
                  $chartYAxisStore.yAxis = $chartYAxisStore.yAxis.filter(
                    (axis) => axis.index !== yAxis.index
                  );
                }}><CircleMinusOutline /></Button
              >
            </ButtonGroup>
            {/if}
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
  <div class="flex justify-end">
    <Button
      onclick={() => {
        $chartYAxisStore.yAxis = [
          ...$chartYAxisStore.yAxis,
          {
            index: $chartYAxisStore.yAxis.length,
            name: "Power",
            min: 0,
            max: 600,
            positionLeft: false,
            color: 1,
          },
        ];
      }}>Add</Button
    >
  </div>
  <div class="w-full grid grid-cols-4 gap-4">
    {#each $chartYAxisStore.series as series}
      <div>
        <Label>
          {series.header} - YAxis Index
          <Input type="number" bind:value={series.yAxis} />
        </Label>
      </div>
    {/each}
  </div>

  <div class="flex justify-end">
    <Button onclick={submit}>Submit</Button>
  </div>
</Modal>
