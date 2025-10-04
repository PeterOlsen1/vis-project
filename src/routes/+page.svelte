<script lang="ts">
    import { Map } from '@components/map';
    import { loadData } from '@utils/loadData'
    import { onMount } from 'svelte';
    import type { Order } from '@data-types/order';

    let data = $state<Order[]|null>(null);
    let error = $state<Error|null>(null);
    let loading = $state(true);

    onMount(async () => {
        try {
            data = await loadData();
        }
        catch (e: unknown) {
            error = e instanceof Error ? e : null;
        }
        finally {
            loading = false;
        }
    });
</script>

<main>
    Hello??
    <Map loading={loading} data={data} error={error}/>
</main>