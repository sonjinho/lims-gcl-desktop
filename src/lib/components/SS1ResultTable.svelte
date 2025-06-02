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
  export let ss2Result;
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
{#if ss2Result}
  <Table divClass="h-96 overflow-y-auto mb-40">
    <!-- 
  Number of TCC in D period	"Number of TCC 
in F period"	Length of D	Length of F 			Spread Unfrozen Temp 	Spread Frozen Temp 	Spread of Power	Spread of Power	Ratio D & F	Time from D to previous heter on

  -->
    <TableHead>
      <TableHeadCell></TableHeadCell>
      <TableHeadCell>TCC in D</TableHeadCell>
      <TableHeadCell>TCC in F</TableHeadCell>
      <TableHeadCell>Length of D</TableHeadCell>
      <TableHeadCell>Length of F</TableHeadCell>
      <TableHeadCell>∆t D1</TableHeadCell>
      <TableHeadCell>∆t F1</TableHeadCell>
      <TableHeadCell>Spread Unfrozen Temp</TableHeadCell>
      <TableHeadCell>Spread Frozen Temp</TableHeadCell>
      <TableHeadCell>Spread of Power</TableHeadCell>
      <TableHeadCell>Spread of Power</TableHeadCell>
      <TableHeadCell>Ratio D & F</TableHeadCell>
      <TableHeadCell>Time from D to previous heater on</TableHeadCell>
      <TableHeadCell>∆𝐸𝑑𝑓</TableHeadCell>
      <TableHeadCell>∆𝑇ℎ𝑑𝑟</TableHeadCell>
      <TableHeadCell>∆𝑇ℎ𝑑𝑓</TableHeadCell>
    </TableHead>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell>Permitted</TableBodyCell>
        <!-- 
        > = 3	> = 3	> = 3	> = 3	> = 3	> = 3	< 0.5	< 0.5	< 1	< 2%	0.8 ~ 1.25	> = 5
        -->

        <TableBodyCell>{">= 3"}</TableBodyCell>
        <TableBodyCell>{">= 3"}</TableBodyCell>
        <TableBodyCell>{">= 3"}</TableBodyCell>
        <TableBodyCell>{">= 3"}</TableBodyCell>
        <TableBodyCell>{">= 3"}</TableBodyCell>
        <TableBodyCell>{">= 3"}</TableBodyCell>
        <TableBodyCell>{"< 0.5"}</TableBodyCell>
        <TableBodyCell>{"< 0.5"}</TableBodyCell>
        <TableBodyCell>{"< 1"}</TableBodyCell>
        <TableBodyCell>{"< 2%"}</TableBodyCell>
        <TableBodyCell>{"0.8 ~ 1.25"}</TableBodyCell>
        <TableBodyCell>{">=5"}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell>Result</TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dTCC.toFixed(2)}</p>
          <Tooltip>{ss2Result.dTCC}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.fTCC.toFixed(2)}</p>
          <Tooltip>{ss2Result.fTCC}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dDuration.toFixed(2)}</p>
          <Tooltip>{ss2Result.dDuration}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.fDuration.toFixed(2)}</p>
          <Tooltip>{ss2Result.fDuration}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dNominalDuration.toFixed(2)}</p>
          <Tooltip>{ss2Result.dNominalDuration}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.fNominalDuration.toFixed(2)}</p>
          <Tooltip>{ss2Result.fNominalDuration}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dfSpreadUnfrozenTemp.toFixed(2)}</p>
          <Tooltip>{ss2Result.dfSpreadUnfrozenTemp}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dfSpreadFrozenTemp.toFixed(2)}</p>
          <Tooltip>{ss2Result.dfSpreadFrozenTemp}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dfSpreadPowerWatt.toFixed(2)}</p>
          <Tooltip>{ss2Result.dfSpreadPowerWatt}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{(ss2Result.dfSpreadPowerPercent * 100).toFixed(2)}</p>
          <Tooltip>{ss2Result.dfSpreadPowerPercent * 100}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.dfRatio.toFixed(2)}</p>
          <Tooltip>{ss2Result.dfRatio}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.previousDefrostPeriodDDuration.toFixed(2)}</p>
          <Tooltip>{ss2Result.previousDefrostPeriodDDuration}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.Edf.toFixed(2)}</p>
          <Tooltip>{ss2Result.Edf}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.Thdf.evaluateUnfrozen.toFixed(2)}</p>
          <Tooltip>{ss2Result.Thdf.evaluateUnfrozen}</Tooltip>
        </TableBodyCell>
        <TableBodyCell>
          <p>{ss2Result.Thdf.evaluateFrozen.toFixed(2)}</p>
          <Tooltip>{ss2Result.Thdf.evaluateFrozen}</Tooltip>
        </TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
{:else}
  <p>Cannot calculate Period D,F</p>
{/if}
