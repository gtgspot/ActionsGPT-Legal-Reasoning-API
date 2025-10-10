import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Database, TestTube, Search, FileText, CheckCircle } from "lucide-react"
import { InteractiveDemo } from "@/components/interactive-demo"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted mb-6">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Legal Tech SaaS Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">Legal Identity Management System</h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty">
              Enterprise-grade platform for managing multilingual identity records with complete data integrity,
              round-trip testing, and court-ready exhibit generation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Try It Now - No Account Required</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience all six components of the Legal Identity Management system in one comprehensive interactive demo
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <InteractiveDemo />
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Minimal Legal Operational Playbook</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive compliance with legal standards for identity data management
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Database className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Dual-Field Identity</CardTitle>
              <CardDescription>
                Original script and canonical ASCII fields with zero-tolerance for lossy storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>UTF-8 encoding with byte-level verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>ICU 73.1+ and Unicode 15.0+ compliance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>SHA-256 hash verification</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TestTube className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Round-Trip Testing</CardTitle>
              <CardDescription>
                Automated validation of data integrity through storage, export, and presentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Character loss rate tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Diacritic preservation verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Byte-level comparison</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Alias Register</CardTitle>
              <CardDescription>
                Single authoritative source for all identity variants including MRZ and native formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Confidence scoring for variants</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Source document tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Automatic deduplication</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Search className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>
                Fuzzy matching with configurable thresholds and comprehensive performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Phonetic and Levenshtein matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>False positive/negative tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Accent-insensitive options</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Exhibit Generator</CardTitle>
              <CardDescription>
                Court-ready exhibits with visual proof, byte dumps, and cryptographic verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Screenshot capture with metadata</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Hexadecimal byte dumps</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Chain of custody tracking</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Compliance & Audit</CardTitle>
              <CardDescription>Complete audit trails and compliance reporting for legal requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Row-level security (RLS)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Complete operation logging</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  <span>Performance metrics dashboard</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join legal professionals using our platform for compliant identity management
            </p>
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Create Your Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
