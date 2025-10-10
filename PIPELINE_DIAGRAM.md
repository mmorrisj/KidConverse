# SOL Processing Pipeline - Visual Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SOL PROCESSING PIPELINE                      │
└─────────────────────────────────────────────────────────────────────┘

INPUT FILES                    STAGES                       OUTPUT FILES
───────────                    ──────                       ────────────

┌──────────────┐
│  .docx File  │──┐
└──────────────┘  │
                  │
┌──────────────┐  │            ┌──────────────────┐
│  .xlsx File  │──┼───────────>│  STAGE 1:        │
└──────────────┘  │            │  DETECTION       │
                  │            │                  │
┌──────────────┐  │            │  - Has SOL?      │
│  More files  │──┘            │  - Subject?      │
└──────────────┘               │  - Grade?        │
                               │  - Extract text  │
                               └────────┬─────────┘
                                        │
                                        v
                               ┌──────────────────┐
                               │  Detection       │
                               │  Result          │
                               │                  │
                               │  ✓ Has SOL       │
                               │  ✓ mathematics   │       ┌──────────────────┐
                               │  ✓ Grade 3       │       │  file_standards  │
                               │  ✓ 12 standards  │       │  .json           │
                               └────────┬─────────┘       │                  │
                                        │                 │  {               │
                                        v                 │    "math": {     │
                               ┌──────────────────┐       │      "3": {      │
                               │  STAGE 2:        │       │        "3.1": {  │
                               │  TRANSFORMATION  │       │          ...     │
                               │                  │───────>│        }         │
                               │  - Parse stds    │       │      }           │
                               │  - Format JSON   │       │    }             │
                               │  - Add metadata  │       │  }               │
                               │  - Save file     │       └──────────────────┘
                               └──────────────────┘
                                        │
                                        v
                               ┌──────────────────┐
                               │  STAGING DIR     │
                               │  sol_staging/    │
                               │                  │
                               │  ✓ Validate      │
                               │  ✓ Merge         │
                               │  ✓ Review        │
                               └────────┬─────────┘
                                        │
                                        v
                               ┌──────────────────┐
                               │  DATABASE LOAD   │
                               │  (Future Step)   │
                               └──────────────────┘
```

## Stage 1: Detection - Detailed Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STAGE 1: DETECTION                          │
└─────────────────────────────────────────────────────────────────────┘

Document File
     │
     v
┌─────────────────────┐
│  Extract Text       │
│  (.docx or .xlsx)   │
└──────────┬──────────┘
           │
           v
┌─────────────────────────────────────────────┐
│  LLM PROMPT (GPT-4o-mini)                   │
│                                             │
│  Analyze this document and determine:       │
│  1. Does it contain Virginia SOL standards? │
│  2. What subject? (math, science, etc.)     │
│  3. What grade? (K, 1, 2, 3, ...)           │
│  4. How many standards?                     │
│  5. Extract only SOL content                │
└──────────────────────┬──────────────────────┘
                       │
                       v
┌────────────────────────────────────────────┐
│  LLM RESPONSE (JSON)                       │
│  {                                         │
│    "has_sol_content": true,                │
│    "confidence": "high",                   │
│    "detected_subject": "mathematics",      │
│    "detected_grade": "3",                  │
│    "detected_standards_count": 12,         │
│    "reasoning": "Document contains...",    │
│    "extracted_content": "3.1 The student...│
│  }                                         │
└──────────────────────┬─────────────────────┘
                       │
                       v
                 ┌─────────┐      No     ┌──────────┐
                 │Has SOL? │────────────>│  STOP    │
                 └────┬────┘             │  (Error) │
                      │ Yes              └──────────┘
                      v
              ┌──────────────┐
              │ Continue to  │
              │   Stage 2    │
              └──────────────┘
```

## Stage 2: Transformation - Detailed Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      STAGE 2: TRANSFORMATION                        │
└─────────────────────────────────────────────────────────────────────┘

Extracted SOL Content
     │
     v
┌───────────────────────────────────────────────────────┐
│  LLM PROMPT (GPT-4o-mini)                             │
│                                                       │
│  Transform this SOL content to exact JSON format:     │
│                                                       │
│  {                                                    │
│    "mathematics": {                                   │
│      "3": {                                           │
│        "3.1": {                                       │
│          "title": "...",                              │
│          "description": "The student will...",        │
│          "strands": ["Number and Number Sense"]       │
│        }                                              │
│      }                                                │
│    }                                                  │
│  }                                                    │
└──────────────────────────┬────────────────────────────┘
                           │
                           v
┌────────────────────────────────────────────────────────┐
│  LLM RESPONSE (Structured JSON)                        │
│  {                                                     │
│    "mathematics": {                                    │
│      "3": {                                            │
│        "3.1": {                                        │
│          "title": "Read and represent numbers",        │
│          "description": "The student will read...",    │
│          "strands": ["Number and Number Sense"]        │
│        },                                              │
│        "3.2": { ... },                                 │
│        ...                                             │
│      }                                                 │
│    }                                                   │
│  }                                                     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           v
                    ┌──────────────┐
                    │  Validate    │
                    │  JSON        │
                    └──────┬───────┘
                           │
                           v
                    ┌──────────────┐
                    │  Save to     │
                    │  Staging     │
                    └──────┬───────┘
                           │
                           v
                    ┌──────────────────────────────┐
                    │  sol_staging/                │
                    │  filename_standards.json     │
                    └──────────────────────────────┘
```

## Data Flow Examples

### Example Input (.docx)

```
╔══════════════════════════════════════════════════════════╗
║           3-2023-Approved-Math-SOL.docx                  ║
╚══════════════════════════════════════════════════════════╝

Grade 3 Mathematics Standards of Learning

Number and Number Sense

3.1 The student will read and write six-digit whole numbers
    and identify the place value and value of each digit.

3.2 The student will compare and order whole numbers
    through 9,999, using the symbols <, >, and =.

Computation and Estimation

3.3 The student will estimate sums and differences...

[... more standards ...]
```

### Stage 1 Output (Detection)

```json
{
  "has_sol_content": true,
  "confidence": "high",
  "detected_subject": "mathematics",
  "detected_grade": "3",
  "detected_standards_count": 12,
  "reasoning": "Document is official Virginia Grade 3 Mathematics SOL with standard codes 3.1, 3.2, etc.",
  "extracted_content": "3.1 The student will read and write six-digit whole numbers..."
}
```

### Stage 2 Output (Transformation)

```json
{
  "mathematics": {
    "3": {
      "3.1": {
        "title": "Read and represent whole numbers through 9,999",
        "description": "The student will read and write six-digit whole numbers and identify the place value and value of each digit.",
        "strands": ["Number and Number Sense"]
      },
      "3.2": {
        "title": "Compare and order whole numbers",
        "description": "The student will compare and order whole numbers through 9,999, using the symbols <, >, and =.",
        "strands": ["Number and Number Sense"]
      },
      "3.3": {
        "title": "Estimate sums and differences",
        "description": "The student will estimate sums and differences of whole numbers...",
        "strands": ["Computation and Estimation"]
      }
    }
  }
}
```

## Batch Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BATCH PROCESSING                            │
└─────────────────────────────────────────────────────────────────────┘

SOL/Documentation/
├── file1.docx ────┐
├── file2.xlsx ────┤
├── file3.docx ────┤      ┌──────────────────┐
├── file4.xlsx ────┼─────>│  Process each    │
└── file5.docx ────┘      │  file through    │
                          │  full pipeline   │
                          └────────┬─────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          v                        v                        v
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ file1_standards │     │ file2_standards │ ... │ file5_standards │
│ .json           │     │ .json           │     │ .json           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   v
                          ┌────────────────┐
                          │  List / Review │
                          │  Validate All  │
                          └────────┬───────┘
                                   │
                                   v
                          ┌────────────────┐
                          │  Merge (opt)   │
                          │  into single   │
                          │  standards.json│
                          └────────────────┘
```

## CLI Commands Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLI COMMANDS                                │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  process         │──> Process single file
│  <file>          │    - Detection + Transformation
└──────────────────┘    - Save to staging

┌──────────────────┐
│  batch           │──> Process directory
│  <directory>     │    - Multiple files
└──────────────────┘    - Progress tracking

┌──────────────────┐
│  list-staged     │──> Show all staged files
│  [staging_dir]   │    - File list with metadata
└──────────────────┘    - Standards count

┌──────────────────┐
│  validate        │──> Check JSON format
│  <json_file>     │    - Schema validation
└──────────────────┘    - Error reporting

┌──────────────────┐
│  merge           │──> Combine staged files
│  <dir> <output>  │    - Single JSON output
└──────────────────┘    - All standards merged
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING                              │
└─────────────────────────────────────────────────────────────────────┘

Process File
     │
     ├─> Extract Text Failed ──────────> Error: Unsupported format
     │
     ├─> Detection Failed ──────────────> Error: LLM API error
     │
     ├─> No SOL Content ────────────────> Warning: Not a SOL document
     │
     ├─> Transformation Failed ─────────> Error: Invalid JSON response
     │
     ├─> Validation Failed ─────────────> Error: Schema mismatch
     │
     └─> Success ───────────────────────> ProcessingResult(success=True)
```

## Integration with Existing System

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM INTEGRATION                               │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  New Pipeline    │
│  sol_pipeline.py │
└────────┬─────────┘
         │
         │  Outputs JSON files to staging
         │
         v
┌──────────────────┐
│  sol_staging/    │
│  *.json files    │
└────────┬─────────┘
         │
         │  Load to database
         │
         v
┌──────────────────┐     ┌──────────────────┐
│  Database Load   │────>│  PostgreSQL      │
│  Scripts         │     │  sol_standards   │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  │  Query standards
                                  │
                                  v
┌──────────────────┐     ┌──────────────────┐
│  Express API     │────>│  React Frontend  │
│  server/routes   │     │  SOL Assessment  │
└──────────────────┘     └──────────────────┘
```

---

**Legend:**
- `│ ─ ┌ ┐ └ ┘` = Flow lines
- `───>` = Data flow direction
- `┌──┐` = Process/Component
- `╔══╗` = Document/File
