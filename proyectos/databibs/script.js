// script.js
// Ejemplo de datos: reemplazalos por tus textos reales.
// Estructura: categories: [{ id, title, meta, items: [{title, quote, ref, link, book, type, source}] }]

const data = [
  {
    id: "cat-1",
    title: "Scientific Absurdities & Historical Inaccuracies",
    meta: "Ejemplos de pasajes con problemas técnicos/históricos",
    items: [
      {
        title: "Creation account mismatch",
        quote: "Versión A y versión B parecen contar la creación de forma diferente.",
        ref: "Genesis 1:1 / Genesis 2:4",
        link: "#",
        book: "Genesis",
        type: "Inaccuracy",
        source: "Skeptics Annotated"
      },
      {
        title: "Ages of the patriarchs",
        quote: "Ciertas edades reportadas parecen incompatibles entre capítulos.",
        ref: "Genesis 5",
        link: "#",
        book: "Genesis",
        type: "Scientific Absurdity",
        source: "Skeptics Annotated"
      }
    ]
  },
  {
    id: "cat-2",
    title: "Cruelty & Violence",
    meta: "Pasajes que mandan violencia o castigos severos",
    items: [
      {
        title: "Punishments prescribed",
        quote: "Mandatos de castigo corporal severo en ciertos textos.",
        ref: "Deuteronomy X",
        link: "#",
        book: "Deuteronomy",
        type: "Moral",
        source: "Author notes"
      }
    ]
  },
  {
    id: "cat-3",
    title: "Misogyny & Discrimination",
    meta: "Pasajes con lenguaje o leyes discriminatorias",
    items: [
      {
        title: "Laws about women",
        quote: "Leyes antiguas que regulan fuertemente a mujeres.",
        ref: "Leviticus Y",
        link: "#",
        book: "Leviticus",
        type: "Social",
        source: "Skeptics Annotated"
      }
    ]
  }
];

// ---- render & controls ----
const filters = {
  book: "All",
  type: "All",
  source: "All",
  search: ""
};

function uniqueValuesFromData(key){
  const set = new Set();
  data.forEach(cat => cat.items.forEach(it => set.add(it[key] || 'Unknown')));
  return Array.from(set).sort();
}

function populateFilterOptions(){
  const bookSel = document.getElementById('filter-book');
  const typeSel = document.getElementById('filter-type');
  const sourceSel = document.getElementById('filter-source');

  uniqueValuesFromData('book').forEach(b=>{
    const o = document.createElement('option'); o.value = b; o.textContent = b; bookSel.appendChild(o);
  });
  uniqueValuesFromData('type').forEach(b=>{
    const o = document.createElement('option'); o.value = b; o.textContent = b; typeSel.appendChild(o);
  });
  uniqueValuesFromData('source').forEach(b=>{
    const o = document.createElement('option'); o.value = b; o.textContent = b; sourceSel.appendChild(o);
  });

  bookSel.addEventListener('change', e=>{ filters.book = e.target.value; render(); });
  typeSel.addEventListener('change', e=>{ filters.type = e.target.value; render(); });
  sourceSel.addEventListener('change', e=>{ filters.source = e.target.value; render(); });

  document.getElementById('search').addEventListener('input', e=>{
    filters.search = e.target.value.trim().toLowerCase();
    render();
  });
}

function matchesFilter(item){
  if(filters.book !== 'All' && item.book !== filters.book) return false;
  if(filters.type !== 'All' && item.type !== filters.type) return false;
  if(filters.source !== 'All' && item.source !== filters.source) return false;
  if(filters.search){
    const hay = (item.quote + ' ' + item.title + ' ' + item.ref).toLowerCase();
    if(!hay.includes(filters.search)) return false;
  }
  return true;
}

function render(){
  const content = document.getElementById('content');
  content.innerHTML = '';

  // cuando no hay resultados, mostrar mensaje
  let totalMatches = 0;

  data.forEach(cat=>{
    const filteredItems = cat.items.filter(matchesFilter);
    if(filteredItems.length === 0) return;

    totalMatches += filteredItems.length;

    const catEl = document.createElement('article');
    catEl.className = 'category';
    catEl.id = cat.id;

    const h2 = document.createElement('h2'); h2.textContent = cat.title;
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = cat.meta;

    const list = document.createElement('div');
    filteredItems.forEach(it=>{
      const itemEl = document.createElement('div'); itemEl.className = 'item';
      const quote = document.createElement('div'); quote.className = 'quote';
      const bq = document.createElement('blockquote'); bq.textContent = it.quote;
      const ref = document.createElement('div'); ref.className = 'ref';
      ref.innerHTML = `<strong>${it.title}</strong> — ${it.ref} • <a href="${it.link}" target="_blank" rel="noopener">ver</a>`;

      quote.appendChild(bq);
      quote.appendChild(ref);
      itemEl.appendChild(quote);
      list.appendChild(itemEl);
    });

    // small numbered list of items at bottom (contradictions list style)
    const smallList = document.createElement('div'); smallList.className = 'contradictions-list';
    const ol = document.createElement('ol');
    filteredItems.forEach(it=>{
      const li = document.createElement('li');
      li.innerHTML = `<a href="${it.link}" target="_blank" rel="noopener">${it.title} — ${it.ref}</a>`;
      ol.appendChild(li);
    });
    smallList.appendChild(ol);

    catEl.appendChild(h2);
    catEl.appendChild(meta);
    catEl.appendChild(list);
    catEl.appendChild(smallList);

    content.appendChild(catEl);
  });

  if(totalMatches === 0){
    const no = document.createElement('div'); no.style.padding = '18px'; no.textContent = 'No se encontraron resultados con esos filtros.';
    content.appendChild(no);
  }
}

function expandAll(){
  document.querySelectorAll('.category').forEach(cat=>{
    cat.style.boxShadow = '0 12px 30px rgba(20,30,50,0.06)';
    cat.querySelectorAll('.item blockquote').forEach(bq=> bq.style.maxHeight = 'none');
  });
}
function collapseAll(){
  document.querySelectorAll('.category').forEach(cat=>{
    cat.style.boxShadow = '';
    cat.querySelectorAll('.item blockquote').forEach(bq=> bq.style.maxHeight = '');
  });
}

// init
populateFilterOptions();
render();

// ----- Arc Diagram / Ref Map -----
function drawViz() {
  const vizEl = document.getElementById("viz");
  const width = vizEl.clientWidth || 800;
  const height = vizEl.clientHeight || 500;

  // margen perimetral
  const margin = {top: 460, right: 40, bottom: 40, left: -70};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // datos de ejemplo
  const nodes = [
    {id: "Genesis 1"},
    {id: "Genesis 2"},
    {id: "Exodus 12"},
    {id: "Matthew 5"},
    {id: "Matthew 27"},
    {id: "John 20"}
  ];

  const links = [
    {source: "Genesis 1", target: "Genesis 2"},
    {source: "Matthew 5", target: "Exodus 12"},
    {source: "Matthew 27", target: "John 20"},
    {source: "Genesis 1", target: "John 20"}
  ];

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // limpiar svg previo
  d3.select("#viz").selectAll("svg").remove();

  const svg = d3.select("#viz")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // escala horizontal
  const x = d3.scalePoint()
    .domain(nodes.map(d => d.id))
    .range([0, innerWidth])
    .padding(0.5);

  // línea base ubicada en la parte inferior del área interna
  const baselineY = innerHeight;

  // asignar coords
  nodes.forEach(d => {
    d.x = x(d.id);
    d.y = baselineY;
  });

  // arcos
  g.selectAll("path.link")
    .data(links)
    .join("path")
    .attr("fill", "none")
    .attr("stroke", d => color(d.source))
    .attr("stroke-width", 1.5)
    .attr("d", d => {
      const s = nodes.find(n => n.id === d.source);
      const t = nodes.find(n => n.id === d.target);
      const x1 = s.x, x2 = t.x;
      const y = baselineY;
      const r = Math.abs(x2 - x1) / 2; // radio
      const sweep = x1 < x2 ? 1 : 0;
      return `M${x1},${y} A${r},${r} 0 0,${sweep} ${x2},${y}`;
    })
    .attr("opacity", 0.7);

  // nodos
  g.selectAll("circle.node")
    .data(nodes)
    .join("circle")
    .attr("r", 5)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("fill", d => color(d.id));

  // Etiquetas
  g.selectAll("text.label")
    .data(nodes)
    .join("text")
    .attr("class", "label")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 20)   // colocar el punto base justo encima del nodo
    .attr("text-anchor", "end") // el texto termina en el punto dado
    .attr("font-size", 11)
    .attr("transform", d => `rotate(-90, ${d.x}, ${d.y + 20})`)
    .text(d => d.id);

}


document.getElementById('btn-expand').addEventListener('click', expandAll);
document.getElementById('btn-collapse').addEventListener('click', collapseAll);

// Expose data for debugging/edit desde consola
window._BC_DATA = data;

// llamar al render del gráfico
document.addEventListener("DOMContentLoaded", () => {
  drawViz();
});

