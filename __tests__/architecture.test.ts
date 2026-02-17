import { describe, it, expect } from 'vitest';
import {
  defineService,
  createEndpoint,
  updateServiceStatus,
  createTopology,
  addLayer,
  addServiceToLayer,
  connectServices,
  findService,
  getServiceDependencyGraph,
  detectCircularDependencies,
  getServicesAtTier,
  getConnectionsBetweenTiers,
  createCapabilityRegistry,
  registerCapability,
  findCapabilities,
  resolveCapabilityChain,
  createEvent,
  createEventHandler,
  createEventPipeline,
  routeEvent,
  checkServiceHealth,
  computeSystemMetrics,
  assembleBlueprint,
  createMicroservicesTemplate,
} from '../lib/architecture/engine';

describe('High-Level Architecture Engine', () => {
  describe('Service definition', () => {
    it('creates a service with required fields', () => {
      const endpoint = createEndpoint('https', 'api.local', 443, '/api');
      const service = defineService('API Server', 'application', [endpoint]);

      expect(service.name).toBe('API Server');
      expect(service.tier).toBe('application');
      expect(service.status).toBe('starting');
      expect(service.endpoints).toHaveLength(1);
      expect(service.id).toMatch(/^svc_/);
    });

    it('creates an endpoint with health check path', () => {
      const endpoint = createEndpoint('grpc', 'grpc.local', 50051, '/service', '/healthz');
      expect(endpoint.protocol).toBe('grpc');
      expect(endpoint.healthCheckPath).toBe('/healthz');
    });

    it('updates service status', () => {
      const service = defineService('Test', 'core', []);
      const updated = updateServiceStatus(service, 'healthy');
      expect(updated.status).toBe('healthy');
      expect(updated.name).toBe('Test');
    });
  });

  describe('Topology builder', () => {
    it('creates empty topology', () => {
      const topo = createTopology('Test System');
      expect(topo.name).toBe('Test System');
      expect(topo.layers).toHaveLength(0);
      expect(topo.connections).toHaveLength(0);
    });

    it('adds layers with services', () => {
      const topo = createTopology('Layered');
      const svc = defineService('DB', 'core', []);
      addLayer(topo, 'Data', 'core', [svc]);

      expect(topo.layers).toHaveLength(1);
      expect(topo.layers[0].services).toHaveLength(1);
      expect(topo.layers[0].tier).toBe('core');
    });

    it('adds services to existing layers', () => {
      const topo = createTopology('Test');
      addLayer(topo, 'App', 'application');

      const svc = defineService('Worker', 'application', []);
      const result = addServiceToLayer(topo, 'App', svc);

      expect(result).toBe(true);
      expect(topo.layers[0].services).toHaveLength(1);
    });

    it('returns false when adding to non-existent layer', () => {
      const topo = createTopology('Test');
      const svc = defineService('Worker', 'application', []);
      const result = addServiceToLayer(topo, 'NonExistent', svc);
      expect(result).toBe(false);
    });

    it('connects services', () => {
      const topo = createTopology('Connected');
      const a = defineService('A', 'application', []);
      const b = defineService('B', 'core', []);
      addLayer(topo, 'App', 'application', [a]);
      addLayer(topo, 'Core', 'core', [b]);

      const conn = connectServices(topo, a.id, b.id, 'synchronous', 'https');
      expect(topo.connections).toHaveLength(1);
      expect(conn.sourceId).toBe(a.id);
      expect(conn.targetId).toBe(b.id);
      expect(conn.encrypted).toBe(true);
    });
  });

  describe('Topology analysis', () => {
    it('finds a service by ID', () => {
      const topo = createTopology('Search');
      const svc = defineService('Target', 'application', []);
      addLayer(topo, 'App', 'application', [svc]);

      const found = findService(topo, svc.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Target');
    });

    it('returns undefined for unknown service', () => {
      const topo = createTopology('Empty');
      expect(findService(topo, 'nonexistent')).toBeUndefined();
    });

    it('builds dependency graph', () => {
      const topo = createTopology('Graph');
      const a = defineService('A', 'application', [], ['dep-1']);
      const b = defineService('B', 'core', []);
      addLayer(topo, 'App', 'application', [a]);
      addLayer(topo, 'Core', 'core', [b]);
      connectServices(topo, a.id, b.id);

      const graph = getServiceDependencyGraph(topo);
      expect(graph.get(a.id)).toContain('dep-1');
      expect(graph.get(a.id)).toContain(b.id);
    });

    it('detects circular dependencies', () => {
      const topo = createTopology('Circular');
      const a = defineService('A', 'application', []);
      const b = defineService('B', 'application', []);
      addLayer(topo, 'App', 'application', [a, b]);

      connectServices(topo, a.id, b.id);
      connectServices(topo, b.id, a.id);

      const cycles = detectCircularDependencies(topo);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('gets services at tier', () => {
      const topo = createTopology('Tiered');
      const app1 = defineService('App1', 'application', []);
      const app2 = defineService('App2', 'application', []);
      const core1 = defineService('DB', 'core', []);
      addLayer(topo, 'App', 'application', [app1, app2]);
      addLayer(topo, 'Core', 'core', [core1]);

      expect(getServicesAtTier(topo, 'application')).toHaveLength(2);
      expect(getServicesAtTier(topo, 'core')).toHaveLength(1);
      expect(getServicesAtTier(topo, 'edge')).toHaveLength(0);
    });

    it('gets connections between tiers', () => {
      const topo = createTopology('Cross-tier');
      const app = defineService('App', 'application', []);
      const db = defineService('DB', 'core', []);
      const cache = defineService('Cache', 'core', []);
      addLayer(topo, 'App', 'application', [app]);
      addLayer(topo, 'Core', 'core', [db, cache]);

      connectServices(topo, app.id, db.id);
      connectServices(topo, app.id, cache.id);

      const conns = getConnectionsBetweenTiers(topo, 'application', 'core');
      expect(conns).toHaveLength(2);
    });
  });

  describe('Capability registry', () => {
    it('creates empty registry', () => {
      const registry = createCapabilityRegistry();
      expect(registry.capabilities.size).toBe(0);
    });

    it('registers and retrieves capabilities', () => {
      const registry = createCapabilityRegistry();
      const cap = registerCapability(registry, 'Reasoning', 'reasoning', 'svc-1', 'Inference engine');

      expect(registry.capabilities.size).toBe(1);
      expect(cap.name).toBe('Reasoning');
      expect(cap.category).toBe('reasoning');
    });

    it('finds capabilities by category', () => {
      const registry = createCapabilityRegistry();
      registerCapability(registry, 'Inference', 'reasoning', 'svc-1');
      registerCapability(registry, 'Tokenize', 'nlp', 'svc-2');
      registerCapability(registry, 'Proof Chain', 'reasoning', 'svc-1');

      const reasoning = findCapabilities(registry, 'reasoning');
      expect(reasoning).toHaveLength(2);

      const nlp = findCapabilities(registry, 'nlp');
      expect(nlp).toHaveLength(1);
    });

    it('finds capabilities by name pattern', () => {
      const registry = createCapabilityRegistry();
      registerCapability(registry, 'Full-Text Search', 'search', 'svc-1');
      registerCapability(registry, 'Search Metrics', 'search', 'svc-1');
      registerCapability(registry, 'Other', 'data_processing', 'svc-2');

      const results = findCapabilities(registry, undefined, 'Search');
      expect(results).toHaveLength(2);
    });

    it('resolves capability chains', () => {
      const registry = createCapabilityRegistry();
      registerCapability(registry, 'reasoning', 'reasoning', 'svc-1');
      registerCapability(registry, 'nlp', 'nlp', 'svc-2');

      const { resolved, missing } = resolveCapabilityChain(registry, ['reasoning', 'nlp', 'storage']);
      expect(resolved).toHaveLength(2);
      expect(missing).toEqual(['storage']);
    });
  });

  describe('Event system', () => {
    it('creates events with correlation IDs', () => {
      const event = createEvent('user.login', 'auth-service', { userId: '123' });
      expect(event.type).toBe('user.login');
      expect(event.correlationId).toBeTruthy();
      expect(event.priority).toBe('normal');
    });

    it('creates event handlers', () => {
      const handler = createEventHandler('user.login', 'audit-service', 5, 2000);
      expect(handler.eventType).toBe('user.login');
      expect(handler.retryPolicy.maxRetries).toBe(5);
      expect(handler.retryPolicy.backoffMs).toBe(2000);
    });

    it('creates event pipelines', () => {
      const pipeline = createEventPipeline('Auth Pipeline', [
        { name: 'Validate', handlerIds: ['h1'], parallel: false },
        { name: 'Notify', handlerIds: ['h2', 'h3'], parallel: true },
      ]);
      expect(pipeline.stages).toHaveLength(2);
      expect(pipeline.stages[1].parallel).toBe(true);
    });

    it('routes events to matching handlers', () => {
      const event = createEvent('user.login', 'auth', { role: 'admin' });
      const handlers = [
        createEventHandler('user.login', 'audit'),
        createEventHandler('user.login', 'notification'),
        createEventHandler('user.logout', 'audit'),
      ];

      const matched = routeEvent(event, handlers);
      expect(matched).toHaveLength(2);
    });
  });

  describe('Health monitoring', () => {
    it('checks service health', () => {
      const service = defineService('API', 'application', []);
      const check = checkServiceHealth(service);
      expect(check.serviceId).toBe(service.id);
      expect(check.checkedAt).toBeTruthy();
    });

    it('computes system metrics', () => {
      const topo = createTopology('Monitored');
      const svc = updateServiceStatus(defineService('A', 'application', []), 'healthy');
      addLayer(topo, 'App', 'application', [svc]);

      const metrics = computeSystemMetrics(topo);
      expect(metrics.topologyId).toBe(topo.id);
      expect(metrics.serviceHealth).toHaveLength(1);
      expect(metrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Blueprint assembly', () => {
    it('assembles a complete blueprint', () => {
      const topo = createTopology('Blueprint Test');
      const svc = defineService('API', 'application', []);
      addLayer(topo, 'App', 'application', [svc]);

      const registry = createCapabilityRegistry();
      registerCapability(registry, 'Test Cap', 'reasoning', svc.id);

      const blueprint = assembleBlueprint('Test Blueprint', 'A test', topo, registry);
      expect(blueprint.name).toBe('Test Blueprint');
      expect(blueprint.topology).toBe(topo);
      expect(blueprint.capabilities.capabilities.size).toBe(1);
      expect(blueprint.metrics).toBeDefined();
    });
  });

  describe('Microservices template', () => {
    it('generates a complete microservices architecture', () => {
      const blueprint = createMicroservicesTemplate();

      expect(blueprint.name).toBe('Legal Reasoning Microservices');
      expect(blueprint.topology.layers.length).toBeGreaterThanOrEqual(4);

      const totalServices = blueprint.topology.layers.reduce(
        (sum, l) => sum + l.services.length, 0
      );
      expect(totalServices).toBeGreaterThanOrEqual(8);
      expect(blueprint.topology.connections.length).toBeGreaterThan(0);
      expect(blueprint.capabilities.capabilities.size).toBeGreaterThan(0);
      expect(blueprint.eventPipelines.length).toBeGreaterThan(0);
    });
  });
});
