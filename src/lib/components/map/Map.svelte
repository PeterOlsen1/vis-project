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
  animationTimeframe,
  animationPlaying,
  animationDelay,
  circlesRendered,
  circleMetric,
  showHeatmap,
  circleMetrics,
  heatmapMetric,
  heatmapMetrics,
  legendData,
} from "./mapStates.svelte";
import { updateCircleMetrics, renderCircles, updateCircleSize, updateRadiusScale } from "./circleFunctions.svelte";
import { startAnimation, pauseAnimation, stopAnimation, handleDelayChange } from "./animation.svelte";
import { loadStartEndDate } from "./utils";
import { loadCountries, getHeatmapMetricData, updateHeatmap, updateHeatmapMetricDataWithDateFilter } from "./heatmapFunctions.svelte";
import { renderCountryOverlay } from "./countryOverlay.svelte";
import { circleMetricLabels, heatmapMetricLabels } from "@data-types/metrics";
import { hideTooltip, showTooltip } from "./tooltip.svelte";

// make the props as minimal as possible so that other people can easily hook into the map
type Props = {
  loading: boolean;
  error: Error | null;
  data: Order[] | null;
  selectedCountry: string;
  width?: number;
  height?: number;
};

let { 
  loading, 
  error, 
  selectedCountry = $bindable(_selectedCountry.state), 
  data, 
  width = 960, 
  height = 650 
}: Props = $props();

const projection = d3
  .geoMercator()
  .scale(150)
  .translate([width / 2, height / 1.5]);

// load geography data only once on component mount
onMount(async () => {
  geography.state = await loadGeographyData();
  cityGeoData.state = await loadCityLatLngData();
  loadCountries(projection);
  loadStartEndDate();
});

$effect(() => {
  if (!data) {
    return;
  }
  orderData.state = data;
});

// Update country metric data when date range or metric changes
$effect(() => {
  if (orderData.state && (startDateRaw.state || endDateRaw.state || heatmapMetric.state)) {
    updateHeatmapMetricDataWithDateFilter();
  } else if (orderData.state) {
    heatmapMetrics.state = getHeatmapMetricData(orderData.state, heatmapMetric.state);
  }
});

// load circles - only when checkbox is toggled
$effect(() => {
  if (showCircles.state) {
    renderCircles(projection, g.state);
  }
});

$effect(() => {
  updateRadiusScale();
});

$effect(() => {
  circleMetrics.state = updateCircleMetrics();
});

$effect(() => {
  if (showCircles.state) {
    updateCircleSize();
  }
});

// Handle heatmap toggle and metric changes
$effect(() => {
  if (g.state && heatmapMetrics.state && Object.keys(heatmapMetrics.state).length > 0) {
    updateHeatmap(g.state, heatmapMetrics.state, showHeatmap.state, heatmapMetric.state);
    
    if (showHeatmap.state) {
      // Add hover interactions for heatmap
      d3.select(g.state)
        .selectAll('path')
        .each(function() {
          const path = d3.select(this);
          const countryName = path.attr('data-country');
          const countryData = heatmapMetrics.state[countryName];
          
          path
            .on('mouseover', function(event) {
              path.attr('opacity', 0.7);
              showTooltip(event, countryName, countryData, heatmapMetric.state);
            })
            .on('mouseout', function() {
              path.attr('opacity', 1);
              hideTooltip();
            })
            .on('mousemove', function(event) {
              showTooltip(event, countryName, countryData, heatmapMetric.state);
            });
        });
    } else {
      // Remove hover interactions
      d3.select(g.state)
        .selectAll('path')
        .on('mouseover', null)
        .on('mouseout', null)
        .on('mousemove', null)
        .attr('opacity', 1);
      hideTooltip();
    }
  }
});

// toggle circle display
$effect(() => {
  if (!svg.state) return;
  
  if (showCircles.state) {
    d3.select(svg.state)
      .selectAll('circle')
      .attr('display', 'block');
  } else {
    d3.select(svg.state)
      .selectAll('circle')
      .attr('display', 'none');
  }
});

$effect(() => {
  if (!_selectedCountry.state|| !geography.state) return;
  const countryData = geography.state.features.filter(
    (f: any) => f.properties.name === _selectedCountry.state
  );
  renderCountryOverlay(500, 300, countryData);
});

$effect(() => {  
  if (!_selectedCountry.state) {
    d3.select("#country-overlay").selectAll("path").remove();
  }
});

</script>

<main>
  <div class="tooltip" bind:this={tooltip.state}></div>
  
  <div class="controls-header">
    <div class="map-controls">
      <div class="control-item">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={showCircles.state}
          />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="10" cy="10" r="3" fill="currentColor"/>
          </svg>
          <span class="label-text">Circle Map</span>
        </label>
        
        {#if showCircles.state}
          <select bind:value={circleMetric.state} class="metric-select">
            {#each Object.entries(circleMetricLabels) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>
          <span class="selected-metric">{circleMetricLabels[circleMetric.state]}</span>
        {/if}
      </div>
      
      <div class="control-item">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={showHeatmap.state}
          />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <rect x="5" y="5" width="4" height="4" fill="currentColor" opacity="0.3"/>
            <rect x="11" y="5" width="4" height="4" fill="currentColor" opacity="0.6"/>
            <rect x="5" y="11" width="4" height="4" fill="currentColor" opacity="0.6"/>
            <rect x="11" y="11" width="4" height="4" fill="currentColor" opacity="0.9"/>
          </svg>
          <span class="label-text">Heatmap</span>
        </label>
        
        {#if showHeatmap.state}
          <select bind:value={heatmapMetric.state} class="metric-select">
            {#each Object.entries(heatmapMetricLabels) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>
          <span class="selected-metric">{heatmapMetricLabels[heatmapMetric.state]}</span>
        {/if}
      </div>
    </div>
    
    {#if showHeatmap.state && legendData.state}
      <div class="legend">
        <span class="legend-label">{heatmapMetricLabels[heatmapMetric.state]}:</span>
        <div class="legend-content">
          {#if legendData.state.type === 'gradient' && legendData.state.gradient}
            <div class="legend-gradient"></div>
            <div class="legend-labels">
              <span>{legendData.state.gradient.min}</span>
              <span>{legendData.state.gradient.max}</span>
            </div>
          {:else if legendData.state.type === 'categorical' && legendData.state.items}
            <div class="legend-categorical">
              {#each legendData.state.items as item}
                <div class="legend-item">
                  <div class="legend-color" style="background-color: {item.color}"></div>
                  <span>{item.label}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  
  <div class="map-container">
    {#if countriesLoading.state}
      <Loader />
    {/if}
    <svg 
      {width} 
      {height} 
      bind:this={svg.state} 
      style="display: {countriesLoading.state ? 'none' : 'block'}"
    >
      <g bind:this={g.state}></g>
    </svg>
  </div>
  
  <div class="date-controls">
    <div class="control-group">
      <label for="start-date">Start date</label>
      <input 
        type="date" 
        id="start-date" 
        bind:value={startDateRaw.state}
      >
    </div>
    <div class="control-group">
      <label for="end-date">End date</label>
      <input 
        type="date" 
        id="end-date" 
        bind:value={endDateRaw.state}
        min={startDateRaw.state || ''}
      >
    </div>
  </div>
  <br>
  <div class="date-controls">
    <div class="control-group">
      <label>
        Animation controls
      </label>
      <!-- SVGs generated with chat GPT -->
      {#if animationPlaying.state == 'playing'}
        <button onclick={() => {
            pauseAnimation();
          }}
          aria-label="pause animation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;">
            <rect x="5" y="4" width="3" height="12" fill="currentColor"/>
            <rect x="12" y="4" width="3" height="12" fill="currentColor"/>
          </svg>
        </button>
        <button onclick={() => {
            stopAnimation();
          }} 
          aria-label="stop animation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;">
            <rect x="5" y="5" width="10" height="10" fill="currentColor"/>
          </svg>
        </button>
      {:else if animationPlaying.state == 'paused'}
        <button onclick={() => {
            startAnimation();
          }} 
          aria-label="start animation"
          >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;">
            <polygon points="5,4 15,10 5,16" fill="currentColor"/>
          </svg>
        </button>
        <button onclick={() => {
            stopAnimation();
          }} 
          aria-label="stop animation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;">
            <rect x="5" y="5" width="10" height="10" fill="currentColor"/>
          </svg>
        </button>
      {:else}
        <button onclick={() => {
            startAnimation();
          }} 
          aria-label="start animation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;">
            <polygon points="5,4 15,10 5,16" fill="currentColor"/>
          </svg>
        </button>
      {/if}
    </div>
    <div class="control-group">
      <label for="timeframe-input">
        Timeframe
      </label>
      <select name="timeframe" id="timeframe-input" bind:value={animationTimeframe.state}>
        <option value="day">Day</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
    </div>
    <div class="control-group">
      <label for="timeframe-input">
        Delay (ms)
      </label>
      <input type="number" min="50" bind:value={animationDelay.state} onchange={handleDelayChange}>
    </div>
  </div>
  {#if _selectedCountry.state}
  <div class="country-overlay">
      <button onclick={() => _selectedCountry.state = ''}>&nbsp;[X]&nbsp;</button>
    <svg id="country-overlay" width="600" height="400"></svg>
  </div>
  {/if}

</main>

<style>
  button {
    cursor: pointer;
  }

  * {
    transition: all 0.3s ease;
  }

  main {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
  }

  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .map-controls {
    display: flex;
    gap: 2rem;
    background: white;
    border-radius: 10px;
    padding: 1rem 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
  }

  .control-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #4a90e2;
  }

  .checkbox-label svg {
    color: #666;
    transition: color 0.2s;
  }

  .checkbox-label input[type="checkbox"]:checked ~ svg {
    color: #4a90e2;
  }

  .label-text {
    font-weight: 600;
    font-size: 0.95rem;
    color: #333;
  }

  .checkbox-label:hover .label-text {
    color: #4a90e2;
  }

  .checkbox-label input[type="checkbox"]:checked ~ .label-text {
    color: #4a90e2;
  }

  .metric-select {
    padding: 0.5rem 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    background: #fafafa;
    color: #333;
    font-weight: 500;
    transition: all 0.2s;
    min-width: 200px;
  }

  .metric-select:hover {
    border-color: #4a90e2;
  }

  .metric-select:focus {
    outline: none;
    border-color: #4a90e2;
    background: white;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  }

  .selected-metric {
    display: none;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .legend-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #333;
  }

  .legend-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .legend-gradient {
    width: 150px;
    height: 20px;
    background: linear-gradient(to right, #deebf7, #3182bd);
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .legend-labels {
    display: flex;
    justify-content: space-between;
    width: 150px;
    font-size: 0.75rem;
    color: #666;
    font-weight: 500;
  }

  .legend-categorical {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .legend-item span {
    font-size: 0.75rem;
    color: #666;
    font-weight: 500;
  }

  .map-container {
    width: 100%;
    min-height: 50vh;
    display: grid;
    place-items: center;
    margin-bottom: 2rem;
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  svg {
    border-radius: 8px;
  }

  .date-controls {
    display: flex;
    gap: 2rem;
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 250px;

    label {
      font-weight: 600;
      color: #333;
      font-size: 0.9rem;
      white-space: nowrap;
    }

    input[type="date"], input[type="number"] {
      flex: 1;
      padding: 0.6rem 0.9rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: all 0.2s;
      background: #fafafa;

      &:focus {
        outline: none;
        border-color: #4a90e2;
        background: white;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1)
      }
    }
  }

  .tooltip {
    display: none;
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    pointer-events: none;
    z-index: 1000;
    line-height: 1.5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    main {
      padding: 1rem;
    }

    .controls-header {
      flex-direction: column;
      align-items: stretch;
    }

    .map-controls {
      width: 100%;
      flex-direction: column;
      gap: 1rem;
    }

    .control-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .metric-select {
      width: 100%;
    }

    .legend {
      width: 100%;
      justify-content: center;
    }

    .date-controls {
      flex-direction: column;
    }

    .control-group {
      width: 100%;
      min-width: auto;
    }

    .map-container {
      padding: 1rem;
    }
  }

  .country-overlay {
    position: absolute;
    top: 50px;
    right: 50px;
    width: 600px;
    height: 400px;
    background: white;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .country-overlay svg {
    width: 100%;
    height: 100%;
  }
</style>