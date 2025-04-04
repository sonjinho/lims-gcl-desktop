<script>
    import { Label, Input } from "flowbite-svelte";
    import IEC62552_ExportData from "$lib/util/iec.62552.3.util";

  export let analyzeData;

  const minDate = new Date(analyzeData[3][1]);
  const maxDate = new Date(analyzeData[analyzeData.length - 1][1]);
  const minDateStr = minDate.toISOString().slice(0, 16);
  const maxDateStr = maxDate.toISOString().slice(0, 16);
  let startTime = minDateStr;
  let endTime = maxDateStr;
  let numberOfTCC = 3;
  function exportData() {
    IEC62552_ExportData(analyzeData, new Date(startTime), new Date(endTime), numberOfTCC);
  }

</script>
<div class="flex flex-wrap items-center justify-end gap-4 p-4">
  <!-- 시작 시간 -->
  <div class="flex flex-col">
    <label for="start-time" class="text-sm font-semibold">Start Time</label>
    <input 
      id="start-time"
      title="from" 
      type="datetime-local" 
      bind:value={startTime} 
      min={minDateStr} 
      max={maxDateStr}
      class="border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary focus:outline-none"
    />
  </div>

  <!-- 종료 시간 -->
  <div class="flex flex-col">
    <label for="end-time" class="text-sm font-semibold">End Time</label>
    <input 
      id="end-time"
      title="end" 
      type="datetime-local" 
      bind:value={endTime} 
      min={minDateStr} 
      max={maxDateStr}
      class="border rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary focus:outline-none"
    />
  </div>

  <!-- 숫자 입력 -->
  <div class="flex flex-col">
    <label for="tcc-count" class="text-sm font-semibold">TCC Count</label>
    <input 
      id="tcc-count"
      type="number" 
      bind:value={numberOfTCC} 
      class="border rounded-md px-3 py-2 text-sm w-24 focus:ring focus:ring-primary focus:outline-none"
    />
  </div>

  <!-- 버튼 -->
  <button 
    onclick={exportData} 
    class="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-opacity-80 transition"
  >
    Export Data
  </button>
</div>
