/**
 * Type definitions for the High-Level Architecture module.
 *
 * Models system topology, service mesh, capability registries,
 * event-driven pipelines, and distributed component orchestration.
 */

// --- Service Definition ---

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'starting' | 'stopping' | 'unknown';

export type ServiceTier = 'core' | 'platform' | 'application' | 'edge' | 'external';

export interface ServiceEndpoint {
  protocol: 'http' | 'https' | 'grpc' | 'ws' | 'wss' | 'tcp';
  host: string;
  port: number;
  path: string;
  healthCheckPath: string;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  version: string;
  tier: ServiceTier;
  status: ServiceStatus;
  endpoints: ServiceEndpoint[];
  dependencies: string[];
  capabilities: string[];
  metadata: Record<string, unknown>;
}

// --- System Topology ---

export type ConnectionType = 'synchronous' | 'asynchronous' | 'event_driven' | 'streaming';

export interface ServiceConnection {
  sourceId: string;
  targetId: string;
  connectionType: ConnectionType;
  protocol: string;
  latencyMs: number;
  throughputRps: number;
  encrypted: boolean;
}

export interface TopologyLayer {
  name: string;
  tier: ServiceTier;
  services: ServiceDefinition[];
}

export interface SystemTopology {
  id: string;
  name: string;
  version: string;
  layers: TopologyLayer[];
  connections: ServiceConnection[];
  createdAt: string;
}

// --- Capability Registry ---

export type CapabilityCategory =
  | 'reasoning'
  | 'nlp'
  | 'data_processing'
  | 'storage'
  | 'authentication'
  | 'cryptography'
  | 'search'
  | 'visualization'
  | 'notification'
  | 'integration';

export interface Capability {
  id: string;
  name: string;
  category: CapabilityCategory;
  version: string;
  description: string;
  providedBy: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  sla: {
    maxLatencyMs: number;
    availability: number; // 0.0 to 1.0 (e.g., 0.999)
    maxThroughputRps: number;
  };
}

export interface CapabilityRegistry {
  capabilities: Map<string, Capability>;
  lastUpdated: string;
}

// --- Event System ---

export type EventPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  priority: EventPriority;
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId: string;
}

export interface EventHandler {
  eventType: string;
  handlerId: string;
  serviceId: string;
  filter?: Record<string, unknown>;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
}

export interface EventPipeline {
  id: string;
  name: string;
  stages: Array<{
    name: string;
    handlerIds: string[];
    parallel: boolean;
  }>;
}

// --- Health & Metrics ---

export interface HealthCheck {
  serviceId: string;
  status: ServiceStatus;
  checkedAt: string;
  responseTimeMs: number;
  details: Record<string, unknown>;
}

export interface SystemMetrics {
  topologyId: string;
  timestamp: string;
  serviceHealth: HealthCheck[];
  totalRequests: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  activeConnections: number;
}

// --- Architecture Blueprint ---

export interface ArchitectureBlueprint {
  id: string;
  name: string;
  version: string;
  topology: SystemTopology;
  capabilities: CapabilityRegistry;
  eventPipelines: EventPipeline[];
  metrics: SystemMetrics;
  createdAt: string;
  description: string;
}
