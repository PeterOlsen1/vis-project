<script lang="ts">
    import type { Order } from "@types";

    type Props = {
        loading: boolean,
        error: Error | null,
        data: Order[] | null,
    }
    const { loading, error, data }: Props = $props();
</script>

<main>
    This is the map component
</main>