<script>
    import {
    Button,
    ButtonGroup,
    Input,
    Label,
    Modal,
    Radio,
    Select,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Toggle,
  } from "flowbite-svelte";
  let {block, timeData} = $props();
  
</script>

<Table>
  <TableHead>
    <TableHeadCell>Target</TableHeadCell>
    <TableHeadCell>Start Index</TableHeadCell>
    <TableHeadCell>Start Time</TableHeadCell>
    <TableHeadCell>End Index</TableHeadCell>
    <TableHeadCell>End Time</TableHeadCell>
  </TableHead>
  <TableBody>
    <TableBodyRow>
      <TableBodyCell>Period X</TableBodyCell>
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodX.start} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodX.start])}
        </p></TableBodyCell
      >
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodX.end} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodX.end])}
        </p></TableBodyCell
      >
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>Period Y</TableBodyCell>
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodY.start} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodY.start])}
        </p></TableBodyCell
      >
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodY.end} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodY.end])}
        </p></TableBodyCell
      >
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>Period D</TableBodyCell>
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodD.start} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodD.start])}
        </p></TableBodyCell
      >
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodD.end} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodD.end])}
        </p></TableBodyCell
      >
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>Period F</TableBodyCell>
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodF.start} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodF.start])}
        </p></TableBodyCell
      >
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.periodF.end} />
      </TableBodyCell>
      <TableBodyCell
        ><p>
          {convertToTimeFormat(timeData[block.periodF.end])}
        </p></TableBodyCell
      >
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>Last Defrost</TableBodyCell>
      <TableBodyCell>Heater On</TableBodyCell>
      <TableBodyCell>Defrost Recovery</TableBodyCell>
      <TableBodyCell>Nominal Centre</TableBodyCell>
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>
        <Toggle bind:checked={block.lastPeriod} class="my-4"></Toggle>
      </TableBodyCell>
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.heaterOn} />
      </TableBodyCell>
      <TableBodyCell>
        <Input type="number" step="1" bind:value={block.defrostRecoveryIndex} />
      </TableBodyCell>
      <TableBodyCell>
        <Input
          type="number"
          step="1"
          bind:value={block.nominalDefrostRecoveryIndex}
        />
      </TableBodyCell>
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell></TableBodyCell>
      <TableBodyCell>
        <p>
          {convertToTimeFormat(timeData[block.heaterOn])}
        </p></TableBodyCell
      >
      <TableBodyCell>
        <p>
          {convertToTimeFormat(timeData[block.defrostRecoveryIndex])}
        </p></TableBodyCell
      >
      <TableBodyCell>
        <p>
          {convertToTimeFormat(timeData[block.nominalDefrostRecoveryIndex])}
        </p></TableBodyCell
      >
    </TableBodyRow>
  </TableBody>
</Table>
