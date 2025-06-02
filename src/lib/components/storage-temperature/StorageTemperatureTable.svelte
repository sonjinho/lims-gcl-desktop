<script lang="ts">
  import {
    isValidTV,
    selectedStore,
    type AnalyzeConfig,
  } from "$lib/store/selectedStore";
  import { storageTempConfigStore } from "$lib/store/storageTempConfigStore";
  import type { Period } from '$lib/types/period';

  import { differenceInSeconds } from "date-fns";
  import {
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Tooltip,
  } from "flowbite-svelte";

  let { data = [] } = $props();
  const header = data[0].map(String);
  const unit = data[1].map(String);
  const rawData = data.slice(2);
  let config = $selectedStore;
  const timeData = rawData.map((row) => new Date(row[config.xAxis] as string));

  interface Compartment {
    unfrozen: boolean;
    name: string;
    temp: number[];
  }

  function toUnfrozenCompartment(config: AnalyzeConfig): Compartment[] {
    let compartments: Compartment[] = [];
    if (isValidTV(config.freshFood)) {
      compartments.push({
        name: "Fresh-Food Compartment",
        unfrozen: true,
        temp: config.freshFood.temp,
      });
    }
    if (isValidTV(config.cellar)) {
      compartments.push({
        name: "Cellar Compartment",
        unfrozen: true,
        temp: config.cellar.temp,
      });
    }
    if (isValidTV(config.pantry)) {
      compartments.push({
        name: "Pantry Compartment",
        unfrozen: true,
        temp: config.pantry.temp,
      });
    }

    if (isValidTV(config.wineStorage)) {
      compartments.push({
        name: "Wine Storage Compartment",
        unfrozen: true,
        temp: config.wineStorage.temp,
      });
    }

    if (isValidTV(config.chill)) {
      compartments.push({
        name: "Chill Compartment",
        unfrozen: true,
        temp: config.chill.temp,
      });
    }

    return compartments;
  }
  function toFrozenCompartment(config: AnalyzeConfig): Compartment[] {
    let compartments: Compartment[] = [];
    if (isValidTV(config.frozenZeroStar)) {
      compartments.push({
        name: "0star",
        unfrozen: false,
        temp: config.frozenZeroStar.temp,
      });
    }
    if (isValidTV(config.frozenOneStar)) {
      compartments.push({
        name: "1star",
        unfrozen: false,
        temp: config.frozenOneStar.temp,
      });
    }
    if (isValidTV(config.frozenTwoStar)) {
      compartments.push({
        name: "2star",
        unfrozen: false,
        temp: config.frozenTwoStar.temp,
      });
    }
    if (isValidTV(config.frozenThreeStar)) {
      compartments.push({
        name: "3star",
        unfrozen: false,
        temp: config.frozenThreeStar.temp,
      });
    }
    if (isValidTV(config.frozenFourStar)) {
      compartments.push({
        name: "4star",
        unfrozen: false,
        temp: config.frozenFourStar.temp,
      });
    }

    return compartments;
  }
  const unfrozenCompartment = toUnfrozenCompartment(config);
  const frozenCompartment = toFrozenCompartment(config);
  function maxTemperature(tempIndex: number, from: number, to: number): number {
    if (from == to) return 0;
    if (from >= to) return 0;
    if (from < 0 || to > data.length) return 0;
    let max = -1000;
    for (let i = from; i <= to; i++) {
      max = Math.max(max, rawData[i][tempIndex]);
    }
    return max;
  }
  function maxCompartment(
    tempIndexes: number[],
    from: number,
    to: number
  ): any {
    if (from == to) return 0;
    if (from >= to) return 0;
    if (from < 0 || to > data.length) return 0;
    const maxTemps = tempIndexes.map((tempIndex) =>
      maxTemperature(tempIndex, from, to)
    );
    const maxT = Math.max(...maxTemps);
    return maxT;
  }
  function averageTemp(tempIndex: number, from: number, to: number): number {
    if (from == to) return 0;
    if (from >= to) return 0;
    if (from < 0 || to > data.length) return 0;
    let total = 0;
    for (let i = from; i <= to; i++) {
      total += rawData[i][tempIndex];
    }
    return total / (to - from + 1);
  }
  function averageCompartment(
    tempIndexes: number[],
    from: number,
    to: number
  ): number {
    let total = tempIndexes.reduce((a, b) => a + averageTemp(b, from, to), 0);
    return total / tempIndexes.length;
  }
  function riseCompartment(
    tempIndexes: number[],
    from1: number,
    to1: number,
    from2: number,
    to2: number
  ): number {
    let first = maxCompartment(tempIndexes, from1, to1);
    let second = maxCompartment(tempIndexes, from2, to2);
    return second - first;
  }

  function differenceTemp(
    tempIndex: number,
    periodS: Period,
    periodE: Period
  ): number {
    return (
      averageTemp(tempIndex, periodE.start, periodE.end) -
      averageTemp(tempIndex, periodS.start, periodS.end)
    );
  }
</script>

<Table class="text-sm" id="frozenTable">
  <TableHead defaultRow={false}>
    <tr>
      <TableHeadCell class="border-2 p-2 w-24" rowspan={3}>Target</TableHeadCell
      >
      <TableHeadCell class="border-2 p-2" rowspan={3}>Result</TableHeadCell>
      {#if frozenCompartment.length > 0}
        <TableHeadCell
          class="p-2 border-2"
          colspan={frozenCompartment.reduce((a, b) => a + b.temp.length, 0)}
          >Frozen compartment</TableHeadCell
        >
      {/if}
    </tr>
    <tr>

      {#if frozenCompartment.length > 0}
        {#each frozenCompartment as frozen}
          <TableHeadCell class="border-2 p-2" colspan={frozen.temp.length}
            >{frozen.name}</TableHeadCell
          >
        {/each}
      {/if}
    </tr>
    <tr>

      {#each frozenCompartment as frozen}
        {#each frozen.temp as index}
          <TableHeadCell class="border-2 p-2">{header[index]}</TableHeadCell>
        {/each}
      {/each}
    </tr>
  </TableHead>

  <TableBody>
    <!-- Period S -->
    <TableBodyRow
      ><TableBodyCell>Period S</TableBodyCell>
      <TableBodyCell
        >{(
          differenceInSeconds(
            timeData[$storageTempConfigStore.periodS.end],
            timeData[$storageTempConfigStore.periodS.start]
          ) / 3600
        ).toFixed(2) + " hours"}</TableBodyCell
      >
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>{""}</TableBodyCell>
      <TableBodyCell>{""}</TableBodyCell>

      {#each frozenCompartment as frozen}
        {#each frozen.temp as index}
          <TableBodyCell class="p-2">{unit[index]}</TableBodyCell>
        {/each}
      {/each}
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell class="p-2"><p>Warmest temp in Package</p></TableBodyCell>
      <TableBodyCell>{""}</TableBodyCell>
      {#each frozenCompartment as frozen}
        {#each frozen.temp as tempIndex}
          <TableBodyCell class="p-2">
            <p>
              {maxTemperature(
                tempIndex,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodS.end
              ).toFixed(2)}
            </p>
            <Tooltip>
              {maxTemperature(
                tempIndex,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodS.end
              )}
            </Tooltip>
          </TableBodyCell>
        {/each}
      {/each}
    </TableBodyRow>
    {#each frozenCompartment as frozen}
      <TableBodyRow>
        <TableBodyCell class="p-2"
          ><p>Warmest temp in Period {frozen.name}</p></TableBodyCell
        >
        <TableBodyCell class="p-2">
          <p>
            {maxCompartment(
              frozen.temp,
              $storageTempConfigStore.periodS.start,
              $storageTempConfigStore.periodS.end
            ).toFixed(2)}
          </p>
        </TableBodyCell>
      </TableBodyRow>
    {/each}
    <TableBodyRow>
      <TableBodyCell class="p-2"><p>Average temp in package</p></TableBodyCell>
      <TableBodyCell></TableBodyCell>
      {#each frozenCompartment as frozen}
        {#each frozen.temp as tempIndex}
          <TableBodyCell class="p-2"
            ><p>
              {averageTemp(
                tempIndex,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodS.end
              ).toFixed(2)}
            </p>
            <Tooltip>
              {averageTemp(
                tempIndex,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodS.end
              )}
            </Tooltip>
            </TableBodyCell
          >
        {/each}
      {/each}
    </TableBodyRow>
    <!-- D&R -->

    <TableBodyRow><TableBodyCell>D&R</TableBodyCell></TableBodyRow>
    <TableBodyRow>
      <TableBodyCell class="p-2"><p>Warmest temp in Package</p></TableBodyCell>
      <TableBodyCell></TableBodyCell>
      {#each frozenCompartment as frozen}
        {#each frozen.temp as tempIndex}
          <TableBodyCell class="p-2">
            <p>
              {maxTemperature(
                tempIndex,
                $storageTempConfigStore.periodS.end + 1,
                $storageTempConfigStore.periodE.start - 1
              ).toFixed(2)}
            </p>
            <Tooltip>
              {maxTemperature(
                tempIndex,
                $storageTempConfigStore.periodS.end + 1,
                $storageTempConfigStore.periodE.start - 1
              )}
            </Tooltip>
          </TableBodyCell>
        {/each}
      {/each}
    </TableBodyRow>
    {#each frozenCompartment as frozen}
      <TableBodyRow>
        <TableBodyCell class="p-2"
          ><p>Warmest temp in period {frozen.name}</p></TableBodyCell
        >
        <TableBodyCell class="p-2">
          <p>
            {maxCompartment(
              frozen.temp,
              $storageTempConfigStore.periodS.end + 1,
              $storageTempConfigStore.periodE.start - 1
            ).toFixed(2)}
          </p>
        </TableBodyCell>
      </TableBodyRow>
    {/each}
    {#each frozenCompartment as frozen}
      <TableBodyRow>
        <TableBodyCell class="p-2"
          >Temperature rise in {frozen.name}</TableBodyCell
        >
        <TableBodyCell class="p-2">
          <p>
            {riseCompartment(
              frozen.temp,
              $storageTempConfigStore.periodS.start,
              $storageTempConfigStore.periodS.end,
              $storageTempConfigStore.periodS.end + 1,
              $storageTempConfigStore.periodE.start - 1
            ).toFixed(2)}
          </p>
          <Tooltip>
            <p>
              {riseCompartment(
                frozen.temp,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodS.end,
                $storageTempConfigStore.periodS.end + 1,
                $storageTempConfigStore.periodE.start - 1
              )}
            </p>
          </Tooltip>
        </TableBodyCell>
      </TableBodyRow>
    {/each}
    <!-- Period E -->
    <TableBodyRow
      ><TableBodyCell>Period E</TableBodyCell>
      <TableBodyCell
        >{(
          differenceInSeconds(
            timeData[$storageTempConfigStore.periodE.end],
            timeData[$storageTempConfigStore.periodE.start]
          ) / 3600
        ).toFixed(2) + " hours"}</TableBodyCell
      >
    </TableBodyRow>

    <TableBodyRow>
      <TableBodyCell class="p-2"><p>Warmest temp in Package</p></TableBodyCell>
      <TableBodyCell>{""}</TableBodyCell>
      {#each frozenCompartment as frozen}
        {#each frozen.temp as tempIndex}
          <TableBodyCell class="p-2">
            <p>
              {maxTemperature(
                tempIndex,
                $storageTempConfigStore.periodE.start,
                $storageTempConfigStore.periodE.end
              ).toFixed(2)}
            </p>
            <Tooltip>
              {maxTemperature(
                tempIndex,
                $storageTempConfigStore.periodE.start,
                $storageTempConfigStore.periodE.end
              ).toFixed(2)}
            </Tooltip>
          </TableBodyCell>
        {/each}
      {/each}
    </TableBodyRow>
    {#each frozenCompartment as frozen}
      <TableBodyRow>
        <TableBodyCell class="p-2"
          ><p>Warmest temp in Period {frozen.name}</p></TableBodyCell
        >
        <TableBodyCell class="p-2">
          <p>
            {maxCompartment(
              frozen.temp,
              $storageTempConfigStore.periodE.start,
              $storageTempConfigStore.periodE.end
            ).toFixed(2)}
          </p>
        </TableBodyCell>
      </TableBodyRow>
    {/each}
    <TableBodyRow>
      <TableBodyCell class="p-2"><p>Average temp in package</p></TableBodyCell>
      <TableBodyCell>{""}</TableBodyCell>
      {#each frozenCompartment as frozen}
        {#each frozen.temp as tempIndex}
          <TableBodyCell class="p-2"
            ><p>
              {averageTemp(
                tempIndex,
                $storageTempConfigStore.periodE.start,
                $storageTempConfigStore.periodE.end
              ).toFixed(2)}
            </p>
            <Tooltip>
              {averageTemp(
                tempIndex,
                $storageTempConfigStore.periodE.start,
                $storageTempConfigStore.periodE.end
              )}
            </Tooltip></TableBodyCell
          >
        {/each}
      {/each}
    </TableBodyRow>

    <!-- Temperature difference of test packages in S and E phases -->
    <TableBodyRow>
      <TableBodyCell class="p-2"
        ><p>
          {"Temperature difference of test packages\n in S and E phases"}
        </p></TableBodyCell
      >
      <TableBodyCell>{""}</TableBodyCell>
      {#each frozenCompartment as frozen}
        {#each frozen.temp as tempIndex}
          <TableBodyCell class="p-2"
            ><p>
              {differenceTemp(
                tempIndex,
                $storageTempConfigStore.periodS,
                $storageTempConfigStore.periodE
              ).toFixed(2)}
            </p></TableBodyCell
          >
        {/each}
      {/each}
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>Total Duration</TableBodyCell>
      <TableBodyCell>
        {(
          differenceInSeconds(
            timeData[$storageTempConfigStore.periodE.end],
            timeData[$storageTempConfigStore.periodS.start]
          ) / 3600
        ).toFixed(2) +" hours"}
      </TableBodyCell>
    </TableBodyRow>
  </TableBody>
</Table>

<Table id="unfrozenTable">
  <TableHead defaultRow={false}>
    <tr>
      <TableHeadCell class="border-2 p-2 w-24" rowspan={3}>Target</TableHeadCell
      >
      <TableHeadCell class="border-2 p-2" rowspan={3}>Result</TableHeadCell>
      <TableHeadCell
        class="border-2 p-2"
        rowspan={2}
        colspan={config.ambient.length}
      >
        Ambient
      </TableHeadCell>
      {#if unfrozenCompartment.length > 0}
        <TableHeadCell
          class="p-2 border-2"
          colspan={unfrozenCompartment.reduce((a, b) => a + b.temp.length, 0)}
          >Unfrozen compartment</TableHeadCell
        >
      {/if}
    </tr>
    <tr>
      {#if unfrozenCompartment.length > 0}
        {#each unfrozenCompartment as unfrozen}
          <TableHeadCell class="border-2 p-2" colspan={unfrozen.temp.length}
            >{unfrozen.name}</TableHeadCell
          >
        {/each}
      {/if}
    </tr>
    <tr>
      {#each config.ambient as ambient}
        <TableHeadCell class="border-2 p-2">{header[ambient]}</TableHeadCell>
      {/each}
      {#each unfrozenCompartment as unfrozen}
        {#each unfrozen.temp as index}
          <TableHeadCell class="border-2 p-2">{header[index]}</TableHeadCell>
        {/each}
      {/each}
    </tr>
  </TableHead>
  <TableBody>
    <TableBodyRow>
      <TableBodyCell>
        {"Ambient temp in test period"}
      </TableBodyCell>
      <TableBodyCell></TableBodyCell>
      {#each config.ambient as ambient}
        <TableBodyCell class="p-2">
          <p>
            {averageTemp(
              ambient,
              $storageTempConfigStore.periodS.start,
              $storageTempConfigStore.periodE.end
            ).toFixed(2)}
          </p>
          <Tooltip>
            {averageTemp(
              ambient,
              $storageTempConfigStore.periodS.start,
              $storageTempConfigStore.periodE.end
            )}
          </Tooltip>
        </TableBodyCell>
      {/each}
    </TableBodyRow>
    <TableBodyRow>
      <TableBodyCell>
        {"Temperature in unfrozen compartment in test period"}
      </TableBodyCell>
      <TableBodyCell></TableBodyCell>
      {#each config.ambient as ambient}
        <TableBodyCell class="p-2"></TableBodyCell>
      {/each}
      {#each unfrozenCompartment as unfrozen}
        {#each unfrozen.temp as tempIndex}
          <TableBodyCell class="p-2">
            <p>
              {averageTemp(
                tempIndex,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodE.end
              ).toFixed(2)}
            </p>
            <Tooltip
              >{averageTemp(
                tempIndex,
                $storageTempConfigStore.periodS.start,
                $storageTempConfigStore.periodE.end
              )}</Tooltip
            >
          </TableBodyCell>
        {/each}
      {/each}
    </TableBodyRow>
    {#each unfrozenCompartment as unfrozen}
      <TableBodyRow>
        <TableBodyCell>{unfrozen.name}</TableBodyCell>
        <TableBodyCell>
          <p>{averageCompartment(
            unfrozen.temp,
            $storageTempConfigStore.periodS.start,
            $storageTempConfigStore.periodE.end
          ).toFixed(2)}</p>
          <Tooltip>
            {averageCompartment(
              unfrozen.temp,
              $storageTempConfigStore.periodS.start,
              $storageTempConfigStore.periodE.end
            )}
          </Tooltip>
        </TableBodyCell>
      </TableBodyRow>
    {/each}
  </TableBody>
</Table>
