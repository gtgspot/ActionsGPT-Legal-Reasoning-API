"use client"

import dynamic from "next/dynamic"

const InteractiveDemo = dynamic(
  () => import("@/components/interactive-demo").then((mod) => ({ default: mod.InteractiveDemo })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12 bg-muted rounded-lg">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading interactive demo...</p>
        </div>
      </div>
    ),
  },
)

export function InteractiveDemoWrapper() {
  return <InteractiveDemo />
}
