<script>
  import {
    Button,
    CloseButton,
    Drawer,
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
  } from "flowbite-svelte";
  import {
    AlignJustifyOutline,
    ChartPieSolid,
    ShoppingBagSolid,
    UsersSolid,
  } from "flowbite-svelte-icons";
  import BreadCrumb from "./BreadCrumb.svelte";
  let hidden2 = $state(true);
  let spanClass = "flex-1 ms-3 whitespace-nowrap";
</script>

<div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900">
  <!-- 햄버거 버튼 -->
  <Button size="xs" onclick={() => (hidden2 = false)} class="mr-2">
    <AlignJustifyOutline />
  </Button>

  <!-- BreadCrumb을 오른쪽 공간에 맞게 자동 줄 바꿈 없이 표시 -->
  <div class="flex-1 overflow-x-auto">
    <BreadCrumb />
  </div>
</div>
<Drawer bind:hidden={hidden2} class="w-fit bg-gray-50 p-0 dark:bg-gray-800">
  <div class="flex items-center justify-between px-2 pt-4">
    <h5
      class="px-4 text-base font-semibold text-gray-500 uppercase dark:text-gray-400"
    >
      Menu
    </h5>
    <CloseButton onclick={() => (hidden2 = true)} class="dark:text-white" />
  </div>
  <Sidebar class="static">
    <SidebarWrapper
      class="overflow-y-auto rounded-sm px-3 py-4 dark:bg-gray-800"
    >
      <SidebarGroup>
        <SidebarItem label="Main" href="/" onclick={() => (hidden2 = true)}>
          {#snippet icon()}
            <ChartPieSolid onclick={() => (hidden2 = true)}
              class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
            />
          {/snippet}
        </SidebarItem>
        <SidebarItem label="Steady State" href="/steady-state" onclick={() => (hidden2 = true)}>
          {#snippet icon()}
            <ChartPieSolid onclick={() => (hidden2 = true)}
              class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
            />
          {/snippet}
        </SidebarItem>
        <SidebarItem label="Storage Temperature" href="/storage-temperature" onclick={() => (hidden2 = true)}>
          {#snippet icon()}
            <ChartPieSolid onclick={() => (hidden2 = true)}
              class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
            />
          {/snippet}
        </SidebarItem>
      </SidebarGroup>
    </SidebarWrapper>
  </Sidebar>
</Drawer>
