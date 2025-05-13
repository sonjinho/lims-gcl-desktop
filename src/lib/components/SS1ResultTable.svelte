<script>
  import {
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Tooltip,
  } from "flowbite-svelte";

  export let exportRow;
</script>

<Table divClass="h-96 overflow-y-auto mb-40">
  <TableHead>
    <TableHeadCell>Block A</TableHeadCell>
    <TableHeadCell>Block B</TableHeadCell>
    <TableHeadCell>Block C</TableHeadCell>
    <TableHeadCell>Unfrozen Period</TableHeadCell>
    <TableHeadCell>Frozen Period</TableHeadCell>
    <TableHeadCell>Power Period</TableHeadCell>
    <TableHeadCell>Total Period (A+B+C)</TableHeadCell>
    <TableHeadCell>Ambient Temperature</TableHeadCell>
    <TableHeadCell>Spread Unfrozen</TableHeadCell>
    <TableHeadCell>Spread Frozen</TableHeadCell>
    <TableHeadCell>Spread Power</TableHeadCell>
    <TableHeadCell>Slope Unfrozen</TableHeadCell>
    <TableHeadCell>Slope Frozen</TableHeadCell>
    <TableHeadCell>Slope Power</TableHeadCell>
    <TableHeadCell>Permitted Power Spread</TableHeadCell>
    <TableHeadCell>Valid</TableHeadCell>
    <TableHeadCell>Test Period Valid</TableHeadCell>
    <TableHeadCell>PSS</TableHeadCell>
  </TableHead>
  <TableBody>
    {#each exportRow as row}
      <TableBodyRow>
        <TableBodyCell>{row.blockA}</TableBodyCell>
        <TableBodyCell>{row.blockB}</TableBodyCell>
        <TableBodyCell>{row.blockC}</TableBodyCell>
        <!-- <p></p> -->
        <TableBodyCell
          ><p>{row.testPeriodUnfrozen.toFixed(2)}</p>
          <Tooltip>{row.testPeriodUnfrozen}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.testPeriodFrozen.toFixed(2)}</p>
          <Tooltip>{row.testPeriodFrozen}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.testPeriodPower.toFixed(2)}</p>
          <Tooltip>{row.testPeriodPower}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.testPeriodABC.toFixed(2)}</p>
          <Tooltip>{row.testPeriodABC}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.ambientTemp.toFixed(2)}</p>
          <Tooltip>{row.ambientTemp}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.spreadUnfrozen.toFixed(2)}</p>
          <Tooltip>{row.spreadUnfrozen}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.spreadFrozen.toFixed(2)}</p>
          <Tooltip>{row.spreadFrozen}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.spreadPower.toFixed(2)}</p>
          <Tooltip>{row.spreadPower}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.slopeUnfrozen.toFixed(4)}</p>
          <Tooltip>{row.slopeUnfrozen}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.slopeFrozen.toFixed(4)}</p>
          <Tooltip>{row.slopeFrozen}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.slopePower.toFixed(4)}</p>
          <Tooltip>{row.slopePower}</Tooltip></TableBodyCell
        >
        <TableBodyCell
          ><p>{row.permittedPowerSpread.toFixed(2)}</p>
          <Tooltip>{row.permittedPowerSpread}</Tooltip></TableBodyCell
        >
        <TableBodyCell>{row.valid ? "✅" : "❌"}</TableBodyCell>
        <TableBodyCell>{row.testPeriodValid ? "✅" : "❌"}</TableBodyCell>
        <TableBodyCell
          ><p>{row.pss != 0 ? row.pss.toFixed(2) : "-"}</p>
          <Tooltip>{row.pss}</Tooltip></TableBodyCell
        >
      </TableBodyRow>
    {/each}
  </TableBody>
</Table>
