// script.js

const data = [];

// ----- Arc Diagram / Ref Map -----
function drawViz() {
  const vizEl = document.getElementById("viz");
  const width = vizEl.clientWidth || 1800;
  const height = vizEl.clientHeight || 1240;
  const grafWidth = width * 0.95;
  const grafHeight = height * 0.95;



  // margen perimetral
  const margin = {top: 20, right: 20, bottom: 20, left: 20};
  const innerWidth = width * 0.95;
  const innerHeight = height * 0.95;

  // datos 
  const nodes = [
{ id: "Génesis 1", verses: 31 },
{ id: "Génesis 2", verses: 25 },
{ id: "Génesis 3", verses: 24 },
{ id: "Génesis 4", verses: 26 },
{ id: "Apocalipsis 22", verses: 21 }
  ];

  const links = [
{source: "Génesis 1", target: "2 Corintios 4"},
{source: "Génesis 2", target: "Apocalipsis 22"},
{source: "Génesis 3", target: "Apocalipsis 20"},
{source: "Génesis 3", target: "Apocalipsis 22"},
{source: "Apocalipsis 22", target: "Génesis 2"},
{source: "Apocalipsis 22", target: "Génesis 2"},
{source: "Apocalipsis 22", target: "Génesis 3"},
{source: "Apocalipsis 22", target: "Isaías 11"},
{source: "Apocalipsis 22", target: "Deuteronomio 12"}
  ];

  const color = d3.scaleOrdinal(d3.schemeCategory10);

// limpiar contenido previo
d3.select("#viz").selectAll("svg, canvas").remove();

// crear canvas (para los arcos)
const canvas = d3.select("#viz")
  .append("canvas")
  .attr("width", grafWidth)
  .attr("height", grafHeight)
  .style("position", "absolute")
  .style("top", 0)
  .style("left", 0)
  .style("z-index", 0);

const ctx = canvas.node().getContext("2d");

// crear svg (para nodos, barras, etiquetas)
const svg = d3.select("#viz")
  .append("svg")
  .attr("width", grafWidth)
  .attr("height", grafHeight)
  .style("position", "relative")
  .style("top", 0)
  .style("left", 0)
  .style("z-index", 2)
  .style("pointer-events", "auto")
  .style("background", "transparent");


  const g = svg.append("g")
    .attr("transform", `translate(${margin.left+10},${margin.top-270})`);

// Agrupar nodos por libro -- INICIO

// Asegurar que cada nodo tenga un campo 'book' 
nodes.forEach(d => {
  d.book = d.id.replace(/\s+\d+$/, '').trim(); // extrae "Génesis" de "Génesis 1"
});

// Agrupar los capítulos por libro
const books = d3.group(nodes, d => d.book);

// Crear un <g> por libro
const bookGroups = g.selectAll(".book-group")
  .data(Array.from(books), d => d[0])
  .join("g")
  .attr("class", "book-group")
  .attr("id", d => `book-${d[0].replace(/\s+/g, '-')}`);

// Agrupar nodos por libro -- FIN
  

  // escala horizontal
  const x = d3.scalePoint()
    .domain(nodes.map(d => d.id))
    .range([0, innerWidth * 0.995])
    .padding(0.5);

  // Escala vertical para la altura de las barras (versículos)
const yScale = d3.scaleLinear()
  .domain([0, d3.max(nodes, d => d.verses)])
  .range([0, innerHeight * 0.95 / 4]); // ajustá el /2 según la altura que quieras

  // línea base ubicada en la parte inferior del área interna
  const baselineY = innerHeight * 0.95 ;

  // asignar coords
  nodes.forEach(d => {
    d.x = x(d.id);
    d.y = baselineY;
  });

  // Línea base (desde donde bajan las barras)
g.append("line")
  .attr("x1", 0)
  .attr("x2", innerWidth * 0.995)
  .attr("y1", baselineY)
  .attr("y2", baselineY)
  .attr("stroke", "#61dafb")
  .attr("stroke-width", 1)
  .attr("opacity", 0.4);

// Escala de grises
const grayColors = {
  ot: ["#CCCCCC", "#999999"], // tonos claros (Antiguo Testamento)
  nt: ["#666666", "#333333"]  // tonos oscuros (Nuevo Testamento)
};

// Listado de libros del Antiguo y Nuevo Testamento
const oldTestamentBooks = [
  "Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut",
  "1 Samuel","2 Samuel","1 Reyes","2 Reyes","1 Crónicas","2 Crónicas","Esdras",
  "Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés","Cantares",
  "Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel","Oseas","Joel","Amós",
  "Abdías","Jonás","Miqueas","Nahúm","Habacuc","Sofonías","Hageo","Zacarías","Malaquías"
];

const newTestamentBooks = [
  "Mateo","Marcos","Lucas","Juan","Hechos","Romanos","1 Corintios","2 Corintios",
  "Gálatas","Efesios","Filipenses","Colosenses","1 Tesalonicenses","2 Tesalonicenses",
  "1 Timoteo","2 Timoteo","Tito","Filemón","Hebreos","Santiago","1 Pedro","2 Pedro",
  "1 Juan","2 Juan","3 Juan","Judas","Apocalipsis"
];

// Función para determinar color según libro y alternancia
// -- crear mapas una vez (colocarlo tras las listas oldTestamentBooks / newTestamentBooks)
const otIndexMap = new Map();
oldTestamentBooks.forEach((b, i) => otIndexMap.set(b.toLowerCase().replace(/\s+/g, ' ').trim(), i));

const ntIndexMap = new Map();
newTestamentBooks.forEach((b, i) => ntIndexMap.set(b.toLowerCase().replace(/\s+/g, ' ').trim(), i));

// -- función auxiliar para extraer y normalizar el nombre del libro
function extractBook(id) {
  if (!id) return '';
  let s = String(id).trim();

  // si viene con versículo "Libro X:Y", quitar ":Y"
  s = s.replace(/:\s*\d+$/, '').trim();

  // si viene "Libro Capítulo" quitar el capítulo al final -> deja "1 Corintios" o "Génesis"
  s = s.replace(/\s+\d+$/, '').trim();

  // insertar espacio si el formato fuera "1Corintios" -> "1 Corintios"
  s = s.replace(/^(\d)([^\s])/,'$1 $2');

  // normalizar espacios múltiples
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

// -- función corregida getGrayColor
function getGrayColor(node) {
  const book = extractBook(node.id);
  const key = book.toLowerCase();

  if (otIndexMap.has(key)) {
    const index = otIndexMap.get(key);
    return grayColors.ot[index % 2]; // alterna por libro en OT
  }

  if (ntIndexMap.has(key)) {
    const index = ntIndexMap.get(key);
    return grayColors.nt[index % 2]; // alterna por libro en NT
  }

  return "#999"; // fallback si no se reconoce
}


//Barras INICIO 
  
// Barras agrupadas por libro, dibujadas como un solo path
const bars = bookGroups
  .append("path")
  .attr("class", "bars-group")
  .attr("fill", "none")
  .attr("stroke", d => getGrayColor(d[1][0])) // color por libro
  .attr("stroke-width", 2)
  .attr("opacity", 0.9)
  .attr("d", d => {
    const chapters = d[1];
    let path = "";
    chapters.forEach(ch => {
      const x = ch.x;
      const y1 = baselineY;
      const y2 = baselineY + yScale(ch.verses);
      path += `M${x},${y1} L${x},${y2} `;
    });
    return path.trim();
  })
  .on("mousemove", function (event) {
    // posición X del mouse
    const [mouseX] = d3.pointer(event);

    // encontrar el capítulo más cercano a X
    const allNodes = nodes;
    const closest = allNodes.reduce((a, b) =>
      Math.abs(b.x - mouseX) < Math.abs(a.x - mouseX) ? b : a
    );

    // vecinos para efecto zoom
    const index = allNodes.indexOf(closest);
    const neighbors = allNodes.slice(Math.max(0, index - 2), index + 3);

  // Evitar recalcular todas las barras en cada pixel de movimiento
  if (!window._lastClosest || window._lastClosest.id !== closest.id) {
    window._lastClosest = closest;
  
    g.selectAll(".bars-group")
      .attr("stroke-width", d => {
        const groupNodes = d[1];
        return groupNodes.some(n => neighbors.includes(n)) ? 6 : 2;
      })
      .attr("opacity", d => {
        const groupNodes = d[1];
        return groupNodes.some(n => neighbors.includes(n)) ? 1 : 0.5;
      });
  }


    // eliminar etiquetas anteriores
    g.selectAll(".hover-label").remove();

    // mostrar etiqueta vertical del capítulo más cercano
    g.append("text")
      .attr("class", "hover-label")
      .attr("x", closest.x)
      .attr("y", baselineY - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#333")
      .attr("transform", `rotate(-90, ${closest.x}, ${baselineY - 10})`)
      .text(closest.id.replace(/(.)/g, "$1\n"));
  })
  .on("mouseleave", function () {
    g.selectAll(".bars-group")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);
    g.selectAll(".hover-label").remove();
  });

//Barras FIN

// Arcos estáticos INICIO
// Dibuja todos los arcos en un solo path 
const arcsPath = links.map(d => {
  const s = nodes.find(n => n.id === d.source);
  const t = nodes.find(n => n.id === d.target);
  if (!s || !t) return "";

  const x1 = s.x;
  const x2 = t.x;
  const y = baselineY;
  const r = Math.abs(x2 - x1) / 2;
  const sweep = x1 < x2 ? 1 : 0;

  return `M${x1},${y} A${r},${r} 0 0,${sweep} ${x2},${y}`;
}).join(" ");

// Dibuja todos los arcos de una vez
g.append("path")
  .attr("class", "links-group")
  .attr("fill", "none")
  .attr("stroke", "#9ecae1") // color neutro, puedes cambiarlo por d3.interpolateCool()
  .attr("stroke-width", 1.2)
  .attr("opacity", 0.7)
  .attr("d", arcsPath);

// Arcos estáticos FIN

// Arcos dinámicos INICIO  
// Capa interactiva para hover de arcos 
const gInteractive = g.append("g").attr("class", "interactive-links");

const hoverPaths = gInteractive.selectAll("path.hover")
  .data(links)
  .join("path")
  .attr("class", "hover")
  .attr("fill", "none")
  .attr("stroke", "transparent")
  .attr("stroke-width", 8) // ancho grande solo para capturar hover
  .attr("d", d => {
    const s = nodes.find(n => n.id === d.source);
    const t = nodes.find(n => n.id === d.target);
    if (!s || !t) return "";
    const x1 = s.x, x2 = t.x, y = baselineY;
    const r = Math.abs(x2 - x1) / 2;
    const sweep = x1 < x2 ? 1 : 0;
    return `M${x1},${y} A${r},${r} 0 0,${sweep} ${x2},${y}`;
  })
  .on("mouseover", function (event, d) {
    // Dibujar temporalmente el arco resaltado
    g.append("path")
      .attr("class", "highlight-arc")
      .attr("fill", "none")
      .attr("stroke", "#ff6600")
      .attr("stroke-width", 2.5)
      .attr("opacity", 1)
      .attr("d", d3.select(this).attr("d"));

    // Mostrar etiqueta en el centro del arco
    const s = nodes.find(n => n.id === d.source);
    const t = nodes.find(n => n.id === d.target);
    const midX = (s.x + t.x) / 2;
    const midY = baselineY - Math.abs(t.x - s.x) / 3;
    g.append("text")
      .attr("class", "arc-label")
      .attr("x", midX)
      .attr("y", midY)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#333")
      .text(`${d.source} → ${d.target}`);
  })
  .on("mouseout", function () {
    g.selectAll(".highlight-arc").remove();
    g.selectAll(".arc-label").remove();
  });

// Arcos dinámicos FIN

  // nodos
  g.selectAll("circle.node")
    .data(nodes)
    .join("circle")
    .attr("r", 5)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("fill", d => color(d.id));
  
}


// Expose data for debugging/edit desde consola
window._BC_DATA = data;

/*  Llamar al render del gráfico
    Espera a que todo el contenido HTML del documento esté completamente cargado antes de ejecutar el script.
    Esto evita errores de elementos aún no disponibles en el DOM (como #viz). */
document.addEventListener("DOMContentLoaded", () => {
  drawViz();
});

