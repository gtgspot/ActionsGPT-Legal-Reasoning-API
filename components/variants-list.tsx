"use client"

import type { IdentityVariant } from "@/lib/types/identity"
import { Badge } from "@/components/ui/badge"

interface VariantsListProps {
  variants: IdentityVariant[]
}

export function VariantsList({ variants }: VariantsListProps) {
  if (variants.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No variants recorded yet</p>
  }

  return (
    <div className="space-y-3">
      {variants.map((variant) => (
        <div key={variant.id} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="font-mono text-lg mb-1">{variant.representation}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{variant.variant_type}</Badge>
                {variant.script_code && <Badge variant="secondary">{variant.script_code}</Badge>}
                {variant.language_code && <Badge variant="secondary">{variant.language_code}</Badge>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">Confidence: {(variant.confidence_score * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(variant.source_timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Source: {variant.source_document}</div>
        </div>
      ))}
    </div>
  )
}
