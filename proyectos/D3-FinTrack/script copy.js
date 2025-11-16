// --- LIBRERIAS ---------------------------------------------------------
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { sankey, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";
// --- CONFIGURACIÓN ---------------------------------------------------------
const width = 2000;
const height = 2000;
const format = d3.format(",.0f");
const container = document.getElementById("chart");
const selector = document.getElementById("linkColor");
// --- DATA ---------------------------------------------------------
d3.csv("./data.csv", d3.autoType).then(links => {
  const nodes = Array.from(     // Build node list
    new Set(links.flatMap(l => [l.source, l.target])),
    name => ({ name, category: name.replace(/ .*/, "") })
  );
  const data = { nodes, links };
  drawChart("source-target");     // Draw initial chart
  selector.addEventListener("change", e => {    // Update on selector change
    drawChart(e.target.value);
  });
  // --- DRAW SANKEY --------------------------------------------------
  function drawChart(linkColor) {
    container.innerHTML = "";   // clear previous chart
    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
    const sankeyGen = sankey()
      .nodeId(d => d.name)
      .nodeWidth(15)
      .nodePadding(10)
      .nodeSort((a, b) => d3.ascending(a.order, b.order))
      .extent([[5, 5], [width - 5, height - 5]]);
    const { nodes, links } = sankeyGen({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });
    const color = d3.scaleOrdinal(d3.schemePaired);
    // ---- NODES -----------------------------------------------------
    const rect = svg.append("g")
      .attr("stroke", "#000")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.category));
    rect.append("title")
      .text(d => `${d.name}\n${format(d.value)} €`);
    // ---- LINKS -----------------------------------------------------
    const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("g")
      .data(links)
      .join("g")
        .style("mix-blend-mode", "multiply");
    if (linkColor === "source-target") {        // Gradients only for source-target
      const gradient = link.append("linearGradient")
        .attr("id", d => "grad" + d.index)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.x1)
        .attr("x2", d => d.target.x0);
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => color(d.source.category));
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => color(d.target.category));
    }
    link.append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", d =>
        linkColor === "source-target" ? `url(#grad${d.index})` :
        linkColor === "source" ? color(d.source.category) :
        linkColor === "target" ? color(d.target.category) :
        linkColor
      )
      .attr("stroke-width", d => Math.max(1, d.width));
    link.append("title")
      .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)} €`);
    // ---- LABELS -----------------------------------------------------
    svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name);
    container.appendChild(svg.node());
  }
});