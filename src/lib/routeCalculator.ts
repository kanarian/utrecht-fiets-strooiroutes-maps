// Feature layer URLs for salted roads
const SALTY_ROADS_LAYERS = [
  "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/0",
  "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/1",
  "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/2",
  "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/3",
];

interface RoadNode {
  id: string;
  lat: number;
  lng: number;
  connections: string[]; // IDs of connected nodes
}

interface RoadEdge {
  from: string;
  to: string;
  distance: number;
  geometry: any; // Polyline - will be typed when Leaflet is loaded
}

interface Graph {
  nodes: Map<string, RoadNode>;
  edges: Map<string, RoadEdge[]>;
}

/**
 * Get Leaflet dynamically (only works on client side)
 */
async function getLeaflet() {
  if (typeof window === "undefined") {
    throw new Error("Leaflet can only be used on the client side");
  }
  return await import("leaflet");
}

/**
 * Create a unique node ID from coordinates
 */
function createNodeId(lat: number, lng: number, precision = 6): string {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}

/**
 * Find or create a node in the graph
 */
function getOrCreateNode(
  graph: Graph,
  lat: number,
  lng: number,
  threshold = 0.0001
): string {
  // Check if a node already exists nearby (within threshold)
  for (const [nodeId, node] of graph.nodes.entries()) {
    const distance = Math.sqrt(
      Math.pow(node.lat - lat, 2) + Math.pow(node.lng - lng, 2)
    );
    if (distance < threshold) {
      return nodeId;
    }
  }

  // Create new node
  const nodeId = createNodeId(lat, lng);
  graph.nodes.set(nodeId, {
    id: nodeId,
    lat,
    lng,
    connections: [],
  });
  return nodeId;
}

/**
 * Build a graph from salted road segments
 */
async function buildGraph(segments: any[]): Promise<Graph> {
  const L = await getLeaflet();
  const graph: Graph = {
    nodes: new Map(),
    edges: new Map(),
  };

  for (const segment of segments) {
    const latlngs = segment.getLatLngs();
    if (latlngs.length < 2) continue;

    // Create nodes and edges for this segment
    const nodeIds: string[] = [];
    for (const latlng of latlngs) {
      const nodeId = getOrCreateNode(graph, latlng.lat, latlng.lng);
      nodeIds.push(nodeId);
    }

    // Create edges between consecutive nodes
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const fromId = nodeIds[i]!;
      const toId = nodeIds[i + 1]!;

      // Skip if edge already exists
      const existingEdges = graph.edges.get(fromId) || [];
      if (existingEdges.some((e) => e.to === toId)) continue;

      const fromNode = graph.nodes.get(fromId)!;
      const toNode = graph.nodes.get(toId)!;
      const distance = L.latLng(fromNode.lat, fromNode.lng).distanceTo(
        L.latLng(toNode.lat, toNode.lng)
      );

      // Create edge from -> to
      if (!graph.edges.has(fromId)) {
        graph.edges.set(fromId, []);
      }
      graph.edges.get(fromId)!.push({
        from: fromId,
        to: toId,
        distance,
        geometry: segment,
      });

      // Create edge to -> from (bidirectional)
      if (!graph.edges.has(toId)) {
        graph.edges.set(toId, []);
      }
      graph.edges.get(toId)!.push({
        from: toId,
        to: fromId,
        distance,
        geometry: segment,
      });

      // Update node connections
      if (!fromNode.connections.includes(toId)) {
        fromNode.connections.push(toId);
      }
      if (!toNode.connections.includes(fromId)) {
        toNode.connections.push(fromId);
      }
    }
  }

  return graph;
}

/**
 * Find the nearest node in the graph to a given point
 */
async function findNearestNode(
  graph: Graph,
  point: [number, number],
  maxDistance = 1000
): Promise<string | null> {
  const L = await getLeaflet();
  const pointLatlng = L.latLng(point[0], point[1]);
  let nearestNodeId: string | null = null;
  let minDistance = Infinity;

  for (const [nodeId, node] of graph.nodes.entries()) {
    const distance = pointLatlng.distanceTo(L.latLng(node.lat, node.lng));
    if (distance < minDistance && distance < maxDistance) {
      minDistance = distance;
      nearestNodeId = nodeId;
    }
  }

  return nearestNodeId;
}

/**
 * Dijkstra's algorithm to find shortest path
 */
function dijkstra(
  graph: Graph,
  startNodeId: string,
  endNodeId: string
): string[] | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  // Initialize distances
  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
    unvisited.add(nodeId);
  }
  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentNodeId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)!;
      if (dist < minDistance) {
        minDistance = dist;
        currentNodeId = nodeId;
      }
    }

    if (!currentNodeId || minDistance === Infinity) {
      break; // No path found
    }

    if (currentNodeId === endNodeId) {
      // Reconstruct path
      const path: string[] = [];
      let current: string | null = endNodeId;
      while (current) {
        path.unshift(current);
        current = previous.get(current) || null;
      }
      return path;
    }

    unvisited.delete(currentNodeId);

    // Update distances to neighbors
    const edges = graph.edges.get(currentNodeId) || [];
    for (const edge of edges) {
      if (!unvisited.has(edge.to)) continue;

      const alt = distances.get(currentNodeId)! + edge.distance;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        previous.set(edge.to, currentNodeId);
      }
    }
  }

  return null; // No path found
}

/**
 * Load salted roads data from ArcGIS Feature Server
 */
async function loadSaltyRoads(): Promise<any[]> {
  if (typeof window === "undefined") {
    return [];
  }
  
  const L = await getLeaflet();
  const allSegments: any[] = [];

  for (const layerUrl of SALTY_ROADS_LAYERS) {
    try {
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `${layerUrl}/query?f=geojson&where=1=1&outSR=4326&outFields=*&resultOffset=${offset}&resultRecordCount=${pageSize}&returnGeometry=true`
        );
        const data = await response.json();

        if (data.features) {
          for (const feature of data.features) {
            if (
              feature.geometry?.type === "LineString" &&
              feature.geometry.coordinates
            ) {
              const latlngs = feature.geometry.coordinates.map(
                (coord: number[]) => [coord[1], coord[0]] as [number, number]
              );
              const polyline = L.polyline(latlngs);
              allSegments.push(polyline);
            }
          }

          offset += data.features.length;
          hasMore = data.features.length === pageSize;
        } else {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error(`Error loading layer ${layerUrl}:`, error);
    }
  }

  return allSegments;
}

/**
 * Find the nearest point on any salted road to the given point
 */
async function findNearestRoadPoint(
  point: [number, number],
  segments: any[]
): Promise<[number, number] | null> {
  const L = await getLeaflet();
  let nearestPoint: [number, number] | null = null;
  let minDistance = Infinity;
  const latlng = L.latLng(point[0], point[1]);

  for (const segment of segments) {
    const latlngs = segment.getLatLngs();
    for (const segmentPoint of latlngs) {
      const distance = latlng.distanceTo(segmentPoint);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = [segmentPoint.lat, segmentPoint.lng];
      }
    }
  }

  return nearestPoint;
}

/**
 * Graph-based pathfinding algorithm using salted roads
 */
export async function calculateRoute(
  origin: [number, number],
  destination: [number, number]
): Promise<any | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const L = await getLeaflet();
    console.log("Loading salted roads...");
    const segments = await loadSaltyRoads();

    if (segments.length === 0) {
      console.error("No salted road segments found");
      return null;
    }

    console.log(`Building graph from ${segments.length} segments...`);
    const graph = await buildGraph(segments);
    console.log(
      `Graph built: ${graph.nodes.size} nodes, ${Array.from(graph.edges.values()).reduce((sum, edges) => sum + edges.length, 0)} edges`
    );

    // Find nearest nodes to origin and destination
    const originNodeId = await findNearestNode(graph, origin, 500);
    const destNodeId = await findNearestNode(graph, destination, 500);

    if (!originNodeId || !destNodeId) {
      console.error("Could not find salted roads near origin or destination");
      // Fallback: find nearest road points and connect directly
      const originRoadPoint = await findNearestRoadPoint(origin, segments);
      const destRoadPoint = await findNearestRoadPoint(destination, segments);
      if (originRoadPoint && destRoadPoint) {
        return L.polyline([origin, originRoadPoint, destRoadPoint, destination]);
      }
      return L.polyline([origin, destination]);
    }

    console.log(`Finding path from node ${originNodeId} to ${destNodeId}...`);
    const pathNodeIds = dijkstra(graph, originNodeId, destNodeId);

    if (!pathNodeIds || pathNodeIds.length === 0) {
      console.error("No path found through salted roads network");
      // Fallback
      const originNode = graph.nodes.get(originNodeId)!;
      const destNode = graph.nodes.get(destNodeId)!;
      return L.polyline([
        origin,
        [originNode.lat, originNode.lng],
        [destNode.lat, destNode.lng],
        destination,
      ]);
    }

    console.log(`Path found with ${pathNodeIds.length} nodes`);

    // Convert path nodes to coordinates
    const pathCoords: [number, number][] = [origin];

    // Add origin connection to first node
    const firstNode = graph.nodes.get(pathNodeIds[0]!)!;
    pathCoords.push([firstNode.lat, firstNode.lng]);

    // Add intermediate nodes
    for (let i = 1; i < pathNodeIds.length - 1; i++) {
      const nodeId = pathNodeIds[i]!;
      const node = graph.nodes.get(nodeId)!;
      pathCoords.push([node.lat, node.lng]);
    }

    // Add last node and destination connection
    const lastNode = graph.nodes.get(pathNodeIds[pathNodeIds.length - 1]!)!;
    pathCoords.push([lastNode.lat, lastNode.lng]);
    pathCoords.push(destination);

    return L.polyline(pathCoords);
  } catch (error) {
    console.error("Route calculation error:", error);
    // Fallback: return a simple direct route
    if (typeof window !== "undefined") {
      const L = await getLeaflet();
      return L.polyline([origin, destination]);
    }
    return null;
  }
}
