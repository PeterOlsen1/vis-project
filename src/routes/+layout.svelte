<script lang="ts">
    import "../app.css";

    let { children } = $props();
</script>

<main
    class="
		min-h-screen
		w-screen
		overflow-x-hidden
		bg-primary"
>
    {@render children?.()}
</main>
