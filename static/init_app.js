const init_app = function(app) {
  // this function takes vertices and edges in the node editor format and creates a GraphM graph from them
  function createGraphM_from_node_editor_vertices_and_edges(vertices, edges) {
    let g = new GraphM();
    const pick_the_one_that_is_not_x = (a, b, x) => {
      return a == x ? b : a;
    };
    const convertedEdges = (res = vertices.map((_, vertex) => {
      return edges
        .filter(edge => {
          return edge.v1 === vertex || edge.v2 === vertex;
        })
        .map(edge => {
          return {
            name: pick_the_one_that_is_not_x(
              edge.v1,
              edge.v2,
              vertex
            ).toString(),
            weight: app.calcDistance(vertices[edge.v1], vertices[edge.v2])
          };
        });
    }));
    convertedEdges.forEach((edges, i) => {
      g.addVertex(i.toString(), edges);
    });
    return g;
  }

  document
    .getElementById("lbl_savedGraphs")
    .addEventListener("click", function() {
      console.log("enumerate local storage...");
      let lstElem = document.getElementById("lst_localStorageGraphs");
      let sHtml = "";
      let localStorageGraphs =
        (localStorage.bxlnc_graphs && JSON.parse(localStorage.bxlnc_graphs)) ||
        [];
      for (const g of localStorageGraphs) {
        console.log(g);
        sHtml += `<option value="${g.id}">${g.label}</option>`;
      }
      lstElem.innerHTML = sHtml;
    });
  document
    .getElementById("btn_saveGraphToLocalStorage")
    .addEventListener("click", function() {
      console.log("save current graph to local storage");
      let localStorageGraphs =
        (localStorage.bxlnc_graphs && JSON.parse(localStorage.bxlnc_graphs)) ||
        [];
      const now = new Date();
      const defragmentedVerticesAndEdges = app.defragmentVerticesAndEdges(
        app.getVertices(),
        app.getEdges()
      );
      localStorageGraphs.push({
        id: now.getTime(),
        label: `graph saved at ${now.toString()}`,
        graph: {
          vertices: defragmentedVerticesAndEdges.vertices,
          edges: defragmentedVerticesAndEdges.edges
        }
      });
      localStorage.bxlnc_graphs = JSON.stringify(localStorageGraphs);
    });

  document
    .getElementById("btn_loadGraphFromLocalStorage")
    .addEventListener("click", function() {
      console.log("load selected graph from local storage");
      let localStorageGraphs =
        (localStorage.bxlnc_graphs && JSON.parse(localStorage.bxlnc_graphs)) ||
        [];
      const lstElem = document.getElementById("lst_localStorageGraphs");
      const selectedGraph = localStorageGraphs.find(graph => {
        return graph.id.toString() === lstElem.value.toString();
      });
      if (selectedGraph) {
        app.clearVerticesAndEdges();
        app.setVertices(selectedGraph.graph.vertices);
        app.setEdges(selectedGraph.graph.edges);
      }
      console.log(selectedGraph);
    });

  document
    .getElementById("btn_clearGraph")
    .addEventListener("click", function() {
      let really_clear_graph = window.confirm(
        "really delete vertices and edges from graph?\nthis cannot be undone"
      );
      if (really_clear_graph === false) {
        return;
      }
      console.log("clearing");
      app.clearVerticesAndEdges();
    });

  document.getElementById("btn_bfs").addEventListener("click", function() {
    doit("bfs", { strokeStyle: "lime" });
  });

  document
    .getElementById("btn_bellmanFord")
    .addEventListener("click", function() {
      doit("bellmanFord", { strokeStyle: "#ff00ee" });
    });

  function doit(algorithm, drawOptions) {
    let selectedVertices = app.getSelectedVertices();
    if (selectedVertices.length !== 2) {
      alert("select two vertices");
      return;
    }
    let g = createGraphM_from_node_editor_vertices_and_edges(
      app.getVertices(),
      app.getEdges()
    );
    let paths;
    if (algorithm === "bfs") {
      paths = g.bfs(selectedVertices[0].toString());
    } else if (algorithm === "bellmanFord") {
      paths = g.bellmanFord(selectedVertices[0].toString());
    }
    app.drawPath(
      paths.allPaths.get(selectedVertices[1].toString()).map(i => {
        return parseInt(i, 10);
      }),
      drawOptions
    );
  }
};
