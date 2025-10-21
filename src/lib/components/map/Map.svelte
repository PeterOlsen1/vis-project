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
        const normalizeCountryName = (name: string): string => {
        const countryMap: Record<string, string> = {
            'United States': 'USA',
            'England': 'United Kingdom',
            'Russia': 'Russia',
            'Tanzania': 'United Republic of Tanzania',
            'Vietnam': 'Vietnam',
            'South Korea': 'South Korea',
            'Czech Republic': 'Czech Republic',
            'Congo': 'Republic of the Congo',
        };
        
        return countryMap[name] || name;
    };

    
    let dataBuckets = $derived.by(() => {
        const buckets = bucketByFrequency(data || []);
        const remappedBuckets: Record<string, number> = {};
        for (const [country, count] of Object.entries(buckets)) {
            const normalizedName = normalizeCountryName(country);
            remappedBuckets[normalizedName] = (remappedBuckets[normalizedName] || 0) + count;
        }
        return remappedBuckets;
    });
   

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

        if (geography) {
            console.log("Geography country names:", 
                geography.features.map((f: any) => f.properties.name).sort()
            );
        }
    });

    $effect(() => {
        if (loading || error || !data || !geography) {
            return;
        }

        if (!g) {
            console.error("g is not defined");
            return;
        }
        const uniqueCountries = Array.from(
                new Set(data.map(d => d.country).filter(Boolean))
            );
        console.log("Countries in dataset:", uniqueCountries.sort());

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
        const cityGroup = d3.select(g).append("g").attr("class", "cities");

        const cityAggregation = new Map<string, { city: string; country: string; count: number; }>();

        data.forEach(order => {
            const key = `${order.city}, ${order.country}`;
            const existing = cityAggregation.get(key);
            if (existing) {
                existing.count++;
            } else {
                cityAggregation.set(key, {
                    city: order.city,
                    country: order.country,
                    count: 1
                });
            }
        });

        
        const cityData = Array.from(cityAggregation.values()).map(cityInfo => {
            
            const normalizedCountry = normalizeCountryName(cityInfo.country);
            
            
            const countryFeature = geography.features.find(
                (f: any) => f.properties.name === normalizedCountry
            );
            
            if (!countryFeature) {
                console.warn(`Country not found: ${cityInfo.country} (normalized: ${normalizedCountry})`);
                return null;
            }
            
            const centroid = path.centroid(countryFeature);
            const bounds = path.bounds(countryFeature);
            
            
            const hash = cityInfo.city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const offsetX = ((hash % 100) - 50) / 100 * (bounds[1][0] - bounds[0][0]) * 0.3;
            const offsetY = ((hash % 73) - 36) / 100 * (bounds[1][1] - bounds[0][1]) * 0.3;
            
            return {
                ...cityInfo,
                normalizedCountry,
                x: centroid[0] + offsetX,
                y: centroid[1] + offsetY,
            };
        }).filter(d => d !== null);

        cityGroup
            .selectAll("circle")
            .data(cityData)
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => Math.sqrt(d.count) * 1.5)
            .attr("fill", "rgba(255, 100, 0, 0.6)")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.8)
            .style("pointer-events", "all")
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("fill", "rgba(255, 150, 0, 0.9)")
                    .attr("r", Math.sqrt(d.count) * 2);
            })
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .attr("fill", "rgba(255, 100, 0, 0.6)")
                    .attr("r", Math.sqrt(d.count) * 1.5);
            })
            .on("click", (event, d) => {
                selectedCountry = selectedCountry === d.normalizedCountry ? '' : d.normalizedCountry;
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
