---
skill_name: Legal Identity Management System
version: "1.0.0"
description: |
  An enterprise-grade legal identity management system for handling multilingual
  identity records with cryptographic verification, Unicode compliance, and
  court-ready exhibit generation capabilities.
author: ActionsGPT
category: Legal Technology
tags:
  - legal-tech
  - identity-management
  - unicode-processing
  - court-exhibits
  - data-integrity
  - multilingual
  - compliance
  - audit-trail
capabilities:
  - name: Multilingual Identity Management
    description: Dual-field storage for original script and canonical ASCII representations
  - name: Unicode Compliance
    description: ICU 73.1+ and Unicode 15.0+ standards with zero-tolerance lossy storage
  - name: Cryptographic Verification
    description: SHA-256 hashing and byte-level verification for data integrity
  - name: Court Exhibit Generation
    description: Generate court-admissible exhibits with chain of custody tracking
  - name: Fuzzy Search
    description: Advanced search with configurable thresholds and similarity matching
  - name: Round-Trip Testing
    description: Automated validation through storage, export, and presentation cycles
  - name: Alias Register
    description: Manage identity variants including MRZ, transliteration, and phonetic forms
  - name: Regulatory Document Management
    description: Upload, version, and track access to legal documents
technologies:
  frontend:
    - Next.js 15
    - React 19
    - TypeScript 5
    - TailwindCSS 4
    - Radix UI
  backend:
    - Supabase (PostgreSQL)
    - Next.js Server Components
  utilities:
    - Native Crypto APIs
    - Unicode.js
    - Zod validation
supported_scripts:
  - Arabic
  - Cyrillic
  - Greek
  - Hebrew
  - Chinese (Han)
  - Japanese (Hiragana/Katakana)
  - Thai
  - Latin
  - Mixed scripts
---

# Legal Identity Management System

## Overview

This skill provides comprehensive capabilities for managing multilingual identity records with absolute data integrity guarantees. The system is designed for legal professionals who require court-admissible evidence generation and complete audit trails.

## Core Capabilities

### 1. Identity Record Management

Create and manage identity records with dual-field storage:
- **Original Script**: Preserves the exact Unicode representation
- **Canonical ASCII**: Standardized transliteration for cross-system compatibility
- **Automatic Script Detection**: Identifies 9+ script types automatically
- **Hash Verification**: SHA-256 cryptographic hashes for integrity validation

### 2. Data Integrity Verification

Ensure zero data loss through comprehensive testing:
- **Round-Trip Testing**: Validate data through storage, export, and presentation cycles
- **Character Loss Tracking**: Monitor diacritic and character preservation rates
- **Byte-Level Comparison**: Verify exact byte sequences at every stage
- **NFC Normalization**: Canonical composition for consistent representation

### 3. Court Exhibit Generation

Generate court-ready evidence packages:
- **Visual Proof Capture**: Screenshots with metadata
- **Cryptographic Evidence**: SHA-256 hashes and hexadecimal byte dumps
- **Font Documentation**: Complete rendering environment details
- **Chain of Custody**: Full audit trail with approval workflows
- **Status Workflow**: Draft → Pending Review → Approved → Filed

### 4. Advanced Search Capabilities

Find identity records with configurable matching:
- **Search Modes**: Strict, standard, and fuzzy matching
- **Sensitivity Options**: Accent, case, and diacritic awareness
- **Similarity Scoring**: Levenshtein distance-based matching
- **Performance Metrics**: Precision/recall tracking

### 5. Alias Register (Variant Management)

Track all known variants of an identity:
- **Variant Types**: MRZ, native alternate, ASCII alternate, transliteration, phonetic
- **Confidence Scoring**: Reliability rating for each variant
- **Source Tracking**: Document source and timestamp attribution
- **Automatic Deduplication**: Prevents duplicate entries

### 6. Regulatory Document Management

Manage legal documents with full versioning:
- **Document Types**: Acts, regulations, statutes, case law, policies, guidelines, templates, forms
- **Secure Storage**: Supabase bucket storage with access control
- **Version Control**: Track document revisions over time
- **Access Logging**: Complete audit trail of document access

## Security & Compliance Features

- **Authentication**: Supabase Auth integration with session management
- **Authorization**: Row-level security (RLS) policies
- **Data Integrity**: Cryptographic verification at every stage
- **Audit Trail**: Complete operation logging with user attribution
- **Privacy**: Multi-user support with strict data isolation
- **Court Admissibility**: Technical proof generation meeting legal standards

## API Endpoints

The system exposes functionality through Next.js server actions and Supabase client operations:

| Operation | Description |
|-----------|-------------|
| `createIdentity` | Create new identity record with dual-field storage |
| `updateIdentity` | Modify existing identity with full audit trail |
| `searchIdentities` | Fuzzy search with configurable thresholds |
| `runRoundTripTest` | Execute integrity validation tests |
| `createExhibit` | Generate court-ready exhibit package |
| `uploadDocument` | Store regulatory document with versioning |
| `getSearchMetrics` | Retrieve search performance analytics |

## Usage Examples

### Creating an Identity Record

```typescript
const identity = await createIdentity({
  original_script: "محمد علي",
  canonical_ascii: "Muhammad Ali",
  script_code: "Arab",
  language_code: "ar",
  normalization_form: "NFC"
});
```

### Running Integrity Tests

```typescript
const results = await runRoundTripTest({
  identity_ids: [identity.id],
  test_types: ["storage", "export", "presentation"]
});
```

### Generating Court Exhibit

```typescript
const exhibit = await createExhibit({
  identity_record_id: identity.id,
  case_reference: "Case-2024-12345",
  exhibit_type: "identity_verification"
});
```

## Database Schema

### Primary Tables

| Table | Purpose |
|-------|---------|
| `identity_records` | Core identity storage with dual fields |
| `identity_variants` | Alias register for all known variants |
| `roundtrip_tests` | Integrity test results and metrics |
| `search_operations` | Search query audit trail |
| `court_exhibits` | Exhibit storage with chain of custody |
| `search_metrics` | Performance analytics aggregation |
| `regulatory_documents` | Document management with versioning |

## Integration Points

This skill integrates with:
- **Supabase**: Database, authentication, storage, and real-time subscriptions
- **Next.js**: Server components, API routes, and middleware
- **Browser Crypto API**: Client-side cryptographic operations
- **Unicode Libraries**: Script detection and normalization

## Requirements

- Node.js 18+
- Supabase account with configured project
- Modern browser with Crypto API support
- PostgreSQL 14+ (via Supabase)

## License

Proprietary - All rights reserved
