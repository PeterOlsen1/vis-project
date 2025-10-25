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
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#999")
        .attr("stroke-width", 0.5)
        .attr("data-country", (d: any, i: number) => geographyState.features[i].properties.name);

    selection.each((d: any, i, nodes) => {
        const ele = nodes[i];
        const country = geographyState.features[i].properties.name;

        d3.select(ele)
            .on("click", () => {
                selectedCountry.state = selectedCountry.state == country ? '' : country;
            });
    });

    countriesLoading.state = false;
}