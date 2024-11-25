import * as d3 from 'd3';
import * as d3Sankey from "d3-sankey";

const width = 928;
const height = 600;
const format = d3.format(",.0f");
const linkColor = "source-target"; // source, target, source-target, or a color string.

// Create a SVG container.
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

// Constructs and configures a Sankey generator.
const sankey = d3Sankey.sankey()
  .nodeId(d => d.name)
  .nodeAlign(d3Sankey.sankeyJustify) // d3.sankeyLeft, etc.
  .nodeWidth(15)
  .nodePadding(10)
  .extent([[1, 5], [width - 1, height - 5]]);
  async function init() {
    const data = await d3.json("data/data_sankey.json");
    // Applies it to the data. We make a copy of the nodes and links objects
    // so as to avoid mutating the original.
    const dataJMU = await d3.json("data/jmu.json");
    const { nodes, links } = sankey({
    // const tmp = sankey({
      nodes: data.nodes.map(d => Object.assign({}, d)),
      links: data.links.map(d => Object.assign({}, d))
    });

  // console.log('tmp', tmp);
  console.log('nodes', nodes);
  console.log('links', links);

  // Defines a color scale.
  const color = d3.scaleOrdinal(d3.schemeCategory10);

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
    .text(d => {
      console.log('d', d);
      return `${d.name}\n${format(d.value)}`});

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
      .attr("id", d => (d.uid = `link-${d.index}`))
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
    .attr("d", d3Sankey.sankeyLinkHorizontal())
    .attr("stroke", linkColor === "source-target" ? (d) => `url(#${d.uid})`
      : linkColor === "source" ? (d) => color(d.source.category)
        : linkColor === "target" ? (d) => color(d.target.category)
          : linkColor)
    .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title")
    .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)}`);

  // Adds labels on the nodes.
  svg.append("g")
    .selectAll()
    .data(nodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .text(d => d.title);

    // Adds labels on the links.
  svg.append("g")
    .selectAll()
    .data(links)
    .join("text")
    .attr("x", d => {
      console.log('linkd', d)
      const midX = (d.source.x1 + d.target.x0) / 2;
      return midX < width / 2 ? midX + 6 : midX - 6
    })
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .text(d => {
      console.log('linkd', d);
      return `${d.source.title} → ${d.value} → ${d.target.title}`
    });

  const svgNode = svg.node();
    document.body.appendChild(svgNode);
  return svgNode;
}

init();
const jmuData = await d3.json("data/jmu.json");
const sankeyData = transformJMUData(jmuData);
  function transformJMUData(jmuData) {
    const nodes = createNodes(jmuData);
    const links = createLinks(jmuData, nodes);
    return { nodes, links };
  }
  function createNodes(jmuData) {
    const nodes = [];
    const seen = new Set();
  
    // Add base nodes
    if (!seen.has("JMU Student")) {
      nodes.push({ name: "JMU Student", title: "JMU Student" });
      seen.add("JMU Student");
    }
  
    // Add semester nodes
    jmuData["student-costs"].forEach(cost => {
      if (!seen.has(cost.semester)) {
        nodes.push({ name: cost.semester, title: cost.semester });
        seen.add(cost.semester);
      }
    });
  
    // Add itemized cost nodes
    jmuData["student-costs"].forEach(cost => {
      if (!seen.has(cost.name)) {
        nodes.push({ name: cost.name, title: cost.name });
        seen.add(cost.name);
      }
    });
  
    return nodes;
  }
  function createLinks(jmuData, nodes) {
    const links = [];
  
    // Create links from "JMU Student" to semesters
    const studentNodeIndex = nodes.findIndex(node => node.name === "JMU Student");
    jmuData["student-costs"].forEach(cost => {
      const semesterIndex = nodes.findIndex(node => node.name === cost.semester);
      links.push({ source: studentNodeIndex, target: semesterIndex, value: 1 });
    });
  
    // Create links from semesters to itemized costs
    jmuData["student-costs"].forEach(cost => {
      const semesterIndex = nodes.findIndex(node => node.name === cost.semester);
      const costIndex = nodes.findIndex(node => node.name === cost.name);
      links.push({ source: semesterIndex, target: costIndex, value: cost["in-state"] });
    });
  
    return links;
  }
  const { nodes, links } = sankeyData;
const sankeyResult = sankey({
  nodes: nodes.map(d => Object.assign({}, d)),
  links: links.map(d => Object.assign({}, d))
});

const color = d3.scaleOrdinal(d3.schemeCategory10);

svg.selectAll("rect")
  .data(sankeyResult.nodes)
  .enter()
  .append("rect")
  .attr("x", d => d.x0)
  .attr("y", d => d.y0)
  .attr("width", d => d.x1 - d.x0)
  .attr("height", d => d.y1 - d.y0)
  .style("fill", d => color(d.category));
