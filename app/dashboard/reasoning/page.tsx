"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createProposition,
  and,
  or,
  not,
  implies,
  evaluateExpression,
  generateTruthTable,
  createRule,
  forwardChain,
  buildProofChain,
  analyzeLegalSyllogism,
  checkConsistency,
  createReasoningSession,
  addPropositionToSession,
  addRuleToSession,
  runSessionInference,
  completeSession,
} from "@/lib/reasoning/engine";
import type { Proposition, InferenceStep, ProofChain, LegalSyllogism } from "@/lib/reasoning/types";

export default function ReasoningPage() {
  // --- Proposition Builder State ---
  const [propLabel, setPropLabel] = useState("");
  const [propValue, setPropValue] = useState<"true" | "false" | "null">("null");
  const [propConfidence, setPropConfidence] = useState("1.0");
  const [propositions, setPropositions] = useState<Proposition[]>([]);

  // --- Expression Evaluator State ---
  const [exprOp, setExprOp] = useState<"AND" | "OR" | "NOT" | "IMPLIES">("AND");
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([]);
  const [evalResult, setEvalResult] = useState<boolean | null>(null);

  // --- Truth Table State ---
  const [truthTable, setTruthTable] = useState<{ assignments: Array<Record<string, boolean>>; results: boolean[] } | null>(null);

  // --- Inference State ---
  const [inferenceSteps, setInferenceSteps] = useState<InferenceStep[]>([]);

  // --- Legal Syllogism State ---
  const [majorLabel, setMajorLabel] = useState("");
  const [minorLabel, setMinorLabel] = useState("");
  const [syllogismResult, setSyllogismResult] = useState<LegalSyllogism | null>(null);

  // --- Proof Chain State ---
  const [proofChain, setProofChain] = useState<ProofChain | null>(null);

  // --- Consistency State ---
  const [consistencyResult, setConsistencyResult] = useState<{ isConsistent: boolean; conflicts: Array<[Proposition, Proposition]> } | null>(null);

  function addProposition() {
    if (!propLabel.trim()) return;
    const value = propValue === "null" ? null : propValue === "true";
    const p = createProposition(propLabel.trim(), value, parseFloat(propConfidence));
    setPropositions((prev) => [...prev, p]);
    setPropLabel("");
  }

  function evaluateExpr() {
    const selected = propositions.filter((p) => selectedPropIds.includes(p.id));
    if (selected.length < 1) return;

    let expr;
    switch (exprOp) {
      case "AND":
        expr = and(...selected);
        break;
      case "OR":
        expr = or(...selected);
        break;
      case "NOT":
        expr = not(selected[0]);
        break;
      case "IMPLIES":
        if (selected.length < 2) return;
        expr = implies(selected[0], selected[1]);
        break;
    }
    setEvalResult(evaluateExpression(expr));
  }

  function genTruthTable() {
    const selected = propositions.filter((p) => selectedPropIds.includes(p.id));
    if (selected.length < 1) return;
    const expr = exprOp === "AND" ? and(...selected) : or(...selected);
    setTruthTable(generateTruthTable(expr));
  }

  function runInference() {
    if (propositions.length < 2) return;
    const facts = new Map(propositions.map((p) => [p.id, p]));
    const trueProps = propositions.filter((p) => p.value === true);
    const goalProp = propositions.find((p) => p.value === null) ?? propositions[propositions.length - 1];

    if (trueProps.length >= 2) {
      const rule = createRule("Auto Rule", "Inferred from true propositions", and(...trueProps), goalProp, "medium");
      const steps = forwardChain([rule], facts);
      setInferenceSteps(steps);

      const proof = buildProofChain(goalProp, [rule], facts, "forward_chaining");
      setProofChain(proof);
    }
  }

  function runSyllogism() {
    if (!majorLabel.trim() || !minorLabel.trim()) return;
    const major = createProposition(majorLabel.trim(), true, 0.95);
    const minor = createProposition(minorLabel.trim(), true, 0.9);
    setSyllogismResult(analyzeLegalSyllogism(major, minor));
  }

  function runConsistencyCheck() {
    if (propositions.length < 2) return;
    setConsistencyResult(checkConsistency(propositions));
  }

  function togglePropSelection(id: string) {
    setSelectedPropIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reasoning Engine</h1>
        <p className="text-muted-foreground">
          Propositional logic evaluation, inference chaining, proof generation, and legal syllogism analysis.
        </p>
      </div>

      <Tabs defaultValue="propositions">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="propositions">Propositions</TabsTrigger>
          <TabsTrigger value="evaluate">Evaluate</TabsTrigger>
          <TabsTrigger value="inference">Inference</TabsTrigger>
          <TabsTrigger value="syllogism">Syllogism</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
        </TabsList>

        {/* Propositions Tab */}
        <TabsContent value="propositions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proposition Builder</CardTitle>
              <CardDescription>Create propositions with truth values and confidence scores to use in logical reasoning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="prop-label">Label</Label>
                  <Input id="prop-label" value={propLabel} onChange={(e) => setPropLabel(e.target.value)} placeholder="e.g., 'Defendant is a citizen'" />
                </div>
                <div>
                  <Label>Value</Label>
                  <Select value={propValue} onValueChange={(v) => setPropValue(v as "true" | "false" | "null")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                      <SelectItem value="null">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="confidence">Confidence</Label>
                  <Input id="confidence" type="number" min="0" max="1" step="0.05" value={propConfidence} onChange={(e) => setPropConfidence(e.target.value)} />
                </div>
              </div>
              <Button onClick={addProposition}>Add Proposition</Button>

              {propositions.length > 0 && (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left">Select</th>
                        <th className="px-4 py-2 text-left">Label</th>
                        <th className="px-4 py-2 text-left">Value</th>
                        <th className="px-4 py-2 text-left">Confidence</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propositions.map((p) => (
                        <tr key={p.id} className="border-b cursor-pointer hover:bg-muted/30" onClick={() => togglePropSelection(p.id)}>
                          <td className="px-4 py-2">
                            <input type="checkbox" checked={selectedPropIds.includes(p.id)} readOnly />
                          </td>
                          <td className="px-4 py-2 font-mono">{p.label}</td>
                          <td className="px-4 py-2">
                            <Badge variant={p.value === true ? "default" : p.value === false ? "destructive" : "secondary"}>
                              {p.value === null ? "unknown" : String(p.value)}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">{(p.confidence * 100).toFixed(0)}%</td>
                          <td className="px-4 py-2"><Badge variant="outline">{p.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluate Tab */}
        <TabsContent value="evaluate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expression Evaluator</CardTitle>
              <CardDescription>Combine selected propositions with a logical operator and evaluate the expression.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div>
                  <Label>Operator</Label>
                  <Select value={exprOp} onValueChange={(v) => setExprOp(v as typeof exprOp)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND (∧)</SelectItem>
                      <SelectItem value="OR">OR (∨)</SelectItem>
                      <SelectItem value="NOT">NOT (¬)</SelectItem>
                      <SelectItem value="IMPLIES">IMPLIES (→)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={evaluateExpr}>Evaluate</Button>
                <Button variant="outline" onClick={genTruthTable}>Truth Table</Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Selected: {selectedPropIds.length} proposition(s)
              </p>

              {evalResult !== null && (
                <div className="rounded-md border p-4 bg-muted/50">
                  <p className="text-lg font-mono">
                    Result: <Badge variant={evalResult ? "default" : "destructive"}>{String(evalResult)}</Badge>
                  </p>
                </div>
              )}

              {truthTable && (
                <div className="rounded-md border overflow-auto max-h-64">
                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {truthTable.assignments.length > 0 && Object.keys(truthTable.assignments[0]).map((key) => (
                          <th key={key} className="px-3 py-1 text-left">{key}</th>
                        ))}
                        <th className="px-3 py-1 text-left">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {truthTable.assignments.map((row, i) => (
                        <tr key={i} className="border-b">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-1">{val ? "T" : "F"}</td>
                          ))}
                          <td className="px-3 py-1 font-bold">{truthTable.results[i] ? "T" : "F"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inference Tab */}
        <TabsContent value="inference" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Forward Chaining Inference</CardTitle>
              <CardDescription>Derive new facts from existing propositions using forward chaining. Requires at least 2 propositions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runInference} disabled={propositions.length < 2}>Run Inference</Button>

              {inferenceSteps.length > 0 && (
                <div className="space-y-3">
                  {inferenceSteps.map((step) => (
                    <div key={step.stepNumber} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>Step {step.stepNumber}</Badge>
                        <Badge variant="outline">{step.strategy}</Badge>
                        <span className="text-sm text-muted-foreground">Confidence: {(step.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-sm font-mono">{step.justification}</p>
                      <p className="text-sm mt-1">
                        Derived: <span className="font-semibold">{step.derivedProposition.label}</span> = {String(step.derivedProposition.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {proofChain && (
                <div className="rounded-md border p-4 bg-muted/50 mt-4">
                  <h3 className="font-semibold mb-2">Proof Chain</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valid:</span>{" "}
                      <Badge variant={proofChain.isValid ? "default" : "destructive"}>{String(proofChain.isValid)}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>{" "}
                      {(proofChain.overallConfidence * 100).toFixed(1)}%
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      {proofChain.durationMs.toFixed(2)}ms
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Syllogism Tab */}
        <TabsContent value="syllogism" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legal Syllogism Builder</CardTitle>
              <CardDescription>Construct legal syllogisms from major and minor premises to derive legal conclusions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Major Premise (General Rule)</Label>
                  <Input value={majorLabel} onChange={(e) => setMajorLabel(e.target.value)} placeholder="e.g., 'All citizens have voting rights'" />
                </div>
                <div>
                  <Label>Minor Premise (Specific Fact)</Label>
                  <Input value={minorLabel} onChange={(e) => setMinorLabel(e.target.value)} placeholder="e.g., 'John is a citizen'" />
                </div>
              </div>
              <Button onClick={runSyllogism}>Analyze Syllogism</Button>

              {syllogismResult && (
                <div className="rounded-md border p-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Major Premise</p>
                    <p className="font-mono">{syllogismResult.majorPremise.label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Minor Premise</p>
                    <p className="font-mono">{syllogismResult.minorPremise.label}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Conclusion</p>
                    <p className="font-mono font-semibold">{syllogismResult.conclusion.label}</p>
                    <div className="flex gap-4 mt-2">
                      <Badge variant={syllogismResult.conclusion.value ? "default" : "destructive"}>
                        {syllogismResult.conclusion.value ? "Valid" : "Invalid"}
                      </Badge>
                      <span className="text-sm">Strength: {(syllogismResult.strength * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consistency Tab */}
        <TabsContent value="consistency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consistency Checker</CardTitle>
              <CardDescription>Check whether the current set of propositions contains any logical contradictions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runConsistencyCheck} disabled={propositions.length < 2}>Check Consistency</Button>

              {consistencyResult && (
                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={consistencyResult.isConsistent ? "default" : "destructive"}>
                      {consistencyResult.isConsistent ? "Consistent" : "Inconsistent"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {consistencyResult.conflicts.length} conflict(s) detected
                    </span>
                  </div>
                  {consistencyResult.conflicts.map(([a, b], i) => (
                    <div key={i} className="text-sm font-mono border-t pt-2 mt-2">
                      Conflict: &quot;{a.label}&quot; = {String(a.value)} vs &quot;{b.label}&quot; = {String(b.value)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
