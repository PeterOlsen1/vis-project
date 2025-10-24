<script lang="ts">
    import type { Order } from "@data-types/order";
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { bucketByFrequency } from "@utils/bucketData";
    import { loadCityLatLngData, loadGeographyData } from "@utils/loadData";
    import { Loader } from '@components/loader';
    import type { City, CityData, CityGeoData } from "@data-types/cityData";
    import Page from "../../../routes/+page.svelte";

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
    let cityGeoData = $state<any>(null);
    let tooltip = $state<HTMLDivElement | null>(null);
    let showCircles = $state<boolean>(true);
    let effectRunning = $state<boolean>(true);
    let circlesCreated = $state<boolean>(false);

    let startDateRaw = $state<string>('');
    let endDateRaw = $state<string>('');
    let startDate = $derived<Date>(new Date(startDateRaw));
    let endDate = $derived<Date>(new Date(endDateRaw));
    
    const normalizeCountryName = (name: string): string => {
        // dataset country name : geography country name
        const countryMap: Record<string, string> = {
            "Guinea-Bissau": "Guinea Bissau",
            "Serbia": "Republic of Serbia",
            "Tanzania": "United Republic of Tanzania",
            "United States": "USA",
            "United Kingdom": "England",
            "Myanmar (Burma)": "Myanmar",
        };
        return countryMap[name] || name;
    };

    const getCircleSize = (v: number): number => {
        return Math.sqrt(v) * 1.5;
    }

    const getHoveredCircleSize = (v: number): number => {
        return Math.sqrt(v) * 1.5;
    }

    // powers the circles
    let cityFreqs = $state<Record<string, Record<string, number>>>({});

    // loops over city buckets and applies callback function with city and country
    let loopOverCityFreqs = (fn: (country: string, city: string) => void): void => {
        Object.entries(cityFreqs).forEach(([country, cities]) => {
            Object.keys(cities || {}).forEach((city) => fn(country, city));
        });
    };

    // batch updates city buckets variable
    const updateCityFreqs = () => {
        if (!data) {
            return {};
        }
        const out = {...cityFreqs};

        loopOverCityFreqs((country, city) => {
            cityFreqs[country][city] = 0;
        });

        data.forEach(order => {
            // date check
            const orderDate = new Date(order.orderDate);
            if (startDate || endDate) {
                if (orderDate < startDate || orderDate > endDate) {
                    return;
                }
            }

            let country = out[order.country];
            if (!country) {
                out[order.country] = {};
                country = out[order.country];
            }

            out[order.country][order.city] = (out[order.country][order.city] || 0) + 1;
        });

        //reassign in batch to avoid too many updates
        cityFreqs = {...out}
    }

    // country : frequency buckets
    let dataBuckets = $derived.by(() => {
        const buckets = bucketByFrequency(data || []);
        const remappedBuckets: Record<string, number> = {};
        for (const [country, count] of Object.entries(buckets)) {
            const normalizedName = normalizeCountryName(country);
            remappedBuckets[normalizedName] = (remappedBuckets[normalizedName] || 0) + count;
        }
        return remappedBuckets;
    });

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

    // load geography data only once on component mount
    onMount(async () => {
        geography = await loadGeographyData();
        cityGeoData = await loadCityLatLngData();
        updateCityFreqs();
    });

    // initial loading of the countries
    // wrapped in an $effect since it needs to run when data is updated
    $effect(() => {
        if (loading || error || !data || !geography) {
            return;
        }

        if (!g) {
            console.error("g is not defined");
            return;
        }

        effectRunning = true;

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

        effectRunning = false;
    })

    // load circles
    // runs when data is manipulated, but returns quickly if the circles have been created already
    // this is to avoid heavy re-computation every time cityFreqs is changed
    $effect(() => {
        if (loading || error || !data || !geography || !g || circlesCreated || !cityGeoData) {
            return;
        }

        const cityGroup = d3.select(g).append("g").attr("class", "cities");
        
        console.log(cityGeoData);
        let cityData: CityData[] = [];
        loopOverCityFreqs((country, city) => {
            if (!cityGeoData[country]) {
                console.log(`Country ${country} not found in cityGeoData!`);
                return;
            }
            if (!cityGeoData[country][city]) {
                // console.log(`${city}, ${country} not found in cityGeoData`);
                return;
            }
            const normalizedCountry = normalizeCountryName(country);
            
            // // this is slow operation O(n). use hashmap that points to indicies instead?
            // const countryFeature = geography.features.find(
            //     (f: any) => f.properties.name === normalizedCountry
            // );
            
            // if (!countryFeature) {
            //     console.warn(`Country not found: ${country} (normalized: ${normalizedCountry})`);
            //     return null;
            // }
            
            // const centroid = path.centroid(countryFeature);
            // const bounds = path.bounds(countryFeature);
            
            // const hash = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            // const offsetX = ((hash % 100) - 50) / 100 * (bounds[1][0] - bounds[0][0]) * 0.3;
            // const offsetY = ((hash % 73) - 36) / 100 * (bounds[1][1] - bounds[0][1]) * 0.3;

            const [x, y] = projection([cityGeoData[country][city].lng, cityGeoData[country][city].lat]);

            if (isNaN(x) || isNaN(y)) {
                console.log('nan!!')
            }
            
            cityData.push({
                city,
                country,
                count: cityFreqs[country][city] || 1,
                normalizedCountry,
                // x: centroid[0] + offsetX,
                // y: centroid[1] + offsetY,
                x,
                y,
            });
        });
        cityData = cityData.filter(d => d !== null);

        cityGroup
            .selectAll("circle")
            .data(cityData)
            .join("circle")
            .attr('id', d => `${d.city}-${d.country}`)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => getCircleSize(d.count))
            .attr("fill", "rgba(255, 100, 0, 0.6)")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.8)
            .style("pointer-events", "all")
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("fill", "rgba(255, 150, 0, 0.9)")
                    .attr("r", getHoveredCircleSize(d.count));
                
                if (tooltip) {
                    tooltip.style.display = "block";
                    tooltip.style.left = `${event.pageX + 10}px`;
                    tooltip.style.top = `${event.pageY + 10}px`;
                    tooltip.innerHTML = `
                        <strong>${d.city}</strong><br/>
                        Country: ${d.country}<br/>
                        Orders: ${d.count}
                    `;
                }
            })
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .attr("fill", "rgba(255, 100, 0, 0.6)")
                    .attr("r", getCircleSize(d.count));
                
                if (tooltip) {
                    tooltip.style.display = "none";
                }
            })
            .on("click", (event, d) => {
                // clicking on two dots in the same coutnry de-selects the country
                selectedCountry = selectedCountry === d.normalizedCountry ? '' : d.normalizedCountry;
            });

        circlesCreated = true;
    });

    $effect(() => {
        loopOverCityFreqs((country, city) => {
            const q = `${city}-${country}`;
            const circle = svg?.getElementById(q);
            if (circle) {
                d3.select(circle)
                    .transition()
                    .duration(200)
                    .attr('r', getCircleSize(cityFreqs[country][city] || 0));
            }
        });
    });

    // toggle circle display
    // only runs when showCircles is toggled
    $effect(() => {
        if (showCircles) {
            d3.selectAll('circle')
                .attr('display', 'block');
        } else {
            d3.selectAll('circle')
                .attr('display', 'none');
        }
    });
</script>

<main>
    <div class="tooltip" bind:this={tooltip}></div>
    <div class="map-container">
        {#if effectRunning}
            <Loader />
        {/if}
        <svg {width} {height} bind:this={svg} style="display: {effectRunning ? 'none' : 'block'}">
            <g bind:this={g}></g>
        </svg>
    </div>
    <div>
        <input type="checkbox" id="map-show-circles" bind:checked={showCircles}>
        <label for="map-show-circles">
            Show circles?
        </label>
    </div>
    <div>
        start date
        <input type="date" bind:value={startDateRaw} oninput={updateCityFreqs}>
    </div>
    <div>
        end date
        <input type="date" bind:value={endDateRaw} oninput={updateCityFreqs}>
    </div>
</main>

<style>
    * {
        transition: all 0.3s ease;
    }

    circle {
        transform-box: fill-box;
        transform-origin: center;
        transition: transform 240ms ease;
    }

    .map-container {
        width: 100%;
        min-height: 50vh;
        display: grid;
        place-items: center;
    }
    
    .tooltip {
        display: none;
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 10px 12px;
        border-radius: 4px;
        font-size: 13px;
        pointer-events: none;
        z-index: 1000;
        line-height: 1.5;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
</style>
