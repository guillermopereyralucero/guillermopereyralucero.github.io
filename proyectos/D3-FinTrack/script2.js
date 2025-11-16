function _linkColor(Inputs, URLSearchParams, html) {
  return (
    Inputs.select(new Map([
      ["static", "#aaa"],
      ["source-target", "source-target"],
      ["source", "source"],
      ["target", "target"],
    ]), {
      value: new URLSearchParams(html`<a href>`.search).get("color") || "source-target",
      label: "Links color"
    })
  )
}

function _chart(d3,data,linkColor,DOM)
{


  // Specify the dimensions of the chart.
  const width = 2000;
  const height = 2000;
  const format = d3.format(",.0f");

  // Create a SVG container.
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");


  // Constructs and configures a Sankey generator.
  const sankey = d3.sankey()
      .nodeId(d => d.name)
      .nodeWidth(15)
      .nodePadding(10)
      .nodeSort((a, b) => d3.ascending(a.order, b.order))
      .extent([[5, 5], [width - 5, height - 5]]);

  // Applies it to the data. We make a copy of the nodes and links objects so as to avoid mutating the original.
  const {nodes, links} = sankey({
    nodes: data.nodes.map(d => Object.assign({}, d)),
    links: data.links.map(d => Object.assign({}, d))
  });

  // Defines a color scale.
  const color = d3.scaleOrdinal(d3.schemePaired);

  // Creates the rects that represent the nodes.
  const rect = svg.append("g")
      .attr("stroke", "#000")
    .selectAll()
    .data(nodes)
    .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => color(d.category));

  // Adds a title on the nodes.
  rect.append("title")
      .text(d => `${d.name}\n${format(d.value)} €`);

  // Creates the paths that represent the links.
  const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
    .selectAll()
    .data(links)
    .join("g")
      .style("mix-blend-mode", "multiply");

  // Creates a gradient, if necessary, for the source-target color option.
  if (linkColor === "source-target") {
    const gradient = link.append("linearGradient")
        .attr("id", d => (d.uid = DOM.uid("link")).id)
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
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", linkColor === "source-target" ? (d) => d.uid
          : linkColor === "source" ? (d) => color(d.source.category)
          : linkColor === "target" ? (d) => color(d.target.category) 
          : linkColor)
      .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title")
      .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)} €`);

  // Adds labels on the nodes.
  svg.append("g")
    .selectAll()
    .data(nodes)
    .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);

  return svg.node();
}


async function _data(FileAttachment)
{
  const links = await FileAttachment("data.csv").csv({typed: true});
  const nodes = Array.from(new Set(links.flatMap(l => [l.source, l.target])), name => ({name, category: name.replace(/ .*/, "")}));
  return {nodes, links};
}


function _d3(require){return(
require("d3@7", "d3-sankey@0.12")
)};


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([["data.csv", {url: new URL("./data.csv", import.meta.url), mimeType: "text/csv", toString}]]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer("viewof linkColor")).define("viewof linkColor", ["Inputs","URLSearchParams","html"], _linkColor);
  main.variable().define("linkColor", ["Generators", "viewof linkColor"], (G, _) => G.input(_));
  main.variable(observer("chart")).define("chart", ["d3","data","linkColor","DOM"], _chart);
  main.variable().define("data", ["FileAttachment"], _data);
  main.variable().define("d3", ["require"], _d3);
  return main;
}
