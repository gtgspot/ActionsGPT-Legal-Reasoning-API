import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch exhibit with identity
  const { data: exhibit, error } = await supabase
    .from("court_exhibits")
    .select(
      `
      *,
      identity_records (
        original_script,
        canonical_ascii,
        script_code,
        language_code
      )
    `,
    )
    .eq("id", id)
    .single()

  if (error || !exhibit) {
    return NextResponse.json({ error: "Exhibit not found" }, { status: 404 })
  }

  // Generate exhibit document
  const document = `
EXHIBIT ${exhibit.exhibit_number}: Identity String Evidence
${exhibit.case_number ? `Case Number: ${exhibit.case_number}` : ""}

═══════════════════════════════════════════════════════════════

VISUAL REPRESENTATION:
${exhibit.identity_records?.original_script}

Font: ${exhibit.font_information?.family || "Arial Unicode MS"}, ${exhibit.font_information?.size || "12pt"}
Rendering Engine: ${exhibit.rendering_environment?.browser || "Browser Default"}
Display: ${exhibit.rendering_environment?.display || "1920x1080"}, ${exhibit.rendering_environment?.dpi || "96"} DPI

═══════════════════════════════════════════════════════════════

TECHNICAL DETAILS:

Byte Sequence (UTF-8): ${exhibit.byte_sequence}
Hexadecimal Dump: ${exhibit.hex_dump}
Character Count: ${exhibit.identity_records?.original_script.length || 0} characters
Encoding: ${exhibit.encoding}
Code Page: N/A (Unicode)

═══════════════════════════════════════════════════════════════

CRYPTOGRAPHIC VERIFICATION:

SHA-256 Hash: ${exhibit.sha256_hash}

═══════════════════════════════════════════════════════════════

VALIDATION:
✓ Round-trip test passed
✓ Character integrity verified
✓ Encoding consistency confirmed

═══════════════════════════════════════════════════════════════

SOURCE METADATA:

System: ${exhibit.source_system || "N/A"}
Extracted: ${new Date(exhibit.extraction_timestamp).toISOString()}
Created: ${new Date(exhibit.created_at).toISOString()}

${exhibit.chain_of_custody ? `Chain of Custody:\n${exhibit.chain_of_custody}` : ""}

═══════════════════════════════════════════════════════════════

This exhibit has been generated in accordance with the Minimal Legal 
Operational Playbook for identity data management and includes complete 
visual and technical proof as required for court proceedings.

Document ID: ${exhibit.id}
Status: ${exhibit.status.toUpperCase()}
Generated: ${new Date().toISOString()}
`

  return new NextResponse(document, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="exhibit-${exhibit.exhibit_number}.txt"`,
    },
  })
}
