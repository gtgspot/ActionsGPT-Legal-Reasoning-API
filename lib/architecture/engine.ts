/**
 * High-Level Architecture Engine
 *
 * Models distributed system topology, service mesh connectivity,
 * capability registration, event-driven pipelines, and health monitoring.
 * Provides a blueprint-first approach to system design.
 */

import type {
  ServiceDefinition,
  ServiceStatus,
  ServiceTier,
  ServiceEndpoint,
  ServiceConnection,
  ConnectionType,
  TopologyLayer,
  SystemTopology,
  Capability,
  CapabilityCategory,
  CapabilityRegistry,
  SystemEvent,
  EventPriority,
  EventHandler,
  EventPipeline,
  HealthCheck,
  SystemMetrics,
  ArchitectureBlueprint,
} from './types';

// --- Utility ---

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

// --- Service Definition ---

export function defineService(
  name: string,
  tier: ServiceTier,
  endpoints: ServiceEndpoint[],
  dependencies: string[] = [],
  capabilities: string[] = []
): ServiceDefinition {
  return {
    id: generateId('svc'),
    name,
    version: '1.0.0',
    tier,
    status: 'starting',
    endpoints,
    dependencies,
    capabilities,
    metadata: {},
  };
}

export function createEndpoint(
  protocol: ServiceEndpoint['protocol'],
  host: string,
  port: number,
  path = '/',
  healthCheckPath = '/health'
): ServiceEndpoint {
  return { protocol, host, port, path, healthCheckPath };
}

export function updateServiceStatus(
  service: ServiceDefinition,
  status: ServiceStatus
): ServiceDefinition {
  return { ...service, status };
}

// --- Topology Builder ---

export function createTopology(name: string): SystemTopology {
  return {
    id: generateId('topo'),
    name,
    version: '1.0.0',
    layers: [],
    connections: [],
    createdAt: new Date().toISOString(),
  };
}

export function addLayer(
  topology: SystemTopology,
  name: string,
  tier: ServiceTier,
  services: ServiceDefinition[] = []
): TopologyLayer {
  const layer: TopologyLayer = { name, tier, services };
  topology.layers.push(layer);
  return layer;
}

export function addServiceToLayer(
  topology: SystemTopology,
  layerName: string,
  service: ServiceDefinition
): boolean {
  const layer = topology.layers.find((l) => l.name === layerName);
  if (!layer) return false;
  layer.services.push(service);
  return true;
}

export function connectServices(
  topology: SystemTopology,
  sourceId: string,
  targetId: string,
  connectionType: ConnectionType = 'synchronous',
  protocol = 'https',
  encrypted = true
): ServiceConnection {
  const connection: ServiceConnection = {
    sourceId,
    targetId,
    connectionType,
    protocol,
    latencyMs: 0,
    throughputRps: 0,
    encrypted,
  };
  topology.connections.push(connection);
  return connection;
}

// --- Topology Analysis ---

export function findService(
  topology: SystemTopology,
  serviceId: string
): ServiceDefinition | undefined {
  for (const layer of topology.layers) {
    const found = layer.services.find((s) => s.id === serviceId);
    if (found) return found;
  }
  return undefined;
}

export function getServiceDependencyGraph(
  topology: SystemTopology
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const layer of topology.layers) {
    for (const service of layer.services) {
      graph.set(service.id, [...service.dependencies]);
    }
  }

  for (const conn of topology.connections) {
    const deps = graph.get(conn.sourceId) ?? [];
    if (!deps.includes(conn.targetId)) {
      deps.push(conn.targetId);
      graph.set(conn.sourceId, deps);
    }
  }

  return graph;
}

export function detectCircularDependencies(
  topology: SystemTopology
): string[][] {
  const graph = getServiceDependencyGraph(topology);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }

    recursionStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

export function getServicesAtTier(
  topology: SystemTopology,
  tier: ServiceTier
): ServiceDefinition[] {
  return topology.layers
    .filter((l) => l.tier === tier)
    .flatMap((l) => l.services);
}

export function getConnectionsBetweenTiers(
  topology: SystemTopology,
  sourceTier: ServiceTier,
  targetTier: ServiceTier
): ServiceConnection[] {
  const sourceIds = new Set(
    getServicesAtTier(topology, sourceTier).map((s) => s.id)
  );
  const targetIds = new Set(
    getServicesAtTier(topology, targetTier).map((s) => s.id)
  );

  return topology.connections.filter(
    (c) => sourceIds.has(c.sourceId) && targetIds.has(c.targetId)
  );
}

// --- Capability Registry ---

export function createCapabilityRegistry(): CapabilityRegistry {
  return {
    capabilities: new Map(),
    lastUpdated: new Date().toISOString(),
  };
}

export function registerCapability(
  registry: CapabilityRegistry,
  name: string,
  category: CapabilityCategory,
  providedBy: string,
  description = '',
  sla = { maxLatencyMs: 1000, availability: 0.999, maxThroughputRps: 1000 }
): Capability {
  const capability: Capability = {
    id: generateId('cap'),
    name,
    category,
    version: '1.0.0',
    description,
    providedBy,
    inputSchema: {},
    outputSchema: {},
    sla,
  };

  registry.capabilities.set(capability.id, capability);
  registry.lastUpdated = new Date().toISOString();
  return capability;
}

export function findCapabilities(
  registry: CapabilityRegistry,
  category?: CapabilityCategory,
  namePattern?: string
): Capability[] {
  const results: Capability[] = [];

  for (const cap of registry.capabilities.values()) {
    if (category && cap.category !== category) continue;
    if (namePattern && !cap.name.toLowerCase().includes(namePattern.toLowerCase())) continue;
    results.push(cap);
  }

  return results;
}

export function resolveCapabilityChain(
  registry: CapabilityRegistry,
  requiredCapabilities: string[]
): { resolved: Capability[]; missing: string[] } {
  const resolved: Capability[] = [];
  const missing: string[] = [];

  for (const name of requiredCapabilities) {
    const found = findCapabilities(registry, undefined, name);
    if (found.length > 0) {
      resolved.push(found[0]);
    } else {
      missing.push(name);
    }
  }

  return { resolved, missing };
}

// --- Event System ---

export function createEvent(
  type: string,
  source: string,
  payload: Record<string, unknown>,
  priority: EventPriority = 'normal',
  correlationId?: string
): SystemEvent {
  return {
    id: generateId('evt'),
    type,
    source,
    priority,
    payload,
    timestamp: new Date().toISOString(),
    correlationId: correlationId ?? generateId('corr'),
  };
}

export function createEventHandler(
  eventType: string,
  serviceId: string,
  maxRetries = 3,
  backoffMs = 1000
): EventHandler {
  return {
    eventType,
    handlerId: generateId('handler'),
    serviceId,
    retryPolicy: {
      maxRetries,
      backoffMs,
      backoffMultiplier: 2,
    },
  };
}

export function createEventPipeline(
  name: string,
  stages: Array<{ name: string; handlerIds: string[]; parallel: boolean }>
): EventPipeline {
  return {
    id: generateId('pipeline'),
    name,
    stages,
  };
}

export function routeEvent(
  event: SystemEvent,
  handlers: EventHandler[]
): EventHandler[] {
  return handlers.filter((h) => {
    if (h.eventType !== event.type) return false;
    if (h.filter) {
      return Object.entries(h.filter).every(
        ([key, value]) => event.payload[key] === value
      );
    }
    return true;
  });
}

// --- Health Monitoring ---

export function checkServiceHealth(
  service: ServiceDefinition
): HealthCheck {
  return {
    serviceId: service.id,
    status: service.status,
    checkedAt: new Date().toISOString(),
    responseTimeMs: Math.random() * 100,
    details: {
      endpoints: service.endpoints.length,
      dependencies: service.dependencies.length,
      version: service.version,
    },
  };
}

export function computeSystemMetrics(
  topology: SystemTopology
): SystemMetrics {
  const services = topology.layers.flatMap((l) => l.services);
  const healthChecks = services.map(checkServiceHealth);
  const healthyCount = healthChecks.filter((h) => h.status === 'healthy').length;
  const avgResponseTime = healthChecks.reduce((sum, h) => sum + h.responseTimeMs, 0) /
    Math.max(healthChecks.length, 1);

  return {
    topologyId: topology.id,
    timestamp: new Date().toISOString(),
    serviceHealth: healthChecks,
    totalRequests: 0,
    errorRate: services.length > 0 ? 1 - healthyCount / services.length : 0,
    avgLatencyMs: avgResponseTime,
    p95LatencyMs: avgResponseTime * 1.5,
    p99LatencyMs: avgResponseTime * 2,
    activeConnections: topology.connections.length,
  };
}

// --- Blueprint Assembly ---

export function assembleBlueprint(
  name: string,
  description: string,
  topology: SystemTopology,
  registry: CapabilityRegistry,
  pipelines: EventPipeline[] = []
): ArchitectureBlueprint {
  const metrics = computeSystemMetrics(topology);

  return {
    id: generateId('blueprint'),
    name,
    version: '1.0.0',
    topology,
    capabilities: registry,
    eventPipelines: pipelines,
    metrics,
    createdAt: new Date().toISOString(),
    description,
  };
}

// --- Pre-built Architecture Templates ---

export function createMicroservicesTemplate(): ArchitectureBlueprint {
  const topology = createTopology('Microservices Architecture');

  // Edge layer
  const gateway = defineService('API Gateway', 'edge', [
    createEndpoint('https', 'gateway.local', 443, '/api'),
  ]);
  const cdn = defineService('CDN', 'edge', [
    createEndpoint('https', 'cdn.local', 443, '/static'),
  ]);
  addLayer(topology, 'Edge', 'edge', [
    updateServiceStatus(gateway, 'healthy'),
    updateServiceStatus(cdn, 'healthy'),
  ]);

  // Application layer
  const reasoningService = defineService('Reasoning Engine', 'application', [
    createEndpoint('grpc', 'reasoning.local', 50051, '/reasoning.v1'),
  ], [], ['logical_inference', 'proof_chains']);

  const nlpService = defineService('NLP Processor', 'application', [
    createEndpoint('grpc', 'nlp.local', 50052, '/nlp.v1'),
  ], [], ['tokenization', 'intent_recognition', 'semantic_analysis']);

  const identityService = defineService('Identity Manager', 'application', [
    createEndpoint('https', 'identity.local', 8080, '/identities'),
  ], [], ['identity_crud', 'unicode_normalization']);

  addLayer(topology, 'Application', 'application', [
    updateServiceStatus(reasoningService, 'healthy'),
    updateServiceStatus(nlpService, 'healthy'),
    updateServiceStatus(identityService, 'healthy'),
  ]);

  // Platform layer
  const authService = defineService('Auth Service', 'platform', [
    createEndpoint('https', 'auth.local', 8443, '/auth'),
  ]);
  const eventBus = defineService('Event Bus', 'platform', [
    createEndpoint('wss', 'events.local', 9090, '/events'),
  ]);
  addLayer(topology, 'Platform', 'platform', [
    updateServiceStatus(authService, 'healthy'),
    updateServiceStatus(eventBus, 'healthy'),
  ]);

  // Core layer
  const database = defineService('PostgreSQL', 'core', [
    createEndpoint('tcp', 'db.local', 5432, '/'),
  ]);
  const cache = defineService('Redis Cache', 'core', [
    createEndpoint('tcp', 'cache.local', 6379, '/'),
  ]);
  const storage = defineService('Object Storage', 'core', [
    createEndpoint('https', 'storage.local', 9000, '/buckets'),
  ]);
  addLayer(topology, 'Core', 'core', [
    updateServiceStatus(database, 'healthy'),
    updateServiceStatus(cache, 'healthy'),
    updateServiceStatus(storage, 'healthy'),
  ]);

  // Connections
  connectServices(topology, gateway.id, reasoningService.id, 'synchronous', 'grpc');
  connectServices(topology, gateway.id, nlpService.id, 'synchronous', 'grpc');
  connectServices(topology, gateway.id, identityService.id, 'synchronous', 'https');
  connectServices(topology, reasoningService.id, database.id, 'synchronous', 'tcp');
  connectServices(topology, nlpService.id, cache.id, 'synchronous', 'tcp');
  connectServices(topology, identityService.id, database.id, 'synchronous', 'tcp');
  connectServices(topology, identityService.id, storage.id, 'asynchronous', 'https');
  connectServices(topology, reasoningService.id, eventBus.id, 'event_driven', 'wss');
  connectServices(topology, nlpService.id, eventBus.id, 'event_driven', 'wss');

  // Capability registry
  const registry = createCapabilityRegistry();
  registerCapability(registry, 'Logical Inference', 'reasoning', reasoningService.id,
    'Forward and backward chaining inference engine');
  registerCapability(registry, 'Proof Chain Generation', 'reasoning', reasoningService.id,
    'Multi-step proof chain construction with confidence scoring');
  registerCapability(registry, 'Tokenization', 'nlp', nlpService.id,
    'Multi-language text tokenization');
  registerCapability(registry, 'Intent Recognition', 'nlp', nlpService.id,
    'Pattern-based intent classification');
  registerCapability(registry, 'Semantic Analysis', 'nlp', nlpService.id,
    'Frame-based semantic role labeling');
  registerCapability(registry, 'Identity CRUD', 'data_processing', identityService.id,
    'Create, read, update, delete identity records');
  registerCapability(registry, 'Unicode Normalization', 'data_processing', identityService.id,
    'NFC/NFD/NFKC/NFKD Unicode normalization');
  registerCapability(registry, 'SHA256 Hashing', 'cryptography', identityService.id,
    'Cryptographic hash generation for data integrity');
  registerCapability(registry, 'Full-Text Search', 'search', identityService.id,
    'Fuzzy search with Levenshtein distance');
  registerCapability(registry, 'Session Auth', 'authentication', authService.id,
    'Cookie-based session authentication via Supabase');

  // Event pipelines
  const inferenceHandler = createEventHandler('inference.requested', reasoningService.id);
  const nlpHandler = createEventHandler('nlp.process', nlpService.id);
  const auditHandler = createEventHandler('audit.log', identityService.id);

  const inferencePipeline = createEventPipeline('Inference Pipeline', [
    { name: 'NLP Processing', handlerIds: [nlpHandler.handlerId], parallel: false },
    { name: 'Reasoning', handlerIds: [inferenceHandler.handlerId], parallel: false },
    { name: 'Audit', handlerIds: [auditHandler.handlerId], parallel: true },
  ]);

  return assembleBlueprint(
    'Legal Reasoning Microservices',
    'A microservices architecture combining logical reasoning, NLP processing, and legal identity management with event-driven communication.',
    topology,
    registry,
    [inferencePipeline]
  );
}
