<script>
  import Navbar from '$lib/components/Navbar.svelte';
	import '../app.css';
  import { Button } from "flowbite-svelte";
	let { children } = $props();
</script>
<Navbar />
<div>
{@render children()}
</div>