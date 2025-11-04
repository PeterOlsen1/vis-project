import type { HeatmapMetric } from "@data-types/metrics";
import * as d3 from "d3";
import { tooltip } from "./mapStates.svelte";

export function showTooltip(
  event: MouseEvent,
  countryName: string,
  countryData: any,
  metric: HeatmapMetric,
) {
  if (!tooltip.state || !countryData) return;

  let tooltipContent = `<strong>${countryName}</strong><br/>`;

  switch (metric) {
    case "orders":
      tooltipContent += `Total Orders: ${countryData.orders.toLocaleString()}`;
      break;
    case "shipping_mode":
      tooltipContent += `Standard Class: ${countryData.shippingMode["Standard Class"]}<br/>`;
      tooltipContent += `First Class: ${countryData.shippingMode["First Class"]}<br/>`;
      tooltipContent += `Second Class: ${countryData.shippingMode["Second Class"]}<br/>`;
      tooltipContent += `Same Day: ${countryData.shippingMode["Same Day"]}`;
      break;
    case "segment":
      tooltipContent += `Consumer: ${countryData.segment["Consumer"]}<br/>`;
      tooltipContent += `Corporate: ${countryData.segment["Corporate"]}<br/>`;
      tooltipContent += `Home Office: ${countryData.segment["Home Office"]}`;
      break;
    case "category":
      tooltipContent += `Technology: ${countryData.category["Technology"]}<br/>`;
      tooltipContent += `Office Supplies: ${countryData.category["Office Supplies"]}<br/>`;
      tooltipContent += `Furniture: ${countryData.category["Furniture"]}`;
      break;
    case "sales": {
      const sales = countryData.sales;
      const minSales = Math.min(...sales);
      const maxSales = Math.max(...sales);
      const avgSales = sales.reduce((a: number, b: number) => a + b, 0) / sales.length;
      tooltipContent += `Lowest: $${minSales.toFixed(2)}<br/>`;
      tooltipContent += `Average: $${avgSales.toFixed(2)}<br/>`;
      tooltipContent += `Highest: $${maxSales.toFixed(2)}`;
      break;
    }
    case "discounts": {
      const avgDiscount =
        countryData.discount.reduce((a: number, b: number) => a + b, 0) /
        countryData.discount.length;
      tooltipContent += `Average Discount: ${(avgDiscount * 100).toFixed(1)}%`;
      break;
    }
    case "profit": {
      const profits = countryData.profit;
      const totalProfit = profits.reduce((a: number, b: number) => a + b, 0);
      const avgProfit = totalProfit / profits.length;
      const minProfit = Math.min(...profits);
      const maxProfit = Math.max(...profits);
      const totalLabel =
        totalProfit < 0
          ? `-$${Math.abs(totalProfit).toFixed(2)}`
          : `$${totalProfit.toFixed(2)}`;
      const avgLabel =
        avgProfit < 0
          ? `-$${Math.abs(avgProfit).toFixed(2)}`
          : `$${avgProfit.toFixed(2)}`;
      const minLabel =
        minProfit < 0
          ? `-$${Math.abs(minProfit).toFixed(2)}`
          : `$${minProfit.toFixed(2)}`;
      const maxLabel =
        maxProfit < 0
          ? `-$${Math.abs(maxProfit).toFixed(2)}`
          : `$${maxProfit.toFixed(2)}`;
      tooltipContent += `Total Profit: ${totalLabel}<br/>`;
      tooltipContent += `Average: ${avgLabel}<br/>`;
      tooltipContent += `Lowest: ${minLabel}<br/>`;
      tooltipContent += `Highest: ${maxLabel}`;
      break;
    }
    case "shipping_cost": {
      const shipping = countryData.shipping;
      const minShip = Math.min(...shipping);
      const maxShip = Math.max(...shipping);
      const avgShip =
        shipping.reduce((a: number, b: number) => a + b, 0) / shipping.length;
      tooltipContent += `Lowest: $${minShip.toFixed(2)}<br/>`;
      tooltipContent += `Average: $${avgShip.toFixed(2)}<br/>`;
      tooltipContent += `Highest: $${maxShip.toFixed(2)}`;
      break;
    }
    case "priority":
      const total =
        countryData.priority["Medium"] +
        countryData.priority["High"] +
        countryData.priority["Low"] +
        countryData.priority["Critical"];
      tooltipContent += `Medium: ${countryData.priority["Medium"]} (${((countryData.priority["Medium"] / total) * 100).toFixed(1)}%)<br/>`;
      tooltipContent += `High: ${countryData.priority["High"]} (${((countryData.priority["High"] / total) * 100).toFixed(1)}%)<br/>`;
      tooltipContent += `Low: ${countryData.priority["Low"]} (${((countryData.priority["Low"] / total) * 100).toFixed(1)}%)<br/>`;
      tooltipContent += `Critical: ${countryData.priority["Critical"]} (${((countryData.priority["Critical"] / total) * 100).toFixed(1)}%)`;
      break;
    case "quantity":
      tooltipContent += `Total Quantity: ${countryData.quantity.toLocaleString()}`;
      break;
  }

  const tooltipEl = d3.select(tooltip.state);
  tooltipEl
    .style("display", "block")
    .html(tooltipContent)
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 10}px`);
}

export function hideTooltip() {
  if (!tooltip.state) return;
  d3.select(tooltip.state).style("display", "none");
}
