<!-- src/lib/components/BreadCrumb.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';

  const segments = derived(page, $page => {
    const parts = $page.url.pathname.split('/').filter(Boolean);
    return parts.map((segment, index) => ({
      name: segment,
      href: '/' + parts.slice(0, index + 1).join('/')
    }));
  });

  function changeReadableName(name:string) {
    return name.replace("-"," ").toUpperCase();
  }
 </script>

<nav class="text-sm px-4 py-2 text-gray-600">
  <ol class="flex flex-wrap items-center space-x-2">
    <li>
      <a href="/" class="text-blue-600 hover:underline">Home</a>
    </li>
    {#each $segments as segment}
      <li>/</li>
      <li>
        <a href={segment.href} class="text-gray-800 hover:underline">{changeReadableName(segment.name)}</a>
      </li>
    {/each}
  </ol>
</nav>
