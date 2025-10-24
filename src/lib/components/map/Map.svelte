<script lang="ts">
    import type { Order } from "@data-types/order";
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { loadCityLatLngData, loadGeographyData } from "@utils/loadData";
    import { Loader } from '@components/loader';
    import {
        orderData,
        cityGeoData,
        geography,
        showCircles,
        startDateRaw,
        selectedCountry as _selectedCountry,
        endDateRaw,
        g, 
        svg,
        tooltip,
        countriesLoading,
        countryFreqs,
        cityFreqs,
    } from "./useMapStates.svelte";
    import { updateCityFreqs, renderCircles, updateCircleSize } from "./cityFunctions.svelte";
    import { loadCountries, getCountryFreqs } from "./countryFunctions.svelte";

    // make the props as minimal as possible so that other people can easily hook into the map
    type Props = {
        loading: boolean;
        error: Error | null;
        data: Order[] | null;
        selectedCountry: string;
        width?: number;
        height?: number;
    };
    let { loading, error, selectedCountry = $bindable(_selectedCountry.state), data, width = 960, height = 650 }: Props = $props();
    $inspect(_selectedCountry);

    const projection = d3
        .geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.5]);

    // load geography data only once on component mount
    onMount(async () => {
        geography.state = await loadGeographyData();
        cityGeoData.state = await loadCityLatLngData();
        loadCountries(projection);
    });

    // update data variable when loaded properly
    $effect(() => {
        if (!data) {
            return;
        }

        orderData.state = data;
    });

    $effect(() => {
        countryFreqs.state = getCountryFreqs(orderData.state);
    });

    // load circles
    // runs when data is manipulated, but returns quickly if the circles have been created already
    // this is to avoid heavy re-computation every time cityFreqs is changed
    $effect(() => {
        renderCircles(projection);
    });

    $effect(() => {
        cityFreqs.state = updateCityFreqs();
    })

    $effect(() => {
        console.log('circle size effect');
        updateCircleSize();
    });

    // toggle circle display
    // only runs when showCircles is toggled
    $effect(() => {
        if (showCircles.state) {
            d3.selectAll('circle')
                .attr('display', 'block');
        } else {
            d3.selectAll('circle')
                .attr('display', 'none');
        }
    });
</script>

<main>
    <div class="tooltip" bind:this={tooltip.state}></div>
    <div class="map-container">
        {#if countriesLoading.state}
            <Loader />
        {/if}
        <svg {width} {height} bind:this={svg.state} style="display: {countriesLoading.state ? 'none' : 'block'}">
            <g bind:this={g.state}></g>
        </svg>
    </div>
    <div>
        <input type="checkbox" id="map-show-circles" bind:checked={showCircles.state}>
        <label for="map-show-circles">
            Show circles?
        </label>
    </div>
    <div>
        start date
        <input type="date" bind:value={startDateRaw.state} oninput={updateCityFreqs}>
    </div>
    <div>
        end date
        <input type="date" bind:value={endDateRaw.state} oninput={updateCityFreqs}>
    </div>
</main>

<style>
    * {
        transition: all 0.3s ease;
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
