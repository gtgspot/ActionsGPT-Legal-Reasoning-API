"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  processNLP,
  createProtocolSession,
  advancePhase,
  sendProtocolMessage,
} from "@/lib/nlp/engine";
import type { NLPResult, ProtocolSession } from "@/lib/nlp/types";

export default function NLPPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<NLPResult | null>(null);

  // Protocol state
  const [protoSession, setProtoSession] = useState<ProtocolSession | null>(null);
  const [protoMessage, setProtoMessage] = useState("");

  function analyze() {
    if (!input.trim()) return;
    setResult(processNLP(input));
  }

  function startProtocol() {
    setProtoSession(createProtocolSession(["user", "system"], [
      { name: "reasoning", version: "1.0", parameters: {}, required: true },
      { name: "nlp", version: "1.0", parameters: {}, required: true },
    ]));
  }

  function sendMessage() {
    if (!protoSession || !protoMessage.trim()) return;
    sendProtocolMessage(protoSession, "user", "system", protoMessage);
    setProtoMessage("");
    setProtoSession({ ...protoSession });
  }

  function advance() {
    if (!protoSession) return;
    advancePhase(protoSession);
    setProtoSession({ ...protoSession });
  }

  const sentimentColor = result
    ? result.semantics.sentiment.polarity > 0.1 ? "text-green-600"
      : result.semantics.sentiment.polarity < -0.1 ? "text-red-600"
      : "text-gray-600"
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NLP Console</h1>
        <p className="text-muted-foreground">
          Natural language processing pipeline with tokenization, intent recognition, semantic analysis, and protocol management.
        </p>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze">Analyze Text</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="semantics">Semantics</TabsTrigger>
          <TabsTrigger value="protocol">Protocol</TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Text Analysis Pipeline</CardTitle>
              <CardDescription>Enter text to run through the full NLP pipeline: tokenization, intent recognition, entity extraction, semantic analysis, and discourse parsing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text to analyze... e.g., 'Find all identity records with Unicode errors and generate a compliance report.'"
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={analyze}>Analyze</Button>
                <Button variant="outline" onClick={() => { setInput(""); setResult(null); }}>Clear</Button>
              </div>

              {result && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Primary Intent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{result.intents.intent.category}</Badge>
                        <Badge variant="outline">{result.intents.intent.action}</Badge>
                      </div>
                      <Progress value={result.intents.score * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Confidence: {(result.intents.score * 100).toFixed(1)}%</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Sentiment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-2xl font-bold ${sentimentColor}`}>
                        {result.semantics.sentiment.polarity > 0.1 ? "Positive" :
                         result.semantics.sentiment.polarity < -0.1 ? "Negative" : "Neutral"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Polarity: {result.semantics.sentiment.polarity.toFixed(3)} | Magnitude: {result.semantics.sentiment.magnitude.toFixed(3)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Entities ({result.semantics.entities.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.semantics.entities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No entities detected</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {result.semantics.entities.map((e, i) => (
                            <Badge key={i} variant="secondary">{e.type}: {e.text}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Discourse</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{result.discourse.units.length} unit(s)</p>
                      <p className="text-sm text-muted-foreground">Coherence: {(result.discourse.coherenceScore * 100).toFixed(0)}%</p>
                      <div className="mt-2 space-y-1">
                        {result.discourse.units.slice(0, 5).map((u) => (
                          <div key={u.id} className="text-xs font-mono flex gap-2">
                            <Badge variant="outline" className="text-xs">{u.relation}</Badge>
                            <span className="truncate">{u.text}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Alternative Intents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.intents.alternativeIntents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No alternative intents</p>
                      ) : (
                        <div className="space-y-2">
                          {result.intents.alternativeIntents.map((alt) => (
                            <div key={alt.id} className="flex items-center gap-2">
                              <Badge variant="secondary">{alt.category}/{alt.action}</Badge>
                              <Progress value={alt.confidence * 100} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-12 text-right">{(alt.confidence * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Processing Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tokens</p>
                          <p className="text-lg font-bold">{result.tokens.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Frames</p>
                          <p className="text-lg font-bold">{result.semantics.frames.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Complexity</p>
                          <p className="text-lg font-bold">{(result.semantics.complexity * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="text-lg font-bold">{result.processingTimeMs.toFixed(2)}ms</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Stream</CardTitle>
              <CardDescription>Detailed view of the tokenization output with positions and types.</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-muted-foreground">Analyze text first to see tokens.</p>
              ) : (
                <div className="rounded-md border overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Value</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Position</th>
                        <th className="px-3 py-2 text-left">Normalized</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tokens
                        .filter((t) => t.type !== "whitespace")
                        .map((t, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-3 py-1 text-muted-foreground">{i}</td>
                            <td className="px-3 py-1 font-mono">{t.value}</td>
                            <td className="px-3 py-1"><Badge variant="outline">{t.type}</Badge></td>
                            <td className="px-3 py-1">{t.position}</td>
                            <td className="px-3 py-1 font-mono text-muted-foreground">{t.normalized}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Semantics Tab */}
        <TabsContent value="semantics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semantic Frames</CardTitle>
              <CardDescription>Predicate-argument structures extracted from the input text.</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-muted-foreground">Analyze text first to see semantic frames.</p>
              ) : (
                <div className="space-y-3">
                  {result.semantics.frames.map((frame, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{frame.predicate}</Badge>
                        <Badge variant="outline">{frame.modality}</Badge>
                        {frame.negated && <Badge variant="destructive">negated</Badge>}
                      </div>
                      {frame.roles.size > 0 && (
                        <div className="text-sm space-y-1">
                          {Array.from(frame.roles.entries()).map(([role, value]) => (
                            <div key={role} className="flex gap-2">
                              <span className="text-muted-foreground w-24">{role}:</span>
                              <span className="font-mono">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocol Tab */}
        <TabsContent value="protocol" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Protocol Session</CardTitle>
              <CardDescription>Manage a natural language protocol session with phase progression and message exchange.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!protoSession ? (
                <Button onClick={startProtocol}>Start Protocol Session</Button>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Badge variant="default">{protoSession.phase}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {protoSession.messages.length} message(s) | Participants: {protoSession.participants.join(", ")}
                    </span>
                    <Button variant="outline" size="sm" onClick={advance}>Advance Phase</Button>
                  </div>

                  <div className="rounded-md border p-3 max-h-64 overflow-auto space-y-2">
                    {protoSession.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages yet.</p>
                    ) : (
                      protoSession.messages.map((msg) => (
                        <div key={msg.id} className="text-sm border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{msg.sender}</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="outline">{msg.recipient}</Badge>
                            <Badge variant="outline" className="text-xs">{msg.phase}</Badge>
                            <Badge className="text-xs">{msg.intent.category}/{msg.intent.action}</Badge>
                          </div>
                          <p className="mt-1 font-mono">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={protoMessage}
                      onChange={(e) => setProtoMessage(e.target.value)}
                      placeholder="Type a protocol message..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} className="self-end">Send</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
