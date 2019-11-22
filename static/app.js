const NodeEditorApp = function(verticesUrl, bgImageUrl) {
  // shorthand function for retrieving a DOM element by selector (FIXME is that what they are called?)
  function qsl(q) {
    return document.querySelector(q);
  }
  let mouseDown = false;
  let canvas;
  let ctx;
  let backgroundImage = new Image();

  // velocity of animated path drawing
  let PIXELS_PER_SECOND = 150;
  // number of frames per second (= approxmiately how many times per second the draws
  // (TODO: @quarian, is this a reasonable description?)
  let FPS = 60;
  let vertices = [];
  let edges = [];
  let drawTasks = [];
  let selectedVertices = [];
  let selectedEdges = [];

  canvas = qsl("#canvas1");
  ctx = canvas.getContext("2d");

  // initial drawing drawingOptions
  let drawingOptions = {
    drawVertices: false,
    drawEdges: false,
    drawBackground: false,
    drawVerticeLabels: false,
    drawEdgeLabels: false,
    drawTasksEnabled: true
  };

  // helper functions for object construction
  function makeVertice(x, y) {
    return { x: x, y: y };
  }
  function makeEdge(v1, v2) {
    return { v1: v1, v2: v2 };
  }
  function makeDrawTask(params, updateFunc, drawFunc) {
    return { params: params, updateFunc: updateFunc, drawFunc: drawFunc };
  }

  // creates an array of edges through the given vertices
  function createEdgePathFromVertices(vs) {
    let edges = vs.reduce((acc, cur, idx, arr) => {
      return idx == 0
        ? [] // ignore the first vertice
        : // for subsequent vertices, build an edge from the previous
          // vertice to the current vertice, appending this new edge to
          // the accumulated edges
          [...acc, [vs[idx - 1], vs[idx]]];
    }, []);
    return edges;
  }

  function calcDistance(p1, p2) {
    return Math.sqrt(
      Math.pow(Math.abs(p1.x - p2.x), 2) + Math.pow(Math.abs(p1.y - p2.y), 2)
    );
  }

  function calcStep(edge) {
    let cp1 = mapVerticeToCanvas(edge[0], canvas);
    let cp2 = mapVerticeToCanvas(edge[1], canvas);
    let dist = calcDistance(cp1, cp2);
    let tt = dist / PIXELS_PER_SECOND;
    let step = 1.0 / tt / FPS;

    return step;
  }

  function createDrawPathDrawTask(vs, extra) {
    let edges = createEdgePathFromVertices(vs);
    let dt = makeDrawTask(
      {
        edges: edges,
        finished: false,
        step: calcStep(edges[0]),
        pct: 0.0
      },
      p => {
        return {
          edges: p.pct >= 1.0 ? p.edges.slice(1) : p.edges,
          finished: p.edges.length == 0,
          pct: p.pct < 1.0 ? p.pct + p.step : 0,
          // if pct is >= 1.0, we've moved on to the next edge
          // and should recalculate step for the NEXT edge, except
          // if we're already on the last edge, in which case we just
          // skip the calculation. with pct < 1.0 there is no
          // need to recalculate the step
          step:
            p.pct >= 1.0
              ? p.edges.length > 1
                ? calcStep(p.edges[1])
                : p.step
              : p.step
        };
      },
      p => {
        ctx.lineWidth = (extra && extra.lineWidth) || 2;
        ctx.strokeStyle = (extra && extra.strokeStyle) || "red";
        if (p.edges.length > 0) {
          ctx.beginPath();
          drawEdge(p.edges[0][0], p.edges[0][1], p.pct);
          ctx.stroke();
        }
      }
    );
    return dt;
  }

  // evaluate and execute existing drawtasks, removing ones that are finished.
  // DrawTasks are objects with some state (params) and two functions (updateFunc and drawFunc)
  // when DrawTasks are processed, the update function is called with the current parameters of
  // the DrawTask. The parameters are replaced with the result of the updateFunction after the
  // updateFunction returns. The drawFunction is called with the updated parameters. DrawTasks
  // should have a parameter named `finished`. If this parameter evaluates to true, the DrawTask
  // is considered finished and will be removed from the list of DrawTasks being processed.
  function processDrawTasks() {
    if (drawingOptions.drawTasksEnabled == false) return;

    if (drawTasks.length != 0) {
      let i;
      let dt;
      for (i = 0; i < drawTasks.length; i++) {
        dt = drawTasks[i];
        dt.params = dt.updateFunc(dt.params);
        dt.drawFunc(dt.params);
      }
      let dts = drawTasks.filter(e => {
        return e.params.finished == false;
      });
      drawTasks = dts;
    }
    window.requestAnimationFrame(processDrawTasks);
  }

  // dump current set of vertices and edges into TextArea, as json
  function updateOutput() {
    let o = {
      vertices: vertices,
      edges: edges
    };
    qsl("#txt_output1").value = JSON.stringify(o);
  }

  // update 'drawing drawingOptions' to match state displayed by UI elements
  function update() {
    drawingOptions.drawVertices = qsl("#cb_drawVertices").checked;
    drawingOptions.drawBackground = qsl("#cb_drawBackground").checked;
    drawingOptions.drawEdges = qsl("#cb_drawEdges").checked;
    drawingOptions.drawVerticeLabels = qsl("#cb_drawVerticeLabels").checked;
    drawingOptions.drawEdgeLabels = qsl("#cb_drawEdgeLabels").checked;
  }

  // called when the `draw path` button is clicked
  function drawPath() {
    let pathInput = qsl("#txt_path_input").value;
    let errorSpan = qsl("#txt_path_input_error");
    errorSpan.style.display = "none";
    let maybePoints;
    // FIXME stricter parsing, validate that entered vertices exist?
    try {
      maybePoints = pathInput.split(",").map(i => parseInt(i));
      if (maybePoints.includes(NaN)) {
        throw new Error("bad input");
      }
    } catch {
      errorSpan.innerHTML = "error! malformatted input. example: 1,2,3,4";
      errorSpan.style.display = "";
      return;
    }
    console.log("drawing path between vertices", maybePoints);
    let pathVertices = maybePoints.map(vertexIdx => {
      return vertices[vertexIdx];
    });
    drawTasks.push(createDrawPathDrawTask(pathVertices));
    processDrawTasks();
  }
  // initialization, bind event handlers etc
  function init() {
    qsl("#btn_drawPath").addEventListener("click", drawPath);
    qsl("#btn_updateOutput").addEventListener("click", updateOutput);
    canvas.addEventListener("click", canvasEventHandler);
    document.addEventListener("keyup", canvasEventHandler, true);
    canvas.addEventListener("mousedown", e => {
      e.preventDefault();
      e.stopPropagation();
      if (e.buttons == 2) {
      } else if (e.buttons == 1) {
        mouseDown = true;
      }
    });
    // always strop dragging if the canvas loses focus
    canvas.addEventListener("blur", e => {
      mouseDown = false;
    });
    canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      selectedVertices = [];
      selectedEdges = [];
      draw();

      mouseDown = false;
    });
    canvas.addEventListener("mouseup", e => {
      mouseDown = false;
    });
    canvas.addEventListener("mousemove", e => {
      if (mouseDown) {
        let v = vertices[selectedVertices[0]];
        if (v == null) {
          return;
        }
        let cv = mapVerticeToCanvas(v, canvas);
        let ce = mapInputEventToCanvas(e, canvas);
        let d = calcDistance(cv, ce);
        // don't pick a point too far away from the click
        if (d > 50) return;
        v.x = ce.x / canvas.width;
        v.y = ce.y / canvas.height;
        draw();
      }
    });
  }

  // helper function to map normalized vertice coordinates (0.0-1.0) to canvas coordinates
  function mapVerticeToCanvas(v, c) {
    if (v == null) {
      console.log("how did we end up here");
    }
    return { x: v.x * c.width, y: v.y * c.height };
  }

  // translate input event coordinates to canvas coordinates
  function mapInputEventToCanvas(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x: x, y: y };
  }
  function drawVertices(vs) {
    for (let i = 0; i < vs.length; i++) {
      let v = vs[i];
      if (v == null) continue;
      drawVertice(v);
    }
    ctx.stroke();
  }

  function drawEdges(es, vs) {
    for (let i = 0; i < es.length; i++) {
      drawEdge(vs[es[i].v1], vs[es[i].v2]);
    }
    ctx.stroke();
  }

  function drawVerticeLabels() {
    for (let i = 0; i < vertices.length; i++) {
      let v = vertices[i];
      if (v == null) continue;
      let cv = mapVerticeToCanvas(v, canvas);
      drawLabel("V" + i, cv.x + 2, cv.y + 2);
    }
  }
  function drawEdgeLabels() {
    for (let i = 0; i < edges.length; i++) {
      let edge = edges[i];
      let v1 = vertices[edge.v1];
      let v2 = vertices[edge.v2];
      let midPointVertice = makeVertice(
        Math.min(v1.x, v2.x) +
          (Math.max(v1.x, v2.x) - Math.min(v1.x, v2.x)) * 0.5,
        Math.min(v1.y, v2.y) +
          (Math.max(v1.y, v2.y) - Math.min(v1.y, v2.y)) * 0.5
      );
      if (midPointVertice === undefined) {
        console.log("fail");
      }
      let cv = mapVerticeToCanvas(midPointVertice, canvas);
      let w = Math.round(calcDistance(v1, v2) * 1000) / 1000;
      drawLabel("w=" + w, cv.x, cv.y);
    }
  }
  function drawVertice(v) {
    let cv = mapVerticeToCanvas(v, canvas);
    let x = cv.x,
      y = cv.y;
    // TODO - handle type?
    ctx.rect(x - 3, y - 3, 3, 3);
  }

  function drawEdge(v1, v2, pct) {
    let cv1 = mapVerticeToCanvas(v1, canvas);
    let cv2 = mapVerticeToCanvas(v2, canvas);
    if (pct !== undefined) {
      cv2.x = cv1.x + (cv2.x - cv1.x) * pct;
      cv2.y = cv1.y + (cv2.y - cv1.y) * pct;
    }
    ctx.moveTo(cv1.x, cv1.y);
    ctx.lineTo(cv2.x, cv2.y);
  }

  // main draw function, paints the canvas according to drawOptions
  function draw() {
    update();
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    if (drawingOptions.drawBackground) ctx.drawImage(backgroundImage, 0, 0);
    if (drawingOptions.drawVertices) drawVertices(vertices);
    if (drawingOptions.drawEdges) drawEdges(edges, vertices);

    if (drawingOptions.drawVerticeLabels) drawVerticeLabels();
    if (drawingOptions.drawEdgeLabels) drawEdgeLabels();

    if (selectedVertices.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "red";
      ctx.lineWidth = 4;

      drawVertices(selectedVertices.map(vidx => vertices[vidx]));
    }
  }

  function drawLabel(text, x, y) {
    ctx.font = "monospace";
    ctx.fillStyle = "black";
    ctx.fillText(text, x, y);
  }

  // TODO - document this
  // handles interaction with the canvas, creating new
  // vertices, creating edges, splitting edges, moving vertices
  function canvasEventHandler(event) {
    let minDist = 1000000;
    let closestVerticeIdx = null;
    if (event.type == "click") {
      if (event.altKey) {
        console.log(event);
        let cx = mapInputEventToCanvas(event, canvas);
        let newVertice = makeVertice(cx.x / canvas.width, cx.y / canvas.height);
        vertices.push(newVertice);
        selectedVertices = [];
        selectedEdges = [];
      } else {
        for (let i = 0; i < vertices.length; i++) {
          let v = vertices[i];
          if (v == null) continue;
          let cv = mapVerticeToCanvas(v, canvas);
          let xd = Math.abs(cv.x - event.x);
          let yd = Math.abs(cv.y - event.y);
          let d = Math.sqrt(Math.pow(xd, 2) + Math.pow(yd, 2));
          if (d < minDist) {
            minDist = d;
            closestVerticeIdx = i;
          }
        }
        if (minDist < 20 && closestVerticeIdx !== null) {
          if (event.shiftKey) {
            selectedVertices.push(closestVerticeIdx);
          } else {
            selectedVertices = [closestVerticeIdx];
          }
        }
      }
    } else if (event.type == "keyup") {
      if (event.key == "f") {
        console.log("meep meep");
        // create new edge between two selected vertices
        // TODO create multiple edges spanning multple (>2)
        //      selected vertices
        if (selectedVertices.length == 2) {
          // direction does not matter
          let edge = makeEdge(selectedVertices[0], selectedVertices[1]);
          edges.push(edge);
        }
      } else if (event.key == "w") {
        // split edge, creating a new vertice at the
        // middle point of the edge, creating a new edge
        //     v1       e1         v2
        //      x-------------------x
        //   split edge ->
        //     v1  e1   v3   e2    v2
        //      x--------x----------x
        if (selectedVertices.length == 2) {
          let v1idx = selectedVertices[0];
          let v2idx = selectedVertices[1];
          let i;
          console.log("finding edge between vertices ");
          let foundEdgeIdx = -1;
          for (i = 0; i < edges.length; i++) {
            let edge = edges[i];
            if (
              (edge.v1 == v1idx && edge.v2 == v2idx) ||
              (edge.v1 == v2idx && edge.v2 == v1idx)
            ) {
              console.log("edge found ", edge);
              if (foundEdgeIdx != -1)
                console.warn(
                  "duplicate edge found, previous is ",
                  edges[foundEdgeIdx]
                );
              foundEdgeIdx = i;
            }
          }
          if (foundEdgeIdx != -1) {
            let edge = edges[foundEdgeIdx];
            console.log("splitting edge ", edge);
            let v1 = vertices[v1idx];
            let v2 = vertices[v2idx];
            let newVertice = makeVertice(
              Math.min(v1.x, v2.x) +
                (Math.max(v1.x, v2.x) - Math.min(v1.x, v2.x)) * 0.5,
              Math.min(v1.y, v2.y) +
                (Math.max(v1.y, v2.y) - Math.min(v1.y, v2.y)) * 0.5
            );
            let newVerticeIdx = vertices.length;
            vertices.push(newVertice);
            let newEdge;
            if (edge.v1 == v1idx) {
              edge.v2 = newVerticeIdx;
              newEdge = makeEdge(newVerticeIdx, v2idx);
            } else if (edge.v1 == v2idx) {
              edge.v1 = newVerticeIdx;
              newEdge = makeEdge(newVerticeIdx, v2idx);
            } else {
              throw new Exception("runtime error, weird edge");
            }

            edges.push(newEdge);
            console.log("created vertice ", newVertice);
            console.log("created edge ", newEdge);
          }
        }
      } else if (event.key == "x") {
        if (selectedVertices.length == 1) {
          let v = selectedVertices[0];
          console.log(
            "finding and deleting edges connected to vertice ",
            selectedVertices[0]
          );
          let numEdgesPreDeletion = edges.length;
          edges = edges.filter(edge => edge.v1 != v && edge.v2 != v);
          console.log("deleted ", numEdgesPreDeletion - edges.length, " edges");
          vertices[v] = null;
        }
      }
    }
    // TODO - determine if redraw is needed?
    draw();
  }
  // load vertice & edge data from remote url
  function loadData(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("get", url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {
        let data = JSON.parse(xhr.responseText);
        console.log("loaded data!");
        vertices = data.vertices;
        edges = data.edges;
        draw();
      }
    };
    xhr.send();
  }
  // utility function for drawing a mark (an X) on the canvas
  // mostly for debugging purposes
  function cross(x, y, size, strokeStyle) {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeStyle || "#00ff00";
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x - size, y + size);
    ctx.lineTo(x + size, y - size);
    ctx.stroke();
    ctx.beginPath();
  }
  // utility function from removing "holes" in the vertice
  // list. holes (=nulls) are created when removing vertices
  function defragmentVerticesAndEdges(vs, es) {
    function _defragmentVerticesAndEdges(vertices, edges) {
      let newVertices = [];
      let newEdges = [];
      let m = {};
      let i, j, n;
      let vertice, edge, v1, v2;
      j = 0;
      for (i = 0; i < vertices.length; i++) {
        vertice = vertices[i];
        if (vertice == null) continue;
        newVertices.push(vertice);
        m[i] = j;
        j += 1;
      }
      for (i = 0; i < edges.length; i++) {
        edge = edges[i];
        v1 = edge.v1;
        v2 = edge.v2;
        newEdges.push(makeEdge(m[v1], m[v2]));
      }

      return { vertices: newVertices, edges: newEdges };
    }

    let res = _defragmentVerticesAndEdges(vs, es);

    console.log(
      "defragmented, old v count:",
      vs.length,
      " new v count:",
      vertices.length
    );
    return res;
  }
  backgroundImage.src = bgImageUrl;
  backgroundImage.addEventListener("load", e => {
    console.log("image loaded, initing");
    canvas.width = backgroundImage.width;
    canvas.height = backgroundImage.height;

    init();
    loadData(verticesUrl);
  });
  function drawPathInterface(vs, extra) {
    let pathVertices = vs.map(vertexIdx => {
      return vertices[vertexIdx];
    });
    drawTasks.push(createDrawPathDrawTask(pathVertices, extra));
    processDrawTasks();
  }
  return {
    getVertices: function() {
      return vertices;
    },
    getEdges: function() {
      return edges;
    },
    getDrawTasks: function() {
      return drawTasks;
    },
    setVertices: function(newVertices) {
      vertices = newVertices.slice(0);
    },
    setEdges: function(newEdges) {
      edges = newEdges.slice(0);
    },
    clearVerticesAndEdges: function() {
      this.setVertices([]);
      this.setEdges([]);
      draw();
    },
    getSelectedVertices: function() {
      return selectedVertices;
    },
    defragmentVerticesAndEdges: defragmentVerticesAndEdges,
    draw: draw,
    drawPath: drawPathInterface,
    calcDistance: calcDistance,
    cross: cross
  };
};
