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
  animationTimeframe,
  animationPlaying,
  animationDelay,
  circlesRendered,
  circleMetric,
  cityMetrics,
} from "./mapStates.svelte";
import { updateCityMetrics, renderCircles, updateCircleSize, updateScale } from "./circleFunctions.svelte";
import { startAnimation, pauseAnimation, stopAnimation, handleDelayChange } from "./animation.svelte";
import { loadStartEndDate } from "./utils";
import { loadCountries, getCountryFreqs, getCountryMetricData } from "./heatmapFunctions.svelte";

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

type CityMetric = 'orders' | 'profit' | 'sales' | 'quantity' | 'shipping' | 'discount';
type HeatmapMetric = 'shipping_mode' | 'segment' | 'orders' | 'category' | 'sales' | 'discounts' | 'profit' | 'shipping_cost' | 'priority' | 'quantity';

let showHeatmap = $state(false);
let heatmapMetric = $state<HeatmapMetric>('orders');
let countryMetricData = $state<Record<string, any>>({});

const circleMetricLabels: Record<CityMetric, string> = {
  'orders': 'Total Number of Orders',
  'profit': "Seller's Profit",
  'sales': 'Sales Cost',
  'quantity': 'Quantity Bought',
  'shipping': 'Shipping Cost',
  'discount': 'Discounts'
};

const heatmapMetricLabels: Record<HeatmapMetric, string> = {
  'shipping_mode': 'Shipping Mode',
  'segment': 'Segment',
  'orders': 'Total Number of Orders',
  'category': 'Order Category',
  'sales': 'Sales',
  'discounts': 'Discounts',
  'profit': "Seller's Profit",
  'shipping_cost': 'Shipping Cost',
  'priority': 'Order Priority',
  'quantity': 'Quantity Bought'
};

const projection = d3
  .geoMercator()
  .scale(150)
  .translate([width / 2, height / 1.5]);

// Color scale for heatmap
let colorScale: d3.ScaleSequential<string> | null = null;
let legendData = $state<{ type: 'gradient' | 'categorical', items?: { color: string, label: string }[], gradient?: { min: number | string, max: number | string } } | null>(null);

function getMostCommonCategory(obj: Record<string, number>): string {
  return Object.entries(obj).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

function getColorForMetric(countryData: any, metric: HeatmapMetric): string {
  if (!countryData) return '#e0e0e0';
  
  const categoricalColors: Record<string, string> = {
    'Standard Class': '#3182bd',
    'First Class': '#e6550d',
    'Second Class': '#31a354',
    'Same Day': '#756bb1',
    'Consumer': '#3182bd',
    'Corporate': '#e6550d',
    'Home Office': '#31a354',
    'Technology': '#3182bd',
    'Office Supplies': '#e6550d',
    'Furniture': '#31a354',
    'Medium': '#3182bd',
    'High': '#e6550d',
    'Low': '#31a354',
    'Critical': '#756bb1'
  };
  
  switch(metric) {
    case 'shipping_mode':
      const topShipMode = getMostCommonCategory(countryData.shippingMode);
      return categoricalColors[topShipMode] || '#e0e0e0';
    case 'segment':
      const topSegment = getMostCommonCategory(countryData.segment);
      return categoricalColors[topSegment] || '#e0e0e0';
    case 'category':
      const topCategory = getMostCommonCategory(countryData.category);
      return categoricalColors[topCategory] || '#e0e0e0';
    case 'priority':
      const topPriority = getMostCommonCategory(countryData.priority);
      return categoricalColors[topPriority] || '#e0e0e0';
    case 'orders':
      return colorScale ? colorScale(countryData.orders) : '#e0e0e0';
    case 'sales': {
      const totalSales = countryData.sales.reduce((a: number, b: number) => a + b, 0);
      return colorScale ? colorScale(totalSales) : '#e0e0e0';
    }
    case 'discounts': {
      const avgDiscount = countryData.discount.reduce((a: number, b: number) => a + b, 0) / countryData.discount.length;
      return colorScale ? colorScale(avgDiscount) : '#e0e0e0';
    }
    case 'profit': {
      const totalProfit = countryData.profit.reduce((a: number, b: number) => a + b, 0);
      return colorScale ? colorScale(totalProfit) : '#e0e0e0';
    }
    case 'shipping_cost': {
      const avgShipping = countryData.shipping.reduce((a: number, b: number) => a + b, 0) / countryData.shipping.length;
      return colorScale ? colorScale(avgShipping) : '#e0e0e0';
    }
    case 'quantity':
      return colorScale ? colorScale(countryData.quantity) : '#e0e0e0';
    default:
      return '#e0e0e0';
  }
}

function setupColorScale(metric: HeatmapMetric, data: Record<string, any>) {
  const values = Object.values(data);
  
  switch(metric) {
    case 'orders': {
      const counts = values.map((d: any) => d.orders);
      const maxCount = Math.max(...counts, 1);
      colorScale = d3.scaleSequential()
        .domain([0, maxCount])
        .interpolator(d3.interpolateBlues);
      legendData = { type: 'gradient', gradient: { min: 0, max: maxCount } };
      break;
    }
    case 'sales': {
      const totals = values.map((d: any) => d.sales.reduce((a: number, b: number) => a + b, 0));
      const maxSales = Math.max(...totals, 1);
      colorScale = d3.scaleSequential()
        .domain([0, maxSales])
        .interpolator(d3.interpolateBlues);
      legendData = { type: 'gradient', gradient: { min: '$0', max: `$${Math.round(maxSales).toLocaleString()}` } };
      break;
    }
    case 'discounts': {
      const discounts = values.map((d: any) => d.discount.reduce((a: number, b: number) => a + b, 0) / d.discount.length);
      const maxDiscount = Math.max(...discounts, 0.01);
      colorScale = d3.scaleSequential()
        .domain([0, maxDiscount])
        .interpolator(d3.interpolateBlues);
      legendData = { type: 'gradient', gradient: { min: '0%', max: `${(maxDiscount * 100).toFixed(1)}%` } };
      break;
    }
    case 'profit': {
      const totals = values.map((d: any) => d.profit.reduce((a: number, b: number) => a + b, 0));
      const maxProfit = Math.max(...totals, 1);
      const minProfit = Math.min(...totals, 0);
      colorScale = d3.scaleSequential()
        .domain([minProfit, maxProfit])
        .interpolator(d3.interpolateBlues);
      const minLabel = minProfit < 0 ? `-$${Math.abs(Math.round(minProfit)).toLocaleString()}` : `$${Math.round(minProfit).toLocaleString()}`;
      legendData = { type: 'gradient', gradient: { min: minLabel, max: `$${Math.round(maxProfit).toLocaleString()}` } };
      break;
    }
    case 'shipping_cost': {
      const avgs = values.map((d: any) => d.shipping.reduce((a: number, b: number) => a + b, 0) / d.shipping.length);
      const maxShipping = Math.max(...avgs, 1);
      colorScale = d3.scaleSequential()
        .domain([0, maxShipping])
        .interpolator(d3.interpolateBlues);
      legendData = { type: 'gradient', gradient: { min: '$0', max: `$${maxShipping.toFixed(2)}` } };
      break;
    }
    case 'quantity': {
      const quantities = values.map((d: any) => d.quantity);
      const maxQty = Math.max(...quantities, 1);
      colorScale = d3.scaleSequential()
        .domain([0, maxQty])
        .interpolator(d3.interpolateBlues);
      legendData = { type: 'gradient', gradient: { min: 0, max: maxQty } };
      break;
    }
    case 'shipping_mode':
      legendData = {
        type: 'categorical',
        items: [
          { color: '#3182bd', label: 'Standard Class' },
          { color: '#e6550d', label: 'First Class' },
          { color: '#31a354', label: 'Second Class' },
          { color: '#756bb1', label: 'Same Day' }
        ]
      };
      break;
    case 'segment':
      legendData = {
        type: 'categorical',
        items: [
          { color: '#3182bd', label: 'Consumer' },
          { color: '#e6550d', label: 'Corporate' },
          { color: '#31a354', label: 'Home Office' }
        ]
      };
      break;
    case 'category':
      legendData = {
        type: 'categorical',
        items: [
          { color: '#3182bd', label: 'Technology' },
          { color: '#e6550d', label: 'Office Supplies' },
          { color: '#31a354', label: 'Furniture' }
        ]
      };
      break;
    case 'priority':
      legendData = {
        type: 'categorical',
        items: [
          { color: '#3182bd', label: 'Medium' },
          { color: '#e6550d', label: 'High' },
          { color: '#31a354', label: 'Low' },
          { color: '#756bb1', label: 'Critical' }
        ]
      };
      break;
  }
}

function updateHeatmap(
  targetG: SVGGElement | null,
  metricData: Record<string, any>,
  enabled: boolean,
  metric: HeatmapMetric
) {
  if (!targetG || !metricData || Object.keys(metricData).length === 0) return;

  // Setup color scale based on metric - this will update legendData
  setupColorScale(metric, metricData);
  
  // Update country colors
  d3.select(targetG)
    .selectAll('path')
    .each(function() {
      const path = d3.select(this);
      const countryName = path.attr('data-country');
      const countryData = metricData[countryName];
      
      if (enabled && countryData) {
        path
          .attr('fill', getColorForMetric(countryData, metric))
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
function showTooltip(event: MouseEvent, countryName: string, countryData: any, metric: HeatmapMetric) {
  if (!tooltip.state || !countryData) return;
  
  let tooltipContent = `<strong>${countryName}</strong><br/>`;
  
  switch(metric) {
    case 'orders':
      tooltipContent += `Total Orders: ${countryData.orders.toLocaleString()}`;
      break;
    case 'shipping_mode':
      tooltipContent += `Standard Class: ${countryData.shippingMode['Standard Class']}<br/>`;
      tooltipContent += `First Class: ${countryData.shippingMode['First Class']}<br/>`;
      tooltipContent += `Second Class: ${countryData.shippingMode['Second Class']}<br/>`;
      tooltipContent += `Same Day: ${countryData.shippingMode['Same Day']}`;
      break;
    case 'segment':
      tooltipContent += `Consumer: ${countryData.segment['Consumer']}<br/>`;
      tooltipContent += `Corporate: ${countryData.segment['Corporate']}<br/>`;
      tooltipContent += `Home Office: ${countryData.segment['Home Office']}`;
      break;
    case 'category':
      tooltipContent += `Technology: ${countryData.category['Technology']}<br/>`;
      tooltipContent += `Office Supplies: ${countryData.category['Office Supplies']}<br/>`;
      tooltipContent += `Furniture: ${countryData.category['Furniture']}`;
      break;
    case 'sales': {
      const sales = countryData.sales;
      const minSales = Math.min(...sales);
      const maxSales = Math.max(...sales);
      const avgSales = sales.reduce((a: number, b: number) => a + b, 0) / sales.length;
      tooltipContent += `Lowest: $${minSales.toFixed(2)}<br/>`;
      tooltipContent += `Average: $${avgSales.toFixed(2)}<br/>`;
      tooltipContent += `Highest: $${maxSales.toFixed(2)}`;
      break;
    }
    case 'discounts': {
      const avgDiscount = countryData.discount.reduce((a: number, b: number) => a + b, 0) / countryData.discount.length;
      tooltipContent += `Average Discount: ${(avgDiscount * 100).toFixed(1)}%`;
      break;
    }
    case 'profit': {
      const profits = countryData.profit;
      const totalProfit = profits.reduce((a: number, b: number) => a + b, 0);
      const avgProfit = totalProfit / profits.length;
      const minProfit = Math.min(...profits);
      const maxProfit = Math.max(...profits);
      const totalLabel = totalProfit < 0 ? `-$${Math.abs(totalProfit).toFixed(2)}` : `$${totalProfit.toFixed(2)}`;
      const avgLabel = avgProfit < 0 ? `-$${Math.abs(avgProfit).toFixed(2)}` : `$${avgProfit.toFixed(2)}`;
      const minLabel = minProfit < 0 ? `-$${Math.abs(minProfit).toFixed(2)}` : `$${minProfit.toFixed(2)}`;
      const maxLabel = maxProfit < 0 ? `-$${Math.abs(maxProfit).toFixed(2)}` : `$${maxProfit.toFixed(2)}`;
      tooltipContent += `Total Profit: ${totalLabel}<br/>`;
      tooltipContent += `Average: ${avgLabel}<br/>`;
      tooltipContent += `Lowest: ${minLabel}<br/>`;
      tooltipContent += `Highest: ${maxLabel}`;
      break;
    }
    case 'shipping_cost': {
      const shipping = countryData.shipping;
      const minShip = Math.min(...shipping);
      const maxShip = Math.max(...shipping);
      const avgShip = shipping.reduce((a: number, b: number) => a + b, 0) / shipping.length;
      tooltipContent += `Lowest: $${minShip.toFixed(2)}<br/>`;
      tooltipContent += `Average: $${avgShip.toFixed(2)}<br/>`;
      tooltipContent += `Highest: $${maxShip.toFixed(2)}`;
      break;
    }
    case 'priority':
      const total = countryData.priority['Medium'] + countryData.priority['High'] + 
                    countryData.priority['Low'] + countryData.priority['Critical'];
      tooltipContent += `Medium: ${countryData.priority['Medium']} (${((countryData.priority['Medium']/total)*100).toFixed(1)}%)<br/>`;
      tooltipContent += `High: ${countryData.priority['High']} (${((countryData.priority['High']/total)*100).toFixed(1)}%)<br/>`;
      tooltipContent += `Low: ${countryData.priority['Low']} (${((countryData.priority['Low']/total)*100).toFixed(1)}%)<br/>`;
      tooltipContent += `Critical: ${countryData.priority['Critical']} (${((countryData.priority['Critical']/total)*100).toFixed(1)}%)`;
      break;
    case 'quantity':
      tooltipContent += `Total Quantity: ${countryData.quantity.toLocaleString()}`;
      break;
  }
  
  const tooltipEl = d3.select(tooltip.state);
  tooltipEl
    .style('display', 'block')
    .html(tooltipContent)
    .style('left', `${event.pageX + 10}px`)
    .style('top', `${event.pageY - 10}px`);
}

function hideTooltip() {
  if (!tooltip.state) return;
  d3.select(tooltip.state).style('display', 'none');
}

// Function to update country metric data based on date range
function updateCountryMetricDataWithDateFilter() {
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
  
  // Update country metric data with filtered data
  countryMetricData = getCountryMetricData(filteredOrders, heatmapMetric);
  countryFreqs.state = getCountryFreqs(filteredOrders);
}

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
  if (orderData.state && (startDateRaw.state || endDateRaw.state || heatmapMetric)) {
    updateCountryMetricDataWithDateFilter();
  } else if (orderData.state) {
    countryMetricData = getCountryMetricData(orderData.state, heatmapMetric);
    countryFreqs.state = getCountryFreqs(orderData.state);
  }
});

// load circles - only when checkbox is toggled
$effect(() => {
  if (showCircles.state) {
    renderCircles(projection, g.state);
  }
});

$effect(() => {
  updateScale();
})

$inspect(cityMetrics.state);
$effect(() => {
  cityMetrics.state = updateCityMetrics();
});

$effect(() => {
  if (showCircles.state) {
    updateCircleSize();
  }
});

// Handle heatmap toggle and metric changes
$effect(() => {
  if (g.state && countryMetricData && Object.keys(countryMetricData).length > 0) {
    updateHeatmap(g.state, countryMetricData, showHeatmap, heatmapMetric);
    
    if (showHeatmap) {
      // Add hover interactions for heatmap
      d3.select(g.state)
        .selectAll('path')
        .each(function() {
          const path = d3.select(this);
          const countryName = path.attr('data-country');
          const countryData = countryMetricData[countryName];
          
          path
            .on('mouseover', function(event) {
              path.attr('opacity', 0.7);
              showTooltip(event, countryName, countryData, heatmapMetric);
            })
            .on('mouseout', function() {
              path.attr('opacity', 1);
              hideTooltip();
            })
            .on('mousemove', function(event) {
              showTooltip(event, countryName, countryData, heatmapMetric);
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
  if (showHeatmap && countryMetricData && Object.keys(countryMetricData).length > 0) {
    updateHeatmap(g.node(), countryMetricData, showHeatmap, heatmapMetric);
  }
  if (showCircles.state) {
    renderCircles(projection, g.node());
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
            bind:checked={showHeatmap}
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
        
        {#if showHeatmap}
          <select bind:value={heatmapMetric} class="metric-select">
            {#each Object.entries(heatmapMetricLabels) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>
          <span class="selected-metric">{heatmapMetricLabels[heatmapMetric]}</span>
        {/if}
      </div>
    </div>
    
    {#if showHeatmap && legendData}
      <div class="legend">
        <span class="legend-label">{heatmapMetricLabels[heatmapMetric]}:</span>
        <div class="legend-content">
          {#if legendData.type === 'gradient' && legendData.gradient}
            <div class="legend-gradient"></div>
            <div class="legend-labels">
              <span>{legendData.gradient.min}</span>
              <span>{legendData.gradient.max}</span>
            </div>
          {:else if legendData.type === 'categorical' && legendData.items}
            <div class="legend-categorical">
              {#each legendData.items as item}
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