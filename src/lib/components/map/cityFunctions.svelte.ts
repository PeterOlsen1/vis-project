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
import { normalizeCountryName, getCircleSize, getHoveredCircleSize } from "./utils";

let startDate = $derived<Date>(new Date(startDateRaw.state));
let endDate = $derived<Date>(new Date(endDateRaw.state));
let circlesCreated = $state<boolean>(false);

// loops over city buckets and applies callback function with city and country
function mapCityFreqs(fn: (country: string, city: string, cf: typeof cityFreqs.state) => void): typeof cityFreqs.state {
    // return value that the user can choose to discard
    const out = {...cityFreqs.state};

    Object.entries(out).forEach(([country, cities]) => {
        Object.keys(cities || {}).forEach((city) => fn(country, city, out));
    });

    return out;
};

// batch updates city buckets variable
export function updateCityFreqs(): typeof cityFreqs.state {
    if (!orderData.state) return {};

    const out: any = {};
    const start = startDate;
    const end = endDate;

    for (let i = 0; i < orderData.state.length; i++) {
        const order = orderData.state[i];
        const orderDate = new Date(order.orderDate);

        let addVal = 1;
        if ((start && orderDate < start) || (end && orderDate > end)) addVal = 0;

        if (!out[order.country]) out[order.country] = {};
        out[order.country][order.city] = (out[order.country][order.city] || 0) + addVal;
    }

    return out;
}

// updates the size of circles on the map whenever cityFreqs updates
export function updateCircleSize() {
    if (!circlesCreated) {
        return;
    }
    const cf = cityFreqs.state;

    mapCityFreqs((country, city) => {
        const q = `${city}-${country}`;
        const circle = svg.state?.getElementById(q);
        if (circle) {
            d3.select(circle)
                .transition()
                .duration(200)
                .attr('r', getCircleSize(cf[country][city] || 0));
        }
    });
}


// renders circles on the map. should only really be used once
export function renderCircles(projection: any) {
    if (!orderData.state.length || !g || circlesCreated || !cityGeoData.state) {
        return;
    }

    const geoData = cityGeoData.state;
    const cityGroup = d3.select(g.state).append("g").attr("class", "cities");
    
    let cityData: CityData[] = [];
    mapCityFreqs((country, city) => {
        if (!geoData[country] || !geoData[country][city]) {
            return;
        }

        const normalizedCountry = normalizeCountryName(country);
        const [x, y] = projection([geoData[country][city].lng, geoData[country][city].lat])!;

        if (!x || !y) {
            return;
        }
        
        cityData.push({
            city,
            country,
            count: cityFreqs.state[country][city] || 1,
            normalizedCountry,
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
            
            const tt = tooltip.state;
            if (tt) {
                tt.style.display = "block";
                tt.style.left = `${event.pageX + 10}px`;
                tt.style.top = `${event.pageY + 10}px`;
                tt.innerHTML = `
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
            
            const tt = tooltip.state;
            if (tt) {
                tt.style.display = "none";
            }
        })
        .on("click", (event, d) => {
            // clicking on two dots in the same coutnry de-selects the country
            selectedCountry.state = selectedCountry.state === d.normalizedCountry ? '' : d.normalizedCountry;
        });

    circlesCreated = true;
}