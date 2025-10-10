import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SearchMetrics } from "@/lib/types/identity"

interface SearchMetricsDisplayProps {
  metrics: SearchMetrics
}

export function SearchMetricsDisplay({ metrics }: SearchMetricsDisplayProps) {
  const fpr = metrics.false_positive_rate?.toFixed(2) || "0.00"
  const fnr = metrics.false_negative_rate?.toFixed(2) || "0.00"
  const precision = metrics.precision_score?.toFixed(2) || "0.00"
  const recall = metrics.recall_score?.toFixed(2) || "0.00"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">False Positive Rate</span>
            <Badge variant={Number.parseFloat(fpr) < 2 ? "default" : "destructive"}>{fpr}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Target: &lt;2%</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">False Negative Rate</span>
            <Badge variant={Number.parseFloat(fnr) < 1 ? "default" : "destructive"}>{fnr}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Target: &lt;1%</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Precision</span>
            <Badge variant={Number.parseFloat(precision) > 98 ? "default" : "secondary"}>{precision}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Target: &gt;98%</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Recall</span>
            <Badge variant={Number.parseFloat(recall) > 99 ? "default" : "secondary"}>{recall}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Target: &gt;99%</p>
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Total Searches</p>
            <p className="text-2xl font-bold">{metrics.total_searches}</p>
          </div>
        </div>

        {metrics.recommended_threshold && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-1">Recommended Threshold</p>
            <p className="text-lg font-bold">{(metrics.recommended_threshold * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Based on recent performance</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
