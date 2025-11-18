// BLOQUE Funciones

// Función - Carga de datos de nodos, links y libros.
async function loadResource(name) {
  try {
    const res = await fetch(`./data/${name}.json`);
    if (!res.ok) throw new Error(`No se pudo cargar ${name}.json`);
    return await res.json();
  } catch (err) {
    console.error(`Error cargando ${name}:`, err);
    return [];
  }
}

const loadNodes = () => loadResource("nodes");
const loadLinks = () => loadResource("links");
const loadBooks = () => loadResource("books");

// Función - Carga de libros

async function loadBooksTest() {
  const booksData = await loadBooks();
	oldTestamentBooks = booksData.oldTestamentBooks || [];
	newTestamentBooks = booksData.newTestamentBooks || [];
}
loadBooksTest();

// Función - Inicializa canvas, SVG y cajas de texto
function initCanvas() {
  const vizEl = document.getElementById("viz");
  const width = vizEl.clientWidth || 1800;
  const height = vizEl.clientHeight || 8000;
  const grafWidth = width * 0.99;
  const grafHeight = height * 0.95;
  // Márgenes y área interna
  const margin = {top: 20, right: 20, bottom: 20, left: 20};
  const innerWidth = width * 0.95;
  const innerHeight = height * 0.80;
  // Escala de colores D3
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  // Limpiar contenido anterior
  d3.select("#viz").selectAll("svg, canvas").remove();
  // Canvas (para arcos estáticos)
  const canvas = d3.select("#viz")
    .append("canvas")
    .attr("width", grafWidth)
    .attr("height", grafHeight)
    .style("position", "absolute")
    .style("z-index", 2);
  const ctx = canvas.node().getContext("2d");
  // SVG (para nodos, barras, textos)
  const svg = d3.select("#viz")
    .append("svg")
    .attr("width", grafWidth)
    .attr("height", grafHeight)
    .style("position", "relative")
    .style("z-index", 2)
    .style("pointer-events", "auto")
    .style("background", "transparent");
  // Contenedores de texto (sourceBox y targetBox)
  const createBox = (id, leftOrRight) => {
    const box = document.createElement("div");
    box.id = id;
    box.style.position = "absolute";
    box.style.top = "10px";
    box.style[leftOrRight] = "10px";
    box.style.width = "45%";
    box.style.minHeight = "120px";
    box.style.padding = "10px";
    box.style.fontSize = "13px";
    box.style.lineHeight = "1.4";
    box.style.color = "#111";
    box.style.background = "rgba(189, 189, 189, 0.85)";
    box.style.borderRadius = "8px";
    box.style.overflow = "auto";
    box.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
    box.style.zIndex = "10";
    vizEl.appendChild(box);
  };
  createBox("sourceBox", "left");
  createBox("targetBox", "right");
  // Grupo principal para elementos SVG
  const g = svg.append("g");
  return { svg, ctx, g, innerWidth, innerHeight, grafWidth, grafHeight, margin, color };
}

// Función - Crear escalas --> Calcula el scaleBand de los bloques verticales (Libro+Cap) --> Calcula el baselineY --> Calcula el scale para colocar los nodos --> Devuelve todas las escalas juntas de forma limpia
function createScales(nodes, innerWidth, innerHeight) {
    // baseline para las barras
    const baselineY = innerHeight * 0.95;
    // scaleBand para las barras Libro+Cap
    const xBand = d3.scaleBand()
        .domain(d3.range(nodes.length))
        .range([0, innerWidth * 0.995])
        .align(0.5)
        .paddingInner(0.1)
        .paddingOuter(0.5);
    // escala angular (para arcos, opcional si ya la usás)
    const angleScale = d3.scaleLinear()
        .domain([0, nodes.length - 1])
        .range([-Math.PI / 2.2, Math.PI / 2.2]);
    // devuelve TODO lo necesario
    return {
        baselineY,
        xBand,
        angleScale
    };
}

// Función - layoutNodes() - Asigna coordenadas a cada nodo --> Usa la escala angleScale --> Usa innerWidth para distribuir horizontalmente --> Usa baselineY como altura base del “semicírculo” --> Calcula posiciones sin dibujar nada --> Solo actualiza objetos nodes.
function layoutNodes(nodes, innerWidth, baselineY) {
    const total = nodes.length;
    nodes.forEach((n, i) => {
        // Distribución horizontal uniforme
        n.x = (innerWidth / (total + 1)) * (i + 1);;
				// Distribución vertical constante
        n.y = baselineY;
    });
    return nodes;
}


// Función - Dibujar enlaces --> Dibujar los arcos / curvas entre nodos (links) --> Usar ctx canvas para dibujar --> Usar las escalas dentro del parámetro scales --> NO debe calcular posiciones de nodos --> NO debe manipular SVG --> NO debe agregar eventos
function drawLinks(ctx, links, nodesMap, baselineY) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.lineWidth = 1.2;
	ctx.strokeStyle = "rgba(80, 80, 80, 0.35)";
	links.forEach(link => {
		const source = nodesMap.get(link.source);
		const target = nodesMap.get(link.target_ini); // usamos target_ini o target_fin según corresponda
		if (!source || !target) return;
		const x1 = source.x;
		const y1 = source.y;
		const x2 = target.x;
		const y2 = target.y;
		// Para línea horizontal, curva mínima (opcional)
		const cx = (x1 + x2) / 2;
		const cy = baselineY - Math.abs(x2 - x1) * 0.15; // altura del arco
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.quadraticCurveTo(cx, cy, x2, y2);
		ctx.stroke();
	});
}

// Función - Dibuja nodos
function drawNodes(svgGroup, nodes, color) {
	svgGroup.selectAll("circle.node")
		.data(nodes)
		.join("circle")
		.attr("class", "node")
		.attr("r", 1)  // radio del nodo
		.attr("cx", d => d.x)
		.attr("cy", d => d.y)
		.attr("fill", d => color(d.id))
		.attr("stroke", "#000000ff")
		.attr("stroke-width", 0.25)
		.attr("opacity", 0.9)
		.raise();
}

// Función - Interacción con Nodos 
function nodeInteractions(svgGroup, nodes, links, nodesMap, baselineY, xBand, yScale) {
    const nodeHoverRadius = 10;
    const arcHighlightColor = "rgba(255,165,0,0.5)"; // naranja más claro
    // Mapa rápido de arcos relacionados por nodo
    const nodeArcsMap = new Map();
    nodes.forEach(n => nodeArcsMap.set(n.id, []));
    links.forEach(l => {
        if (nodeArcsMap.has(l.source)) nodeArcsMap.get(l.source).push(l);
        if (nodeArcsMap.has(l.target_ini)) nodeArcsMap.get(l.target_ini).push(l);
    });
    // Capa única para bloques y textos de versículos
    const dynLayerNode = svgGroup.append("g").attr("class", "dyn-layer-node");
    // Capa para arcos resaltados por hover de nodo
    const highlightLayer = svgGroup.append("g").attr("class", "node-highlight-arcs").raise();
    // Función para limpiar los bloques de versículos
    function clearVerses() {
        dynLayerNode.selectAll("*").remove();
    }
    // Captura click en SVG fuera de nodos
    svgGroup.on("click", function(event) {
        if (event.target.tagName !== "circle") 

					dynLayerNode.selectAll(".dyn-block-node")   // Anima la salida de bloques (los hace "subir" y luego los quita al terminar)
					.interrupt()    // Cancela cualquier transición en curso
					.transition()
					.duration(100)  // Duración de toda la transición 
					.attr("y", baselineY)   // Vuelven arriba
					.attr("height", 0)  // Quita altura 
					.on("end", function() { d3.select(this).remove(); }); // Se eliminan al terminar

				dynLayerNode.selectAll(".dyn-text-node")    // Anima la salida de textos y los quita al terminar
					.interrupt()    // Cancela cualquier transición en curso
					.transition()
					.duration(50)  // Duración de toda la transición 
					.attr("y", baselineY)   // Vuelven arriba
					.on("end", function() { d3.select(this).remove(); });   // Se eliminan al terminar		
    });
    // Interacción sobre los nodos
    svgGroup.selectAll("circle.node")
        .on("mouseover", function(event, d) {
					d3.select(this).transition().duration(150).attr("r", nodeHoverRadius);
					// Limpiar arcos previos
					highlightLayer.selectAll("path").remove();
					// Dibujar todos los arcos relacionados al nodo
					const relatedLinks = nodeArcsMap.get(d.id) || [];
					relatedLinks.forEach(link => {
						const s = nodesMap.get(link.source);
						const t_i = nodesMap.get(link.target_ini);
						if (!s || !t_i) return;
						const x1 = s.x;
						const x2 = t_i.x;
						const y = baselineY;
						const r = Math.abs(x2 - x1) / 2;
						const sweep = x1 < x2 ? 1 : 0;
						highlightLayer.append("path")
								.attr("class", "highlight-arc")
								.attr("fill", "none")
								.attr("stroke", arcHighlightColor)
								.attr("stroke-width", 2)
								.attr("d", `M${x1},${y} A${r},${r} 0 0,${sweep} ${x2},${y}`)
								.raise();
					});
				})

				// Barras - Detección de mouse entrante
				.on("mouseenter", function (event, d) { // Se usa mouseenter/mouseleave para evitar disparos por bubbling entre hijos (que si suceden con mouseover/mouseout)
					const clave = d.id; // libro+capítulo igual que en bars
					const barGroup = d3.select(`g.barVer[data-id='${clave}']`);
					showLabel(barGroup, clave, xBand, baselineY);
				})

				// Nodos - Detección de mouse saliente    
				.on("mouseleave", function (event, d) {
					const barGroup = d3.select(`g.barVer[data-id='${d.id}']`);
					hideLabel(barGroup);
				})

        .on("mouseout", function(event, d) {
            d3.select(this).transition().duration(150).attr("r", 1);
            highlightLayer.selectAll("path").remove();
        })
        .on("click", function(event, d) {
            event.stopPropagation();
            clearVerses();

            const chapter = d;
            const numVerses = chapter.verses;
            const nodeX = chapter.x;
            const nodeY = baselineY;
            const blockHeight = 15;
            const blocks = d3.range(numVerses);

            // Bloques rojos
            dynLayerNode.selectAll(".dyn-block-node")
                .data(blocks)
                .join("rect")
                .attr("class", "dyn-block-node")
                .attr("x", nodeX - xBand.bandwidth())
                .attr("y", nodeY)
                .attr("width", xBand.bandwidth())
                .attr("height", blockHeight)
                .attr("fill", "#e71414ff")
                .attr("stroke", "#01939dff")
                .attr("opacity", 0.9)
                .transition()
                .delay(i => i * 10)
                .duration(10)
                .attr("y", i => nodeY + (i + 1) * blockHeight)
                .attr("opacity", 1);

            // Textos de versículos
            dynLayerNode.selectAll(".dyn-text-node")
							.data(blocks)
							.join("text")
							.attr("class", "dyn-text-node")
							.attr("y", i => nodeY + (i + 1) * blockHeight + blockHeight/2)
							.attr("x", nodeX)
							.attr("text-anchor", "middle")
							.attr("font-size", 14)
							.text(i => i + 1)
							.attr("opacity", 0)
							.transition()
							.delay(i => i * 30)
							.duration(300)
							.attr("opacity", 1);					
        });
};


// Función - Barras de versiculos y etiquetas Lib+Cap

function setupBars(g, nodes, baselineY, xBand) {
    // --- Variables internas ---
    const data_vers = Object.fromEntries(nodes.map(n => [n.id, n.verses]));
    const baseHeight = 300;  
    const h = 15;
    // Crear selección
    const barsVers = g.selectAll("g.barVer")
        .data(Object.entries(data_vers))
        .enter()
        .append("g")
        .attr("class", "barVer")
				.attr("data-id", d => d[0])
        .attr("transform", (d, i) => {
					// d = [clave, valor] -> clave es el id 'Libro Cap' que coincide con node.id
					const nodeId = d[0];
					const node = nodes.find(n => n.id === nodeId);
					// si no encontramos nodo, caemos en xBand(i) como fallback
					const cx = node ? node.x : xBand(i) + xBand.bandwidth() / 2;
					// queremos que el grupo se ubique de forma que 0..bandwidth() quede centrado en cx
					const gx = cx - xBand.bandwidth() / 2;
					return `translate(${gx},0)`;
				});
    // Área de mouse (transparente)
    barsVers.append("rect")
        .attr("x", 0)
        .attr("y", baselineY)
        .attr("width", xBand.bandwidth())
        .attr("height", baseHeight)
        .attr("fill", "transparent");
    // EVENTOS
		barsVers.on("mouseenter", function(event, [clave, valor]) {
				const gThis = d3.select(this);

				gThis.selectAll(".dyn-layer").remove();

				// Mostrar etiqueta con función genérica
				showLabel(gThis, clave, xBand, baselineY);
		});
		barsVers.on("mouseleave", function() {
				const gThis = d3.select(this);
				hideLabel(gThis);
				gThis.selectAll(".dyn-layer").remove();
		});
}

// Función - Mostrar/Ocultar etiqueta Lib+Cap

function showLabel(g, clave, xBand, baselineY) {
    // Limpieza
    g.selectAll(".dyn-label").remove();
    // Crear etiqueta
    g.append("text")
        .attr("class", "dyn-label")
        .attr("x", xBand.bandwidth() / 2)
        .attr("y", baselineY - 75)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .attr("transform", `rotate(-90, ${xBand.bandwidth()/2}, ${baselineY - 75})`)
        .text(clave);
}
function hideLabel(g) {
    g.selectAll(".dyn-label")
        .interrupt()
        .transition()
        .duration(10)
        .attr("opacity", 0)
        .on("end", function () { d3.select(this).remove(); });
}





// Función avanzada para convertir RTF simple a HTML
function parseRTFtoHTMLAdvanced(rtf) {
  if (!rtf) return "";

  // Reemplaza saltos de línea RTF por <br>
  rtf = rtf.replace(/\\par\s*/g, "<br>");

  // Stack para estilos activos
  let styleStack = [];
  let html = "";
  let buffer = "";

  // Regex para encontrar comandos RTF básicos: {, }, \b, \i, \cf6, \cf10
  const tokenRegex = /(\{|\}|\\[a-z]+\d*|\s+|[^\\\{\}]+)/gi;
  const tokens = rtf.match(tokenRegex);

  if (!tokens) return rtf;

  tokens.forEach(token => {
    token = token.trim();
    if (!token) return;

    switch (token) {
      case "{":
        // Abrir un nuevo bloque, guardamos el estilo actual
        styleStack.push([styleStack]);
        break;
      case "}":
        // Cerrar bloque, restauramos el estilo anterior
        styleStack = styleStack.pop() || [];
        break;
      case "\\b":
        styleStack.push("b");
        break;
      case "\\i":
        styleStack.push("i");
        break;
      case "\\cf6":
        styleStack.push("red");
        break;
      case "\\cf10":
        styleStack.push("grey");
        break;
      default:
        // Es texto
        let text = token;

        // Aplicar estilos acumulados
        styleStack.forEach(style => {
          if (style === "b") text = `<b>${text}</b>`;
          else if (style === "i") text = `<i>${text}</i>`;
          else if (style === "red") text = `<span style="color:red">${text}</span>`;
          else if (style === "grey") text = `<span style="color:grey">${text}</span>`;
        });

        html += text;
        break;
    }
  });

  return html;
}





// BLOQUE 2 — Función principal drawViz()

  // Toda la lógica está dentro de esta función, que dibuja la visualización dentro del div#viz.
  // Se invoca al final del archivo cuando el DOM está listo.
  // Dentro de drawViz(), se pueden distinguir 8 subbloques funcionales:

async function drawViz() {

  // Datos de nodes y links  --> Renumerar 
	// nodes: representa los capítulos de la Biblia (por ejemplo “Génesis 1”).
  	// verses: indica cuántos versículos tiene cada capítulo (para escalar la barra vertical).
  const nodes = await loadNodes();
  // links: pares de relaciones entre capítulos, que se dibujarán como arcos.
  const links = await loadLinks();
  // Define variables según funcion "initCanvas()"
  const { svg, ctx, g, innerWidth, innerHeight, grafWidth, grafHeight, margin, color } = initCanvas();
	// Crear escalas de forma centralizada
  const { baselineY, xBand, angleScale } = createScales(nodes, innerWidth, innerHeight);
	// Asignación de coordenadas
	layoutNodes(nodes, innerWidth, baselineY);
	// Mapeo de nodos
	const nodesMap = new Map(nodes.map(n => [n.id, n]));
	// Dibujar links
	drawLinks(ctx, links, nodesMap, baselineY);

	// 2.4. Agrupamiento de capítulos por libro
		// Aquí se prepara una estructura jerárquica
		// Extrae el nombre del libro (“Génesis” de “Génesis 1”), agrupa capítulos por libro y crea un <g> SVG por cada libro.
		// Esto permite aplicar estilos o transformaciones colectivas.
  
	// Agrupar nodos por libro -- INICIO
	// Asegurar que cada nodo tenga un campo 'book' 
	nodes.forEach(d => {d.book = d.id.replace(/\s+\d+$/, '').trim();}); // extrae "Génesis" de "Génesis 1"
		// Agrupar los capítulos por libro
	const books = d3.group(nodes, d => d.book);
	// Crear un <g> por libro
	const bookGroups = g.selectAll(".book-group")
		.data(Array.from(books), d => d[0])
		.join("g")
		.attr("class", "book-group")
		.attr("id", d => `book-${d[0].replace(/\s+/g, '-')}`);

	// Agrupar nodos por libro -- FIN

	// 2.5. Escalas y posiciones
		// Define cómo se ubican los elementos en el eje X y la altura de las barras:
			// x: ubica cada capítulo equidistantemente.
			// yScale: convierte número de versículos en altura.
			// baselineY: marca la línea base desde donde “crecen” las barras.

	// Escala vertical para la altura de las barras (versículos)
	const yScale = d3.scaleLinear()
		.domain([0, d3.max(nodes, d => d.verses)])
		.range([0, (innerHeight/4) * 0.95 / 4]); // ajustá el /2 según la altura que quieras, se deja /4

	// 2.6. Dibujo de la línea base y escalas de color

		// Línea horizontal base (desde donde bajan las barras). Sirve como guía visual del eje donde se apoyan las barras.
	g.append("line")
		.attr("x1", 0)
		.attr("x2", innerWidth * 0.995)
		.attr("y1", baselineY)
		.attr("y2", baselineY)
		.attr("stroke", "#202020ff")
		.attr("stroke-width", 1)
		.attr("opacity", 0.8);

		// Define escalas de grises y listas de libros del AT y NT. 
	const grayColors = {
		ot: ["#CCCCCC", "#999999"], // tonos claros (Antiguo Testamento)
		nt: ["#666666", "#333333"]  // tonos oscuros (Nuevo Testamento)
	};

		// Crea mapas (otIndexMap, ntIndexMap) para ubicar rápidamente cada libro según ID. genesis=0, exodo=1,...mateo=0, marcos=1...
	const otIndexMap = new Map();
	oldTestamentBooks.forEach((b, i) => otIndexMap.set(b.toLowerCase().replace(/\s+/g, ' ').trim(), i));

	const ntIndexMap = new Map();
	newTestamentBooks.forEach((b, i) => ntIndexMap.set(b.toLowerCase().replace(/\s+/g, ' ').trim(), i));

		// Función auxiliar para extraer y normalizar el nombre del libro
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

		// Extrae solo "Libro Capítulo" de "Libro Capítulo:Versículo"
	function extractBookChapter(ref) {
		if (!ref) return '';
		let s = String(ref).trim();
		// quita el versículo (todo después de ":")
		s = s.replace(/:\s*\d+$/, '').trim();
		// si viene sin espacio, lo agrega (1Corintios -> 1 Corintios)
		s = s.replace(/^(\d)([^\s])/, '$1 $2');
		return s;
	}


		// Función getGrayColor decide el color gris (claro u oscuro) alternando entre libros de AT/NT.
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
	
	// 2.7. Barras verticales por capítulo

		// Cada grupo de libro genera un path con líneas verticales (una por capítulo):
		// Barras INICIO 
	const bars = bookGroups
		.append("path")
		.attr("class", "bars-group")
		.attr("fill", "red")
		.attr("stroke", d => getGrayColor(d[1][0])) // color por libro
		.attr("stroke-width", 1)
		.attr("opacity", 1)
		.attr("d", d => {
			const chapters = d[1];
			let path = "";
			// Calcula la posición y altura de cada barra según los versículos (yScale).
			chapters.forEach(ch => {
				const x = ch.x;
				const y1 = baselineY;
				const y2 = baselineY + yScale(ch.verses); 
				path += `M${x},${y1} L${x},${y2} `;
			});
			return path.trim();
		})

		//Barras FIN

//////////////////////////////////////////////////////////////////////////////////////////////
	// Invoca funcion de barras y etiquetas
	setupBars(g, nodes, baselineY, xBand);


		
//////////////////////////////////////////////////////////////////////////////////////////////         

	// 2.8. Arcos entre capítulos

		// Se crean en dos pasos:
			// Arcos estáticos (visuales):

				// Arcos estáticos INICIO
				// Dibuja todos los arcos estáticos en un solo path 
	const arcsPath = links.map(d => {
		const s = nodes.find(n => n.id === extractBookChapter(d.source));
		const t_i = nodes.find(n => n.id === extractBookChapter(d.target_ini));
		const t_f = nodes.find(n => n.id === extractBookChapter(d.target_fin));
		if (!s || !t_i) return "";
		const x1 = s.x;
		const x2 = t_i.x;
		const y = baselineY;
		const r = Math.abs(x2 - x1) / 2;
		const sweep = x1 < x2 ? 1 : 0;
		return `M${x1},${y} A${r},${r} 0 0,${sweep} ${x2},${y}`;
	}).join(" ");
				// Dibuja todos los arcos de una vez
	g.append("path")
		.attr("class", "links-group")
		.attr("fill", "none")
		.attr("stroke", "#82afcbff") // color neutro, si se quiere escala probar d3.interpolateCool()
		.attr("stroke-width", 1.2)
		.attr("opacity", 0.7)
		.attr("d", arcsPath)
		.lower();
				// Arcos estáticos FIN


			// Arcos dinámicos (interactivos):
				// Arcos dinámicos INICIO  

					// Crea una capa invisible con trazos anchos para capturar el hover.
					// Al pasar el mouse sobre un arco:
						// Se dibuja un arco naranja destacado.
						// Aparece una etiqueta con la relación (source → target).
						// Al salir, se limpian los elementos temporales.
	const gInteractive = g.append("g").attr("class", "interactive-links");
	const hoverPaths = gInteractive.selectAll("path.hover")
		.data(links)
		.join("path")
		.attr("class", "hover")
		.attr("fill", "none")
		.attr("stroke", "transparent")
		.attr("stroke-width", 8) // ancho grande solo para capturar hover
		.attr("d", d => {
			const s = nodes.find(n => n.id === extractBookChapter(d.source));
			const t_i = nodes.find(n => n.id === extractBookChapter(d.target_ini));
			const t_f = nodes.find(n => n.id === extractBookChapter(d.target_fin));
			if (!s || !t_i) return "";
			const x1 = s.x, x2 = t_i.x, y = baselineY;
			const r = Math.abs(x2 - x1) / 2;
			const sweep = x1 < x2 ? 1 : 0;
			return `M${x1},${y} A${r},${r} 0 0,${sweep} ${x2},${y}`;
		})
		.on("mouseover", function (event, d) {                    
			// Determinar qué cita va a la izquierda y cuál a la derecha según la posición X
			const sNode = nodes.find(n => n.id === extractBookChapter(d.source));
			const tNode = nodes.find(n => n.id === extractBookChapter(d.target_ini));

			if (!sNode || !tNode) return;

			// Determinar el orden visual
			let leftText, rightText, leftLabel, rightLabel;

			if (sNode.x < tNode.x) {
				leftLabel = d.source;
				leftText = d.text_source || "";
				rightLabel = d.target_ini;
				rightText = d.text_target || "";
			} else {
				leftLabel = d.target_ini;
				leftText = d.text_target || "";
				rightLabel = d.source;
				rightText = d.text_source || "";
			}

			// Limitar longitud
			const maxChars = 300;
			leftText = leftText.length > maxChars ? leftText.slice(0, maxChars) + "..." : leftText;
			rightText = rightText.length > maxChars ? rightText.slice(0, maxChars) + "..." : rightText;

			// Asignar a las cajas
			document.getElementById("sourceBox").innerHTML = `<b>${leftLabel}</b><br>${parseRTFtoHTMLAdvanced(leftText)}`;
			document.getElementById("targetBox").innerHTML = `<b>${rightLabel}</b><br>${parseRTFtoHTMLAdvanced(rightText)}`;

			// Dibujar temporalmente el arco resaltado
			g.append("path")
				.attr("class", "highlight-arc")
				.attr("fill", "none")
				.attr("stroke", "#ff6600")
				.attr("stroke-width", 2.5)
				.attr("opacity", 1)
				.attr("d", d3.select(this).attr("d"));
			// Mostrar etiqueta en el centro del arco
				const s = nodes.find(n => n.id === extractBookChapter(d.source));
				const t_i = nodes.find(n => n.id === extractBookChapter(d.target_ini));
				const t_f = nodes.find(n => n.id === extractBookChapter(d.target_fin));
			if (!s || !t_i) return;
			// INICIO Lógica para asegurar el orden por posición (x)
			let displayText;

			// Determinar dirección visual (izq→der o der→izq)
			const isForward = s.x < t_i.x;

			// Función para elegir separador según alcance
			function getRangeSeparator(refIni, refFin) {
				const iniParts = refIni.split(/[:\s]+/);
				const finParts = refFin.split(/[:\s]+/);
				const iniLibro = iniParts.slice(0, iniParts.length - 2).join(" ");
				const finLibro = finParts.slice(0, finParts.length - 2).join(" ");
				const iniCap = iniParts[iniParts.length - 2];
				const finCap = finParts[finParts.length - 2];

				if (iniLibro !== finLibro) return "---"; // entre libros
				if (iniCap !== finCap) return "--";      // entre capítulos
				return "-";                              // dentro del mismo capítulo
			}

			// Función para dividir referencia (libro, cap, vers)
			const parseRef = ref => {
				const parts = ref.split(/[:\s]+/);
				const libro = parts.slice(0, parts.length - 2).join(' ');
				const cap = parts[parts.length - 2];
				const vers = parts[parts.length - 1];
				return { libro, cap, vers };
			};

			// Si hay rango de destino
			if (d.target_ini !== d.target_fin) {
				const sep = getRangeSeparator(d.target_ini, d.target_fin);
				const ini = parseRef(d.target_ini);
				const fin = parseRef(d.target_fin);

				// Si el libro es el mismo, mostrarlo una sola vez
				let rangoTexto;
				if (ini.libro === fin.libro && ini.cap !== fin.cap) {
					rangoTexto = `${ini.libro} ${ini.cap}:${ini.vers}${sep}${fin.cap}:${fin.vers}`;
				} else if (ini.libro === fin.libro && ini.cap === fin.cap) {
					rangoTexto = `${ini.libro} ${ini.cap}:${ini.vers}${sep}${fin.vers}`;
				}
					else {
					rangoTexto = `${ini.libro} ${ini.cap}:${ini.vers}${sep}${fin.libro} ${fin.cap}:${fin.vers}`;
				}

				displayText = isForward
					? `${d.source} → ${rangoTexto}`
					: `${rangoTexto} → ${d.source}`;
			}
			// Si es una referencia directa (sin rango)
			else {
				displayText = isForward
					? `${d.source} → ${d.target_ini}`
					: `${d.target_ini} → ${d.source}`;
			}
			// FIN Lógica de orden por posición (x)
			const midX = (s.x + t_i.x) / 2;
			const midY = baselineY - Math.abs(t_i.x - s.x) / 3;
			g.append("text")
				.attr("class", "arc-label")
				.attr("x", midX)
				.attr("y", midY)
				.attr("text-anchor", "middle")
				.attr("font-size", 14)
				.attr("fill", "#333")
				.text(`${displayText}`);

			// ------------------ INICIA BLOQUE: dibujar textos por columnas y comprobar espacio ------------------
			
			// ------------------ FIN BLOQUE ------------------
		})
		.on("mouseout", function () {
			g.selectAll(".highlight-arc").remove();
			g.selectAll(".arc-label").remove();
			//Limpiar el contenido de las cajas (div) de texto de los versiculos
			document.getElementById("sourceBox").innerHTML = "";
			document.getElementById("targetBox").innerHTML = "";
		});
				// Arcos dinámicos FIN

	// 2.10. Centrado de todo el gráfico

	// -- NUEVO: calcular altura del "encabezado" (las cajas) + separación deseada (40px)
	const headerHeight = Math.max(sourceBox.offsetHeight, targetBox.offsetHeight) + 40; // 40px separación

	//	Dibujar nodos --> Los dibujo al final para que queden al frente de todo. 
	drawNodes(g, nodes, color);

	//	Interacción de nodos
	nodeInteractions(g, nodes, links, nodesMap, baselineY, xBand, yScale);

	// Calcular el bounding box de todo el grupo
	const bbox = g.node().getBBox();

	// Calcular el centro del área visible y desplazar todo el gráfico hacia abajo por headerHeight
	const offsetX = (grafWidth - bbox.width) / 2 - bbox.x;
	const offsetY = headerHeight - bbox.y;

	// Aplicar el centrado + desplazamiento vertical
	g.attr("transform", `translate(${offsetX}, ${offsetY})`);

}

// BLOQUE 3 — Variables globales y ejecución

  // Llamar al render del gráfico
    // Espera a que todo el contenido HTML del documento esté completamente cargado antes de ejecutar el script.
    // Esto evita errores de elementos aún no disponibles en el DOM (como #viz). 
document.addEventListener("DOMContentLoaded", () => {drawViz();});

