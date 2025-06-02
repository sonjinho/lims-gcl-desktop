<script lang="ts">
  import { workSheet2, workSheet3 } from "$lib/util/excel.utils";
  import type { SS2Result } from "$lib/util/iec.62552.3.ss2.util";
  import {
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";

  export let ss2Result: SS2Result;
  const xyResult = workSheet2(ss2Result);
  const dfResult = workSheet3(ss2Result);
  function Temperature(ss2Result: SS2Result): any[] {
    const Thdf = ss2Result.Thdf;
    const TSS = ss2Result.TSS2;

    const compartments: { label: string; key: keyof typeof Thdf }[] = [
      { label: "Fresh Food", key: "freshFood" },
      { label: "Cellar", key: "cellar" },
      { label: "Wine Storage", key: "wineStorage" },
      { label: "Chill", key: "chill" },
      { label: "Frozen Zero Star", key: "frozenZeroStar" },
      { label: "Frozen One Star", key: "frozenOneStar" },
      { label: "Frozen Two Star", key: "frozenTwoStar" },
      { label: "Frozen Three Star", key: "frozenThreeStar" },
      { label: "Frozen Four Star", key: "frozenFourStar" },
    ];

    return compartments.map(({ label, key }) => [
      label,
      Thdf[key] == -1000 ? "-" : Thdf[key],
      TSS[key] == -1000 ?  "-" : TSS[key],
      "",
    ]);
  }
</script>


<Table>
  <caption
    class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800"
  >
    Period X,Y
  </caption>
  <TableHead>
    <TableHeadCell>Parameter</TableHeadCell>
    <TableHeadCell>Period X</TableHeadCell>
    <TableHeadCell>Period Y</TableHeadCell>
    <TableHeadCell>Spread/Criteria</TableHeadCell>
    <TableHeadCell>Notes</TableHeadCell>
  </TableHead>
  <TableBody>

    {#each xyResult as row, index}
      {#if index > 0}
        <TableBodyRow>
          {#each row as item}
            <TableBodyCell>{item}</TableBodyCell>
          {/each}
        </TableBodyRow>
      {/if}
    {/each}
  </TableBody>
</Table>
<Table>
  <caption
    class="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800"
  >
    Period D,F
  </caption>
  <TableHead>
    <TableHeadCell>Parameter</TableHeadCell>
    <TableHeadCell>Period D</TableHeadCell>
    <TableHeadCell>Period F</TableHeadCell>
    <TableHeadCell>Spread/Criteria</TableHeadCell>
    <TableHeadCell>Notes</TableHeadCell>
  </TableHead>
  <TableBody>
    {#each dfResult as row, index}
      {#if index > 0}
        <TableBodyRow>
          {#each row as item}
            <TableBodyCell>{item}</TableBodyCell>
          {/each}
        </TableBodyRow>
      {/if}
    {/each}
  </TableBody>
</Table>
