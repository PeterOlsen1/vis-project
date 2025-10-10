<script lang="ts">
    import type { Order } from "@data-types/order";
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { ssrExportAllKey } from "vite/module-runner";

    type Props = {
        loading: boolean,
        error: Error | null,
        data: Order[] | null,
        width?: number,
        height?: number
    }
    const { loading, error, data, width=960, height=650 }: Props = $props();

    let svg = $state<SVGSVGElement | null>(null);
    let g = $state<SVGGElement | null>(null);

    const projection = d3.geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    onMount(async () => {
        const world: any = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
        console.log(world);

        if (!g) {
            console.error("g is not defined");
            return;
        }

        if (g) {
            const selection = d3.select(g).selectAll('path')
                .data(world.features)
                .enter().append("path")
                .attr("d", (d: any) => path(d))
                .attr("fill", "#ccc")
                .attr("stroke", "#333");

            selection.each((d: any, i, nodes) => {
                const ele = nodes[i];
                d3.select(ele)
                    .on('mouseover', function() {
                        ele.setAttribute('fill', 'orange')
                    })
                    .on('mouseout', function() {
                        ele.setAttribute('fill', '#ccc');
                    });
            });
        }
    });

</script>

<main>
    This is the map component
    <svg {width} {height} bind:this={svg}>
        <g bind:this={g}></g>
    </svg>
</main>

<style>
    * {
        transition:
            all 0.3s ease;
    }
</style>