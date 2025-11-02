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

export function getCountryMetricData(orders: Order[], metric: string): Record<string, any> {
  const out: Record<string, any> = {};
  
  for (const order of orders) {
    const normalized = normalizeCountryName(order.country);
    
    if (!out[normalized]) {
      out[normalized] = {
        orders: 0,
        sales: [],
        profit: [],
        discount: [],
        quantity: 0,
        shipping: [],
        shippingMode: { 'Standard Class': 0, 'First Class': 0, 'Second Class': 0, 'Same Day': 0 },
        segment: { 'Consumer': 0, 'Corporate': 0, 'Home Office': 0 },
        category: { 'Technology': 0, 'Office Supplies': 0, 'Furniture': 0 },
        priority: { 'Medium': 0, 'High': 0, 'Low': 0, 'Critical': 0 }
      };
    }
    
    out[normalized].orders += 1;
    out[normalized].sales.push(order.sales);
    out[normalized].profit.push(order.profit);
    out[normalized].discount.push(order.discount);
    out[normalized].quantity += order.quantity;
    out[normalized].shipping.push(order.shippingCost);
    
    // Categorical data
    out[normalized].shippingMode[order.shipMode] = (out[normalized].shippingMode[order.shipMode] || 0) + 1;
    out[normalized].segment[order.segment] = (out[normalized].segment[order.segment] || 0) + 1;
    out[normalized].category[order.category] = (out[normalized].category[order.category] || 0) + 1;
    out[normalized].priority[order.orderPriority] = (out[normalized].priority[order.orderPriority] || 0) + 1;
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