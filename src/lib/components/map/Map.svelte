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
} from "./mapStates.svelte";
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

let { 
  loading, 
  error, 
  selectedCountry = $bindable(_selectedCountry.state), 
  data, 
  width = 960, 
  height = 650 
}: Props = $props();

$inspect(_selectedCountry);

let showHeatmap = $state(false);
let showCirclesToggle = $state(true);

const projection = d3
  .geoMercator()
  .scale(150)
  .translate([width / 2, height / 1.5]);

// Color scale for heatmap
let colorScale: d3.ScaleSequential<string> | null = null;

function updateHeatmap(
  targetG: SVGGElement | null,
  freqs: Record<string, number>,
  enabled: boolean
) {
  if (!targetG || !freqs) return;

  // Get all order counts
  const counts = Object.values(freqs);
  const maxCount = Math.max(...counts, 1);
  
  // Create color scale from light to dark blue
  colorScale = d3.scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateBlues);
  
  // Update country colors
  d3.select(targetG)
    .selectAll('path')
    .each(function() {
      const path = d3.select(this);
      const countryName = path.attr('data-country');
      const count = freqs[countryName] || 0;
      
      if (enabled) {
        path
          .attr('fill', colorScale ? colorScale(count) : '#e0e0e0')
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5);
      } else {
        path
          .attr('fill', '#e0e0e0')
          .attr('stroke', '#999')
          .attr('stroke-width', 0.5);
      }
    });
}

// Tooltip functions for heatmap
function showTooltip(event: MouseEvent, countryName: string, count: number) {
  if (!tooltip.state) return;
  
  const tooltipEl = d3.select(tooltip.state);
  tooltipEl
    .style('display', 'block')
    .html(`<strong>${countryName}</strong><br/>Total Orders: ${count.toLocaleString()}`)
    .style('left', `${event.pageX + 10}px`)
    .style('top', `${event.pageY - 10}px`);
}

function hideTooltip() {
  if (!tooltip.state) return;
  d3.select(tooltip.state).style('display', 'none');
}

// Function to update country frequencies based on date range
function updateCountryFreqsWithDateFilter() {
  if (!orderData.state) return;
  
  const startDate = startDateRaw.state ? new Date(startDateRaw.state) : null;
  const endDate = endDateRaw.state ? new Date(endDateRaw.state) : null;
  let filteredOrders = orderData.state;
  
  if (startDate || endDate) {
    filteredOrders = orderData.state.filter(order => {
      const orderDate = new Date(order.orderDate);
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;
      return true;
    });
  }
  
  // Update country frequencies with filtered data
  const newFreqs = getCountryFreqs(filteredOrders);
  
  // Force update by creating a new object
  countryFreqs.state = { ...newFreqs };
}

// load geography data only once on component mount
onMount(async () => {
  geography.state = await loadGeographyData();
  cityGeoData.state = await loadCityLatLngData();
  loadCountries(projection);
});

$effect(() => {
  if (!data) {
    return;
  }
  orderData.state = data;
});

// Update country frequencies when date range changes
$effect(() => {
  if (orderData.state && (startDateRaw.state || endDateRaw.state)) {
    updateCountryFreqsWithDateFilter();
  } else if (orderData.state) {
    countryFreqs.state = getCountryFreqs(orderData.state);
  }
});

// load circles
// runs when data is manipulated, but returns quickly if the circles have been created already
// this is to avoid heavy re-computation every time cityFreqs is changed
$effect(() => {
  renderCircles(projection, g.state, "");
});

$effect(() => {
  cityFreqs.state = updateCityFreqs();
});

$effect(() => {
  console.log('circle size effect');
  updateCircleSize();
});

// Handle heatmap toggle
$effect(() => {
  if (g.state && countryFreqs.state) {
    updateHeatmap(g.state, countryFreqs.state, showHeatmap);
    
    if (showHeatmap) {
      // Add hover interactions for heatmap
      d3.select(g.state)
        .selectAll('path')
        .each(function() {
          const path = d3.select(this);
          const countryName = path.attr('data-country');
          
          path
            .on('mouseover', function(event) {
              const currentCount = countryFreqs.state[countryName] || 0;
              path.attr('opacity', 0.7);
              showTooltip(event, countryName, currentCount);
            })
            .on('mouseout', function() {
              path.attr('opacity', 1);
              hideTooltip();
            })
            .on('mousemove', function(event) {
              const currentCount = countryFreqs.state[countryName] || 0;
              showTooltip(event, countryName, currentCount);
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

// Handle circles toggle
$effect(() => {
  showCircles.state = showCirclesToggle;
});

// toggle circle display
// only runs when showCircles is toggled
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

// Update heatmap when country frequencies change
$effect(() => {
  if (countryFreqs.state && g.state) {
    updateHeatmap(g.state, countryFreqs.state, showHeatmap);
  }
});

$effect(() => {
  if (!_selectedCountry.state|| !geography.state) return;
  const countryData = geography.state.features.filter(
    f => f.properties.name === _selectedCountry.state
  );
  renderCountryOverlay(500, 300, countryData); // hard coded width and height, should probably come up with a better solution
});

$effect(() => {  
  if (!_selectedCountry.state) {
    d3.select("#country-overlay").selectAll("path").remove();
  }
});


function renderCountryOverlay(width:number, height:number, countryData: any[]) {

  const projection = d3.geoMercator()
    .fitSize([width, height], countryData[0]);

  const path = d3.geoPath().projection(projection);

  const svg = d3.select("#country-overlay")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height);
  
  svg.selectAll("*").remove(); 

  const g = svg.append("g");
  g.selectAll("path")
    .data(countryData)
    .join("path")
    .attr("d", path)
    .attr("data-country", d => d.properties.name)
    .attr('fill', '#e0e0e0')
    .attr('stroke', '#999')
    .attr('stroke-width', 0.5)
    .attr('opacity', 1);


  const zoom: d3.ZoomBehavior<SVGSVGElement, unknown> = d3.zoom<SVGSVGElement, unknown>()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 40])
    .on("zoom", ({ transform }) => {
      g.attr("transform", transform.toString());
    d3.select(g.node())
      .selectAll('circle')
      .attr('transform', d => `translate(${transform.apply([d.x, d.y])}) scale(${transform.k})`);
    });
      
  svg.call(zoom);
  if (showHeatmap) {
    updateHeatmap(g.node(), countryFreqs.state, showHeatmap);
  }
  if (showCirclesToggle) {
    renderCircles(projection, g.node(), _selectedCountry.state);
  }
  
  g.selectAll(".outline")
    .data(countryData)
    .join("path")
    .attr("class", "outline")
    .attr("d", path)
    .attr("fill", "none")      
    .attr("stroke", "black")   
    .attr("stroke-width", 1);
}
</script>

<main>
  <div class="tooltip" bind:this={tooltip.state}></div>
  
  <div class="controls-header">
    <div class="checkbox-controls">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          bind:checked={showCirclesToggle}
        />
        <span class="checkbox-text">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="10" cy="10" r="3" fill="currentColor"/>
          </svg>
          Show Circles
        </span>
      </label>
      
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          bind:checked={showHeatmap}
        />
        <span class="checkbox-text">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <rect x="5" y="5" width="4" height="4" fill="currentColor" opacity="0.3"/>
            <rect x="11" y="5" width="4" height="4" fill="currentColor" opacity="0.6"/>
            <rect x="5" y="11" width="4" height="4" fill="currentColor" opacity="0.6"/>
            <rect x="11" y="11" width="4" height="4" fill="currentColor" opacity="0.9"/>
          </svg>
          Show Heatmap
        </span>
      </label>
    </div>
    
    {#if showHeatmap}
      <div class="legend">
        <span class="legend-label">Order Volume:</span>
        <div class="legend-container">
          <div class="legend-gradient"></div>
          <div class="legend-labels">
            <span>Low</span>
            <span>High</span>
          </div>
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
  {#if _selectedCountry.state}
  <div class="country-overlay">
      <button onclick={() => _selectedCountry.state = ''}>&nbsp;[X]&nbsp;</button>
    <svg id="country-overlay" width="600" height="400"></svg>
  </div>
  {/if}

</main>

<style>
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

  .checkbox-controls {
    display: flex;
    gap: 1.5rem;
    background: white;
    border-radius: 10px;
    padding: 1rem 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #4a90e2;
  }

  .checkbox-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.95rem;
    color: #333;
  }

  .checkbox-label:hover .checkbox-text {
    color: #4a90e2;
  }

  .checkbox-label input[type="checkbox"]:checked + .checkbox-text {
    color: #4a90e2;
  }

  .checkbox-label input[type="checkbox"]:checked + .checkbox-text svg {
    color: #4a90e2;
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

  .legend-container {
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
  }

  .control-group label {
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .control-group input[type="date"] {
    flex: 1;
    padding: 0.6rem 0.9rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: all 0.2s;
    background: #fafafa;
  }

  .control-group input[type="date"]:focus {
    outline: none;
    border-color: #4a90e2;
    background: white;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
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

    .checkbox-controls {
      width: 100%;
      flex-direction: column;
      gap: 1rem;
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