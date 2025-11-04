import * as d3 from "d3";
import {
  showHeatmap,
  heatmapMetrics,
  heatmapMetric,
  showCircles,
} from "./mapStates.svelte";
import { updateHeatmap } from "./heatmapFunctions.svelte";
import { renderCircles } from "./circleFunctions.svelte";

export function renderCountryOverlay(
  width: number,
  height: number,
  countryData: any[],
) {
  const projection = d3.geoMercator().fitSize([width, height], countryData[0]);

  const path = d3.geoPath().projection(projection);

  const svg = d3
    .select("#country-overlay")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height);

  svg.selectAll("*").remove();

  const g = svg.append("g");
  g.selectAll("path")
    .data(countryData)
    .join("path")
    .attr("d", path)
    .attr("data-country", (d) => d.properties.name)
    .attr("fill", "#e0e0e0")
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .attr("opacity", 1);

  const zoom: d3.ZoomBehavior<SVGSVGElement, unknown> = d3
    .zoom<SVGSVGElement, unknown>()
    .extent([
      [0, 0],
      [width, height],
    ])
    .scaleExtent([1, 40])
    .on("zoom", ({ transform }) => {
      g.attr("transform", transform.toString());
      d3.select(g.node())
        .selectAll("circle")
        .attr(
          "transform",
          (d) => `translate(${transform.apply([d.x, d.y])}) scale(${transform.k})`,
        );
    });

  svg.call(zoom as any);
  if (
    showHeatmap.state &&
    heatmapMetrics.state &&
    Object.keys(heatmapMetrics.state).length > 0
  ) {
    updateHeatmap(
      g.node(),
      heatmapMetrics.state,
      showHeatmap.state,
      heatmapMetric.state,
    );
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
