// Carga el JSON y extrae las matrices nodes y links.
// nodes = array de nodos (cada nodo tiene id, group, idLibCap, ...).
// links = array de enlaces (cada enlace tiene campos source y target_ini u otros).
d3.json("data.json").then(data => {
  const nodes = data.nodes;
  const links = data.links;

  console.log("Data ok");

  

// Define dimensiones, márgenes y width basado en número de nodos y step.
// width determina el ancho virtual del SVG/escala X.
  const vizEl = document.getElementById("chart");
  const height = vizEl.clientHeight || 1800;;
  const step = 10;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 20;
  const marginLeft = 20;
  const width = (nodes.length - 1) * step + marginLeft + marginRight;

  console.log("Dimensiones ok");

// Mapa de color por group. Si un group no está en domain, usará #aaa.
  const color = d3.scaleOrdinal()
    .domain(nodes.map(d => d.group).sort(d3.ascending))
    .range(d3.schemeCategory10)
    .unknown("#aaa");

  console.log("Color ok");

// Normalizan source y target_ini para comparar solo la parte libro/capítulo (antes de :).
  function sourceLibCap(source) {
    return source.split(":")[0].trim(); // Divide cadena en ":" y se queda con la primera parte
  }

  function targetLibCap(target_ini) {
    return target_ini.split(":")[0].trim(); // Divide cadena en ":" y se queda con la primera parte
  }

  console.log("Funciones libcap ok");

// Construye un Map (degree) que para cada node (id) guarda cuántas apariciones tiene en links (suma de apariciones como source/target).
  const degree = d3.rollup(
    links.flatMap(({ source, target_ini }) => [
      { node: sourceLibCap(source) },
      { node: targetLibCap(target_ini) }
    ]),
    v => d3.sum(v, () => 1),
    ({ node }) => node
  );

  console.log("Degree ok");

// Map con arrays de id en el orden deseado.
// orders.get("by group") devuelve la lista de ids en esa ordenación; se la pasarás a la escala x como dominio.
  const orders = new Map([
    ["by Bible", d3.sort(nodes, d => d.idLibCap).map(d => d.id)],
    ["by name", d3.sort(nodes.map(d => d.id))],
    ["by group", d3.sort(nodes, ({ group }) => group, ({ id }) => id).map(({ id }) => id)],
    ["by degree", d3.sort(nodes, d => degree.get(d.id) ?? -1,  // Usa -1 para los que no tienen links
      ({ id }) => id)
      .filter(d => (degree.get(d.id) ?? 0) > 0).reverse()   // primero los conectados
      .map(({ id }) => id)
      .concat(d3.sort(nodes.filter(d => (degree.get(d.id) ?? 0) === 0),
        ({ id }) => id).map(({ id }) => id))]
  ]);

  console.log("Orders ok");

// ScalePoint mapea cada id (dominio) a una posición X entre marginLeft y width - marginRight.
  const x = d3.scalePoint(orders.get("by Bible"), [marginLeft, width - marginRight]);

  console.log("Escala ok");

// groups asigna id -> group.samegroup recibe un enlace y devuelve el grupo si ambos extremos están en el mismo grupo (útil para colorear enlaces).
  const groups = new Map(nodes.map(d => [d.id, d.group]));
  const samegroup = ({ source, target_ini }) =>
    groups.get(sourceLibCap(source)) === groups.get(targetLibCap(target_ini)) ? groups.get(sourceLibCap(source)) : null;

  console.log("Grupos ok");

// Crea el SVG.
  const svg = d3.select("#chart").append("svg")
    .attr("width", 1800)
    .attr("height", 1800)
    .attr("viewBox", [0, -1000, width, 1800]);

  console.log("SVG ok"); 
    
// X es un Map id -> posición X calculada con x(id) (posición inicial).
  const X = new Map(nodes.map(({ id }) => [id, x(id)]));

  console.log("X ok");

  const zoom = d3.zoom()
    .scaleExtent([0.5, 20])  // Límites de zoom (mínimo y máximo)
    .on("zoom", (event) => {svg.select("g#content").attr("transform", event.transform);});

  console.log("Zoom ok");

// Se crea content (g) para que el zoom afecte todo lo que haya dentro.
  const content = svg.append("g").attr("id", "content");

  console.log("Content ok");

// Activa zoom
  svg.call(zoom);

  console.log("SVG ZOOM ok");

  // altura base de la línea de nodos
  const baseY = marginTop; 

  console.log("baseY ok");

 
// Función para trazar los arcos
// Devuelve un string d para el atributo path. Retorna null si alguna coordenada no es válida o si x1 === x2 (evita arcos de radio 0).
  function arc(d, X, baseY = marginTop) {
    const s = sourceLibCap(d.source);
    const t = targetLibCap(d.target_ini);
    const x1 = X.get(s);
    const x2 = X.get(t);
    const r = Math.abs(x2 - x1) / 2;
    if (!isFinite(x1) || !isFinite(x2)) {
      console.log("❌ Coordenadas inválidas", d);
      return null; // evita path inválido
    }
    //console.log("⚠️ Coordenadas inválidas en arc():", { "source": s, "target": t, x1, x2, r });
    if (x1 == null || x2 == null || isNaN(x1) || isNaN(x2) || isNaN(r) || r == null ) {
      console.log("⚠️ Coordenadas inválidas en arc():", { "source": s, "target": t, x1, x2, r });
      return "";
    }

    return `M${x1},${baseY}A${r},${r} 0,0,${x1 < x2 ? 1 : 0} ${x2},${baseY}`;
  }

  console.log("ARC ok");

// Filtrar enlaces inválidos: solo los que tengan ambos extremos válidos
  const validLinks = links.filter(
    d => nodes.some(n => n.id === sourceLibCap(d.source)) && nodes.some(n => n.id === targetLibCap(d.target_ini))
  );

  console.log("ValidLinks ok");

  links.forEach(d => {
    const s = sourceLibCap(d.source);
    const t = targetLibCap(d.target_ini);
    if (!nodes.some(n => n.id === s)) console.log("⚠️ Source sin nodo:", s);
    if (!nodes.some(n => n.id === t)) console.log("⚠️ Target sin nodo:", t);
  });


// Dibujar enlaces. Crea los <path> iniciales para validLinks.
// Guarda la selección en path (importante para futuras actualizaciones).
  const path = content.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(validLinks)
    .join("path")
    .attr("stroke", d => color(samegroup(d)))
    .attr("d", d=>arc(d,X));

  console.log("Path ok");

// Dibujar nodos + etiquetas
// Crea un <g> por nodo en la posición X.get(d.id). Dentro añade text (rotado) y circle.
// Si X.get(d.id) es undefined, la transformación será inválida (mal posicionamiento).

  const label = content.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 8)
    .attr("text-anchor", "end")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("transform", d => `translate(${X.get(d.id)},${baseY})`)
    .call(g => g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "end")
      .attr("x", -8)                      // Ajusta la posición vertical
      .attr("dy", ".35em")                // Centra el texto
      .attr("fill", d => d3.lab(color(d.group)).darker(2))
      .attr("opacity", 0)           // Empieza oculto
      .text(d => d.id))
    .call(g => g.append("circle")
      .attr("r", 5)
      .attr("fill", d => color(d.group)));
    
  console.log("Label ok");

// Eventos para mostrar/ocultar texto al pasar el mouse.
  label.selectAll("circle")
    .on("mouseover", function (event, d) {
      // Muestra solo el texto del nodo actual
      label.selectAll("text")
        .filter(t => t.id === d.id)
        .transition().duration(0)//150)
        .attr("opacity", 1);
    })
    .on("mouseout", function (event, d) {
      // Oculta de nuevo la etiqueta
      label.selectAll("text")
        .filter(t => t.id === d.id)
        .transition().duration(0)//300)
        .attr("opacity", 0);
    });

  console.log("HoverCirculo ok");


  label.selectAll("text")
    .on("mouseover", function () {
      d3.select(this).transition().duration(0).attr("opacity", 1);
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(0).attr("opacity", 0);
    });

  console.log("HoverText ok");


// Hover interaction
// Añade rects invisibles para detectar hover en la zona de cada etiqueta y aplicar clases .primary/.secondary a nodos y enlaces.
  label.append("rect")
    .attr("fill", "none")
    .attr("width", marginLeft + 40)
    .attr("height", step)
    .attr("x", 0) //-marginLeft
    .attr("y", -step / 2)
    .attr("pointer-events", "all")
    .on("pointerenter", (event, d) => {
      svg.classed("hover", true);
      label.classed("primary", n => n === d);
      label.classed("secondary", n => links.some(({ source, target_ini }) =>
        n.id === sourceLibCap(source) && d.id === targetLibCap(target_ini) || n.id === targetLibCap(target_ini) && d.id === sourceLibCap(source)
      ));
      path.classed("primary", l => sourceLibCap(l.source) === d.id || targetLibCap(l.target_ini) === d.id).filter(".primary").raise();
    })
    .on("pointerout", () => {
      svg.classed("hover", false);
      label.classed("primary", false);
      label.classed("secondary", false);
      path.classed("primary", false).order();
    });

  console.log("HoverRect ok");

    links.forEach(d => {
    const s = sourceLibCap(d.source);
    const t = targetLibCap(d.target_ini);
    if (!nodes.some(n => n.id === s)) console.log("⚠️ Source sin nodo:", s);
    if (!nodes.some(n => n.id === t)) console.log("⚠️ Target sin nodo:", t);
  });


    
// Función de actualización de orden
// update() recalcula dominio de x, recalcula posiciones X, filtra validLinks para el nuevo orden y actualiza las posiciones de nodos y arcos.
  function update(order) {
    x.domain(orders.get(order));
    const X = new Map(nodes.map(({ id }) => [id, x(id)]));
    console.log("Dominio y X ok");

    const validLinks = links.filter(d => X.has(sourceLibCap(d.source)) && X.has(targetLibCap(d.target_ini)));

    console.log("ValidLinks ok");

    // Transición de los nodos/etiquetas
    label.sort((a, b) => d3.ascending(X.get(a.id), X.get(b.id)))
      .transition()
      .duration(10)//750)
      .delay(10)//(d, i) => i * 20)
      .attrTween("transform", d => {
        const i = d3.interpolateNumber(X.get(d.id), x(d.id));
        return t => {
          const xVal = i(t);
          X.set(d.id, xVal);
          return `translate(${xVal},${marginTop})`;
        };
      });
    
    console.log("Label ok");

    validLinks.forEach(d => {
      const s = sourceLibCap(d.source);
      const t = targetLibCap(d.target_ini);
      if (!X.has(s) || !X.has(t)) {
        console.log("❌ Enlace inválido:", { source: s, target: t });
      }
    });


    // Transición de los arcos
    path.data(validLinks)
      .transition()
      .duration(500)//nodes.length * 0.2)
      .attr("d", d => arc(d,X)) //{ source: d.source, target_ini: d.target_ini }))
      .attr("d", function(d) {
        const pathData = arc(d,X); // Assuming your path generator
        console.log("Generated path data:", pathData);
        return pathData;
         });
      console.log("Transición arcos ok");
  }

  console.log("Update ok");   

  // Evento del select
  const select = d3.select("#orderSelect").on("change", function () {
    update(this.value);
  });

  console.log("Update order ok");


});


