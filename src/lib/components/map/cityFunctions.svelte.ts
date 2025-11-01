import type { Order } from "@data-types/order";
import * as d3 from "d3";
import type { CityData } from "@data-types/cityData";
import {
    cityGeoData,
    startDateRaw,
    endDateRaw,
    g, 
    svg,
    tooltip,
    orderData,
    selectedCountry,
    cityFreqs,
} from "./mapStates.svelte";
import { normalizeCountryName } from "./utils";

type CircleMetric = 'orders' | 'profit' | 'sales' | 'quantity' | 'shipping' | 'discount';

let startDate = $derived<Date>(new Date(startDateRaw.state));
let endDate = $derived<Date>(new Date(endDateRaw.state));
let circlesCreated = $state<boolean>(false);
let currentMetric = $state<CircleMetric>('orders'); // Track current metric

// Store metric values separately from counts
type CityMetricData = {
    count: number;
    sales: number;
    profit: number;
    quantity: number;
    shipping: number;
    discount: number;
    maxDiscount: number; // Track highest discount
};

let cityMetrics = $state<Record<string, Record<string, CityMetricData>>>({});

// loops over city buckets and applies callback function with city and country
function mapCityFreqs(fn: (country: string, city: string, cf: typeof cityFreqs.state) => void): typeof cityFreqs.state {
    // return value that the user can choose to discard
    const out = {...cityFreqs.state};

    Object.entries(out).forEach(([country, cities]) => {
        Object.keys(cities || {}).forEach((city) => fn(country, city, out));
    });

    return out;
};

// Get the value for a specific metric
function getMetricValue(country: string, city: string, metric: CircleMetric): number {
    if (!cityMetrics[country]?.[city]) return 0;
    
    const data = cityMetrics[country][city];
    
    switch (metric) {
        case 'orders':
            return data.count;
        case 'sales':
            return data.sales;
        case 'profit':
            return data.profit;
        case 'quantity':
            return data.quantity;
        case 'shipping':
            return data.shipping;
        case 'discount':
            // Return average discount
            return data.count > 0 ? data.discount / data.count : 0;
        default:
            return data.count;
    }
}

// batch updates city buckets variable
export function updateCityFreqs(metric: CircleMetric = 'orders'): typeof cityFreqs.state {
    if (!orderData.state) return {};

    const out: any = {};
    const metricsOut: Record<string, Record<string, CityMetricData>> = {};
    const start = startDate;
    const end = endDate;

    for (let i = 0; i < orderData.state.length; i++) {
        const order = orderData.state[i];
        const orderDate = new Date(order.orderDate);

        // Check if order is within date range
        if ((start && orderDate < start) || (end && orderDate > end)) continue;

        const country = order.country;
        const city = order.city;

        // Initialize if needed
        if (!out[country]) out[country] = {};
        if (!metricsOut[country]) metricsOut[country] = {};
        if (!metricsOut[country][city]) {
            metricsOut[country][city] = {
                count: 0,
                sales: 0,
                profit: 0,
                quantity: 0,
                shipping: 0,
                discount: 0,
                maxDiscount: 0
            };
        }

        // Update counts
        out[country][city] = (out[country][city] || 0) + 1;
        
        // Update metric values
        metricsOut[country][city].count += 1;
        metricsOut[country][city].sales += order.sales || 0;
        metricsOut[country][city].profit += order.profit || 0;
        metricsOut[country][city].quantity += order.quantity || 0;
        metricsOut[country][city].shipping += order.shippingCost || 0;
        metricsOut[country][city].discount += order.discount || 0;
        metricsOut[country][city].maxDiscount = Math.max(metricsOut[country][city].maxDiscount, order.discount || 0);
    }

    // Store metrics for later use
    cityMetrics = metricsOut;
    
    // Debug: Log a sample
    const sampleCountry = Object.keys(metricsOut)[0];
    if (sampleCountry) {
        const sampleCity = Object.keys(metricsOut[sampleCountry])[0];
        console.log('Sample metrics for', sampleCity, sampleCountry, ':', metricsOut[sampleCountry][sampleCity]);
    }

    return out;
}

// Get appropriate scale range based on metric
function getScaleRange(metric: CircleMetric): [number, number] {
    switch (metric) {
        case 'sales':
            return [3, 30]; // Larger range for sales visibility
        case 'shipping':
            return [3, 25]; 
        case 'profit':
            return [3, 28]; // For profit use absolute values
        case 'quantity':
            return [3, 30];
        case 'discount':
            return [3, 22];
        case 'orders':
        default:
            return [3, 35];
    }
}

// updates the size of circles on the map whenever cityFreqs updates
export function updateCircleSize(metric: CircleMetric = 'orders') {
    if (!circlesCreated) {
        return;
    }

    // Collect all values for the current metric
    const allValues: number[] = [];
    Object.entries(cityMetrics).forEach(([country, cities]) => {
        Object.keys(cities).forEach(city => {
            allValues.push(getMetricValue(country, city, metric));
        });
    });

    // For profit, use absolute values for scaling but preserve sign
    const maxValue = metric === 'profit' 
        ? Math.max(...allValues.map(v => Math.abs(v)), 1)
        : Math.max(...allValues, 1);
    const scaleRange = getScaleRange(metric);
    
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range(scaleRange);

    mapCityFreqs((country, city) => {
        const q = `${city}-${country}`;
        const circle = svg.state?.getElementById(q);
        if (circle) {
            const value = getMetricValue(country, city, metric);
            const radius = metric === 'profit' 
                ? radiusScale(Math.abs(value))
                : radiusScale(value);
            
            // For profit, change color based on positive/negative
            const fill = metric === 'profit' && value < 0
                ? "rgba(255, 0, 0, 0.6)" // Red for negative profit
                : "rgba(255, 100, 0, 0.6)"; // Orange for positive/other metrics
            
            d3.select(circle)
                .transition()
                .duration(200)
                .attr('r', radius)
                .attr('fill', fill);
        }
    });
}

// Format metric value for display in tooltip
function formatTooltip(city: string, country: string, metric: CircleMetric): string {
    if (!cityMetrics[country]?.[city]) return `<strong>${city}</strong>`;
    
    const data = cityMetrics[country][city];
    
    switch (metric) {
        case 'profit':
            const profit = data.profit;
            const profitStr = profit >= 0 
                ? `$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `-$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return `
                <strong>${city}</strong><br/>
                Net: ${profitStr}
            `;
        case 'sales':
            return `
                <strong>${city}</strong><br/>
                Total Sales: $${data.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            `;
        case 'quantity':
            return `
                <strong>${city}</strong><br/>
                Quantity: ${data.quantity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            `;
        case 'shipping':
            return `
                <strong>${city}</strong><br/>
                Shipping Cost: $${data.shipping.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            `;
        case 'discount':
            const avgDiscount = data.count > 0 ? data.discount / data.count : 0;
            return `
                <strong>${city}</strong><br/>
                Highest Discount: ${(data.maxDiscount * 100).toFixed(1)}%<br/>
                Average Discount: ${(avgDiscount * 100).toFixed(1)}%
            `;
        case 'orders':
        default:
            return `
                <strong>${city}</strong><br/>
                Orders: ${data.count.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            `;
    }
}

// Format metric value for display
function formatMetricValue(value: number, metric: CircleMetric): string {
    switch (metric) {
        case 'discount':
            return `${(value * 100).toFixed(1)}%`;
        case 'sales':
        case 'profit':
        case 'shipping':
            return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'quantity':
        case 'orders':
            return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
        default:
            return value.toLocaleString('en-US');
    }
}

// Get metric label
function getMetricLabel(metric: CircleMetric): string {
    const labels: Record<CircleMetric, string> = {
        'orders': 'Orders',
        'profit': 'Profit',
        'sales': 'Sales',
        'quantity': 'Quantity',
        'shipping': 'Shipping Cost',
        'discount': 'Avg Discount'
    };
    return labels[metric];
}

// renders circles on the map. should only really be used once
export function renderCircles(projection: any, targetG: SVGGElement | null, selectedCountry: string, metric: CircleMetric = 'orders') {

    if (!orderData.state.length || !targetG || !cityGeoData.state) {
        return;
    }
    
    // If metric changed, force recreation of circles
    if (circlesCreated && selectedCountry === "" && metric !== currentMetric) {
        console.log('Metric changed, removing old circles');
        d3.select(targetG).selectAll('.cities').remove();
        circlesCreated = false;
    }
    
    if(circlesCreated && selectedCountry === ""){
        return;
    }

    // Ensure cityMetrics is populated
    if (Object.keys(cityMetrics).length === 0) {
        console.log('cityMetrics empty, skipping render');
        return;
    }

    console.log('Rendering circles with metric:', metric);
    currentMetric = metric; // Update current metric

    const geoData = cityGeoData.state;
    const cityGroup = d3.select(targetG).append("g").attr("class", "cities");
    if(selectedCountry === "USA"){
        selectedCountry = "United States"
    } // very hacky fix for the naming mismatch between country and selectedCountry
    
    // Collect all values for proper scaling
    const allValues: number[] = [];
    mapCityFreqs((country, city) => {
        if (country !== selectedCountry && "" !== selectedCountry) return;
        allValues.push(getMetricValue(country, city, metric));
    });

    // For profit, use absolute values for scaling but preserve sign
    const maxValue = metric === 'profit'
        ? Math.max(...allValues.map(v => Math.abs(v)), 1)
        : Math.max(...allValues, 1);
    const scaleRange = getScaleRange(metric);
    
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range(scaleRange);

    let cityData: (CityData & { metricValue: number })[] = [];
    mapCityFreqs((country, city) => {
        if (!geoData[country] || !geoData[country][city]) {
            return;
        }
        if (country !== selectedCountry && "" !== selectedCountry){
            return;
        }

        const normalizedCountry = normalizeCountryName(country);
        const [x, y] = projection([geoData[country][city].lng, geoData[country][city].lat])!;

        if (!x || !y) {
            return;
        }
        
        const metricValue = getMetricValue(country, city, metric);
        
        cityData.push({
            city,
            country,
            count: cityFreqs.state[country][city] || 1,
            normalizedCountry,
            x,
            y,
            metricValue
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
        .attr("r", d => metric === 'profit' ? radiusScale(Math.abs(d.metricValue)) : radiusScale(d.metricValue))
        .attr("fill", d => metric === 'profit' && d.metricValue < 0 
            ? "rgba(255, 0, 0, 0.6)" 
            : "rgba(255, 100, 0, 0.6)")
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.8)
        .style("pointer-events", "all")
        .on("mouseover", function (event, d) {
            const absValue = metric === 'profit' ? Math.abs(d.metricValue) : d.metricValue;
            const hoveredRadius = radiusScale(absValue) * 1.3;
            const hoverFill = metric === 'profit' && d.metricValue < 0
                ? "rgba(255, 50, 50, 0.9)"
                : "rgba(255, 150, 0, 0.9)";
            d3.select(this)
                .attr("fill", hoverFill)
                .attr("r", hoveredRadius);
            
            const tt = tooltip.state;
            if (tt) {
                tt.style.display = "block";
                tt.style.left = `${event.pageX + 10}px`;
                tt.style.top = `${event.pageY + 10}px`;
                tt.innerHTML = formatTooltip(d.city, d.country, metric);
            }
        })
        .on("mouseout", function (event, d) {
            const absValue = metric === 'profit' ? Math.abs(d.metricValue) : d.metricValue;
            const normalFill = metric === 'profit' && d.metricValue < 0
                ? "rgba(255, 0, 0, 0.6)"
                : "rgba(255, 100, 0, 0.6)";
            d3.select(this)
                .attr("fill", normalFill)
                .attr("r", radiusScale(absValue));
            
            const tt = tooltip.state;
            if (tt) {
                tt.style.display = "none";
            }
        })
        .on("click", (event, d) => {
           
            selectedCountry.state = selectedCountry.state === d.normalizedCountry ? '' : d.normalizedCountry;
        });
    if(selectedCountry === ""){
        circlesCreated = true;
    }
}