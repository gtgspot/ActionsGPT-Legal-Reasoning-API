"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Database, TestTube, Search, FileText, LayoutDashboard, LogOut, Shield, TrendingUp, BrainCircuit, Languages, Network } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface DashboardNavProps {
  user: User
}

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Identity Records",
    href: "/dashboard/identities",
    icon: Database,
  },
  {
    title: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    title: "Round-Trip Testing",
    href: "/dashboard/testing",
    icon: TestTube,
  },
  {
    title: "Search & Match",
    href: "/dashboard/search",
    icon: Search,
  },
  {
    title: "Court Exhibits",
    href: "/dashboard/exhibits",
    icon: FileText,
  },
  {
    title: "Search Metrics",
    href: "/dashboard/search/metrics",
    icon: TrendingUp,
  },
  {
    title: "Reasoning Engine",
    href: "/dashboard/reasoning",
    icon: BrainCircuit,
  },
  {
    title: "NLP Console",
    href: "/dashboard/nlp",
    icon: Languages,
  },
  {
    title: "Architecture",
    href: "/dashboard/architecture",
    icon: Network,
  },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-muted/40">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6" />
          <span className="text-lg">Legal Identity</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-3", isActive && "bg-secondary")}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">Logged in</p>
        </div>
        <Separator className="mb-3" />
        <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
