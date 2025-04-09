<script>
  import ExcelResultView from '$lib/components/ExcelResultView.svelte';
  import { excelDataStore } from '$lib/store/excelDataStore.js';
  export let data;
  data = $excelDataStore;
  console.log(data);
</script>

<ExcelResultView {data} />
