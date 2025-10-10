import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react"

interface TestMetricsProps {
  totalTests: number
  passedTests: number
  failedTests: number
  passRate: string
  avgCharLoss: string
  avgDiacriticLoss: string
}

export function TestMetrics({
  totalTests,
  passedTests,
  failedTests,
  passRate,
  avgCharLoss,
  avgDiacriticLoss,
}: TestMetricsProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTests}</div>
          <p className="text-xs text-muted-foreground mt-1">All time executions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{passRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {passedTests} passed, {failedTests} failed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Character Loss</CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgCharLoss}%</div>
          <p className="text-xs text-muted-foreground mt-1">Target: 0.00% (zero tolerance)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Diacritic Loss</CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgDiacriticLoss}%</div>
          <p className="text-xs text-muted-foreground mt-1">Target: 0.00% (zero tolerance)</p>
        </CardContent>
      </Card>
    </div>
  )
}
