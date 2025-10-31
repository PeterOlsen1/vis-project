<script lang="ts">
    import { Map } from "@components/map";
    import { loadData } from "@utils/loadData";
    import { onMount } from "svelte";
    import type { Order } from "@data-types/order";

    let data = $state<Order[] | null>(null);
    let error = $state<Error | null>(null);
    let loading = $state(true);
    let selectedCountry = $state('');

    onMount(async () => {
        try {
            data = await loadData();
        } catch (e: unknown) {
            error = e instanceof Error ? e : null;
        } finally {
            loading = false;
        }
    });
</script>

<main>
    <!-- would be nice if the selected country bind worked, maybe figure this out later -->
     <!-- not necessary though -->
    <Map {loading} {data} {error} bind:selectedCountry={selectedCountry}/>
</main>

<style>
    main {
        width: 100vw;
        height: 100vh;
        display: flex;
        padding-top: 2em;
        align-items: center;
        flex-direction: column;
    }
</style>
