import type { Order } from "@data-types/order";
import * as d3 from "d3";
import {
    orderData,
    geography,
    countriesLoading,
    g,
    selectedCountry, 
    countryFreqs,
} from "./mapStates.svelte";
import { normalizeCountryName } from "./utils";

export function getCountryFreqs(orders: Order[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const order of orders) {
        const normalized = normalizeCountryName(order.country);
        out[normalized] = (out[normalized] || 0) + 1;
    }
    return out;
}

const countryColorScale: any = $derived.by(() => {
    if (!countryFreqs.state) {
        return;
    }

    return d3.scaleLog<string>()
        //@ts-ignore - it works, don't care
        .domain([1, d3.max(Object.values(countryFreqs.state)) || 1])
        .range(["#f0f9e8", "#0868ac"])
});

export function loadCountries(projection: any) {
    if (!geography.state || !countryFreqs.state) {
        return;
    }

    if (!g.state) {
        console.error("g is not defined");
        return;
    }

    const path = d3.geoPath().projection(projection);

    countriesLoading.state = true;

    const geographyState = geography.state;
    const selection = d3
        .select(g.state)
        .selectAll("path")
        .data(geographyState.features)
        .enter()
        .append("path")
        .attr("d", (d: any) => path(d))
        .attr("fill", "#ccc")
        .attr("stroke", "#333");

    selection.each((d: any, i, nodes) => {
        const ele = nodes[i];
        const country = geographyState.features[i].properties.name;
        const value = countryFreqs.state[country] || 0;
        const fill = countryColorScale(value) || 'white';

        d3.select(ele)
            .attr("fill", fill)
            .on("mouseover", function () {
                ele.setAttribute("fill", "orange");
            })
            .on("mouseout", function () {
                ele.setAttribute("fill", fill);
            })
            .on("click", () => {
                selectedCountry.state = selectedCountry.state == country ? '' : country;
            });
    });

    countriesLoading.state = false;
}