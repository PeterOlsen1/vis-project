<script lang="ts">
    import type { Order } from "@data-types/order";
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { bucketByFrequency } from "@utils/bucketData";
    import { loadGeographyData } from "@utils/loadData";

    type Props = {
        loading: boolean;
        error: Error | null;
        data: Order[] | null;
        selectedCountry: string;
        width?: number;
        height?: number;
    };
    let { loading, error, data, selectedCountry = $bindable(''), width = 960, height = 650 }: Props = $props();

    let geography = $state<any>(null);
    let dataBuckets = $derived.by(() => bucketByFrequency(data || []));
    $inspect(dataBuckets);
    let svg = $state<SVGSVGElement | null>(null);
    let g = $state<SVGGElement | null>(null);

    const projection = d3
        .geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    const colorScale = $derived.by(() => d3.scaleLog<string>()
        .domain([1, d3.max(Object.values(dataBuckets)) || 1])
        .range(["#f0f9e8", "#0868ac"]));
    $inspect(colorScale);

    onMount(async () => {
        geography = await loadGeographyData();
    });

    $effect(() => {
        if (loading || error || !data || !geography) {
            return;
        }

        if (!g) {
            console.error("g is not defined");
            return;
        }

        const selection = d3
            .select(g)
            .selectAll("path")
            .data(geography.features)
            .enter()
            .append("path")
            .attr("d", (d: any) => path(d))
            .attr("fill", "#ccc")
            .attr("stroke", "#333");

        selection.each((d: any, i, nodes) => {
            const ele = nodes[i];
            const country = geography.features[i].properties.name;
            const value = dataBuckets[country] || 0;
            const fill = colorScale(value);

            d3.select(ele)
                .attr("fill", fill)
                .on("mouseover", function () {
                    ele.setAttribute("fill", "orange");
                })
                .on("mouseout", function () {
                    ele.setAttribute("fill", fill);
                })
                .on("click", () => {     
                    selectedCountry = selectedCountry == country ? '' : country;
                });
        });
    })
</script>

<main>
    <svg {width} {height} bind:this={svg}>
        <g bind:this={g}></g>
    </svg>
</main>

<style>
    * {
        transition: all 0.3s ease;
    }
</style>
