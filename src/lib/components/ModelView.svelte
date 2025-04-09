<script>
  export let vendor;
  let sortedData = vendor.sort((a, b) =>
    a[0] === "Model" ? -1 : b[0] === "Model" ? 1 : 0
  );
</script>

<div class="mb-4 p-4 bg-blue-100 rounded-md">
  <strong>Model:</strong>
  {sortedData.find((row) => row[0] === "Model")?.[1] ?? "N/A"}
</div>

<div class="border rounded-md p-2">
  <table class="w-full border border-gray-300">
    <thead>
      <tr class="bg-gray-200">
        <th class="border px-4 py-2 text-left">Key</th>
        <th class="border px-4 py-2 text-left">Value</th>
      </tr>
    </thead>
    <tbody>
      {#each vendor as row}
        <tr>
          <td class="border px-4 py-2 font-semibold">{row[0]}</td>
          <td class="border px-4 py-2">{row[1] ?? "-"}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
