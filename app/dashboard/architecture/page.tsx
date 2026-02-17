"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { createMicroservicesTemplate } from "@/lib/architecture/engine";
import type { ArchitectureBlueprint } from "@/lib/architecture/types";

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  unhealthy: "bg-red-500",
  starting: "bg-blue-500",
  stopping: "bg-orange-500",
  unknown: "bg-gray-500",
};

const TIER_LABELS: Record<string, string> = {
  edge: "Edge Layer",
  application: "Application Layer",
  platform: "Platform Layer",
  core: "Core Infrastructure",
  external: "External Services",
};

export default function ArchitecturePage() {
  const [blueprint, setBlueprint] = useState<ArchitectureBlueprint | null>(null);

  function loadBlueprint() {
    setBlueprint(createMicroservicesTemplate());
  }

  const totalServices = blueprint
    ? blueprint.topology.layers.reduce((sum, l) => sum + l.services.length, 0)
    : 0;
  const healthyCount = blueprint
    ? blueprint.metrics.serviceHealth.filter((h) => h.status === "healthy").length
    : 0;
  const capCount = blueprint ? blueprint.capabilities.capabilities.size : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Architecture</h1>
        <p className="text-muted-foreground">
          System topology visualization, service mesh, capability registry, and event pipeline management.
        </p>
      </div>

      {!blueprint ? (
        <Card>
          <CardHeader>
            <CardTitle>Architecture Blueprint</CardTitle>
            <CardDescription>Load a pre-built microservices architecture template demonstrating the full system topology.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadBlueprint}>Load Microservices Template</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-3xl font-bold">{totalServices}</p>
                <p className="text-xs text-muted-foreground">{blueprint.topology.layers.length} layers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Connections</p>
                <p className="text-3xl font-bold">{blueprint.topology.connections.length}</p>
                <p className="text-xs text-muted-foreground">service links</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Capabilities</p>
                <p className="text-3xl font-bold">{capCount}</p>
                <p className="text-xs text-muted-foreground">registered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Health</p>
                <p className="text-3xl font-bold">{healthyCount}/{totalServices}</p>
                <p className="text-xs text-muted-foreground">services healthy</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="topology">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="topology">Topology</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="events">Event Pipelines</TabsTrigger>
              <TabsTrigger value="health">Health Metrics</TabsTrigger>
            </TabsList>

            {/* Topology Tab */}
            <TabsContent value="topology" className="space-y-4">
              {blueprint.topology.layers.map((layer) => (
                <Card key={layer.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{TIER_LABELS[layer.tier] ?? layer.name}</CardTitle>
                      <Badge variant="outline">{layer.tier}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {layer.services.map((svc) => (
                        <div key={svc.id} className="rounded-md border p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[svc.status] ?? "bg-gray-400"}`} />
                            <span className="font-medium text-sm">{svc.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>v{svc.version}</p>
                            {svc.endpoints.map((ep, i) => (
                              <p key={i} className="font-mono">{ep.protocol}://{ep.host}:{ep.port}{ep.path}</p>
                            ))}
                            {svc.capabilities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {svc.capabilities.map((cap) => (
                                  <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Service Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left">Source</th>
                          <th className="px-3 py-2 text-left">Target</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Protocol</th>
                          <th className="px-3 py-2 text-left">Encrypted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blueprint.topology.connections.map((conn, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-3 py-1 font-mono text-xs">{conn.sourceId.slice(0, 20)}...</td>
                            <td className="px-3 py-1 font-mono text-xs">{conn.targetId.slice(0, 20)}...</td>
                            <td className="px-3 py-1"><Badge variant="outline">{conn.connectionType}</Badge></td>
                            <td className="px-3 py-1">{conn.protocol}</td>
                            <td className="px-3 py-1">{conn.encrypted ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capabilities Tab */}
            <TabsContent value="capabilities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Capability Registry</CardTitle>
                  <CardDescription>All registered capabilities across the system with SLA guarantees.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Array.from(blueprint.capabilities.capabilities.values()).map((cap) => (
                      <div key={cap.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{cap.name}</span>
                          <Badge>{cap.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{cap.description}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Max Latency</p>
                            <p className="font-mono">{cap.sla.maxLatencyMs}ms</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Availability</p>
                            <p className="font-mono">{(cap.sla.availability * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Throughput</p>
                            <p className="font-mono">{cap.sla.maxThroughputRps} rps</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-4">
              {blueprint.eventPipelines.map((pipeline) => (
                <Card key={pipeline.id}>
                  <CardHeader>
                    <CardTitle>{pipeline.name}</CardTitle>
                    <CardDescription>{pipeline.stages.length} stage(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {pipeline.stages.map((stage, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="rounded-md border p-3 text-center min-w-32">
                            <p className="font-medium text-sm">{stage.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {stage.handlerIds.length} handler(s)
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {stage.parallel ? "parallel" : "sequential"}
                            </Badge>
                          </div>
                          {i < pipeline.stages.length - 1 && (
                            <span className="text-muted-foreground text-xl">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Health Tab */}
            <TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Avg Latency</p>
                    <p className="text-2xl font-bold">{blueprint.metrics.avgLatencyMs.toFixed(1)}ms</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">P95 Latency</p>
                    <p className="text-2xl font-bold">{blueprint.metrics.p95LatencyMs.toFixed(1)}ms</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">P99 Latency</p>
                    <p className="text-2xl font-bold">{blueprint.metrics.p99LatencyMs.toFixed(1)}ms</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Error Rate</p>
                    <p className="text-2xl font-bold">{(blueprint.metrics.errorRate * 100).toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Service Health Checks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {blueprint.metrics.serviceHealth.map((check) => (
                      <div key={check.serviceId} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[check.status] ?? "bg-gray-400"}`} />
                        <span className="font-mono text-sm w-48 truncate">{check.serviceId.slice(0, 30)}</span>
                        <Badge variant={check.status === "healthy" ? "default" : "destructive"}>{check.status}</Badge>
                        <div className="flex-1">
                          <Progress value={Math.max(0, 100 - check.responseTimeMs)} className="h-1.5" />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">{check.responseTimeMs.toFixed(1)}ms</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
