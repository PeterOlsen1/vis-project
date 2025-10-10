<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="
	min-h-screen 
	w-screen 
	overflow-x-hidden 
	bg-primary">
	{@render children?.()}
</main>