<script>
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';

  // 블록 이름과 버튼 그룹에 들어갈 버튼 목록을 props로 받음
  export let name = '';
  export let buttons = ['Save', 'Cancel']; // 기본 버튼
</script>

<div class="flex items-center gap-4 mb-4">
  <!-- 블록 이름 -->
  <div class="w-24 font-bold">{name}</div>
  
  <!-- 두 개의 Input -->
  <Input placeholder="From" class="w-80" type="datetime-local"/>
  <Input placeholder="End" class="w-80" type="datetime-local"/>
  
  <!-- 버튼 그룹 -->
  <div class="flex gap-2">
    {#each buttons as btn}
      <Button>{btn}</Button>
    {/each}
  </div>
</div>