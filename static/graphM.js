const Queue = function() {
  return {
    items: [],
    enqueue: function(item) {
      this.items.push(item);
    },
    dequeue: function() {
      return this.items.shift();
    },
    isEmpty: function() {
      return this.items.length === 0;
    }
  };
};

const GraphM = function() {
  const vertices = new Map();
  function _buildAllPathsFromPath(startVertexName, path) {
    const allPaths = new Map();
    for (const destination of path.keys()) {
      const pathToDestination = [];
      let currentLocation = destination;
      pathToDestination.push(currentLocation);
      while (currentLocation !== startVertexName) {
        currentLocation = path.get(currentLocation);
        pathToDestination.push(currentLocation);
      }
      allPaths.set(destination, pathToDestination.reverse());
    }
    return allPaths;
  }
  return {
    getVertices: () => vertices,
    getEdges: () => {
      const allEdges = [];
      for (const vertex of vertices.values()) {
        for (const adjacentVertexName of vertex.edges.keys()) {
          allEdges.push([vertex.name, adjacentVertexName]);
        }
      }
      return allEdges;
    },
    addVertex: (name, edgeList) => {
      const newVertice = {
        // turn edgeList into a Map here
        edges: new Map(
          edgeList.map(e => {
            return [e.name, e.weight];
          })
        ),
        name: name
      };
      vertices.set(name, newVertice);
      return newVertice;
    },

    bfs: function(startVertexName) {
      const STATE_CURRENTLY_BEING_VISITED = 1;
      const STATE_VISITED = 2;
      const vertices = this.getVertices();
      const distances = new Map();
      const path = new Map();
      const state = new Map();
      const q = new Queue();
      distances.set(startVertexName, 0);
      q.enqueue(startVertexName.toString());
      while (q.isEmpty() === false) {
        const currentVertexName = q.dequeue();
        const currentVertexEdges = vertices.get(currentVertexName).edges;
        for (const adjacentVertexName of currentVertexEdges.keys()) {
          // visit the adjacent node if it has not been visited yet
          if (state.get(adjacentVertexName) === undefined) {
            //console.log(`visiting ${adjacentVertexName}`);
            state.set(adjacentVertexName, STATE_CURRENTLY_BEING_VISITED);
            // the distance (in hops) to the adjacentVertex is
            // the distance (from the starting vertex) to the current vertex plus one
            distances.set(
              adjacentVertexName,
              distances.get(currentVertexName) + 1
            );
            // we entered the adjacentVertex from the currentVertex
            path.set(adjacentVertexName, currentVertexName);
            // we'll want to visit the vertices adjacent to this adjacent vertex as well, later
            q.enqueue(adjacentVertexName);
          }
        }
        // we're done with this vertex now
        state.set(currentVertexName, STATE_VISITED);
      }
      return {
        distances: distances,
        allPaths: _buildAllPathsFromPath(startVertexName, path)
      };
    },

    bellmanFord: function(startVertexName) {
      const distances = new Map();
      const path = new Map();
      const vertices = this.getVertices();
      const edges = this.getEdges();
      const edgeWeight = (a, b) => vertices.get(a).edges.get(b);
      for (const vertexName of vertices.keys()) {
        distances.set(vertexName, 0xffffffff);
      }
      distances.set(startVertexName, 0);
      for (let i = 0; i < vertices.size; i++) {
        for (const [from, to] of edges) {
          if (distances.get(to) > distances.get(from) + edgeWeight(from, to)) {
            distances.set(to, distances.get(from) + edgeWeight(from, to));
            path.set(to, from);
          }
        }
      }

      return {
        distances: distances,
        allPaths: _buildAllPathsFromPath(startVertexName, path)
      };
    }
  };
};
