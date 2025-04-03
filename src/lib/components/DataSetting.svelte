<script>
  import { Select} from "./ui/select/index";
  import SelectContent from "./ui/select/select-content.svelte";
  import SelectItem from "./ui/select/select-item.svelte";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "./ui/table";
  export let data;

  let header = data[0];
  let powerIndex = 0;
  let ambientIndex = [];
</script>

<div class="space-y-4">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Field</TableHead>
        <TableHead>Selected</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Power</TableCell>
        <TableCell>
          <select>
            {#each header as item, index}
              <option value={index}>{item}</option>
            {/each}
          </select>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Ambient</TableCell>
        <TableCell>
          <Select>

          </Select>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
