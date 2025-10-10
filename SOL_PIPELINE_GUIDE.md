# SOL Processing Pipeline Guide

A two-stage pipeline for processing Virginia Standards of Learning (SOL) documents into standardized JSON format using OpenAI LLM.

## Overview

This pipeline processes SOL documents (.docx and .xlsx files) through two distinct stages:

1. **Stage 1: Detection** - Analyzes the document to determine if it contains SOL content and extracts relevant standards
2. **Stage 2: Transformation** - Converts extracted SOL content into the standardized `standards.json` format

## Features

✅ **Two-Stage Processing**
- Intelligent SOL content detection with confidence scoring
- Automatic subject and grade level identification
- Extraction of only SOL-relevant content

✅ **Multiple File Formats**
- Microsoft Word (.docx)
- Microsoft Excel (.xlsx)

✅ **Output Format**
- Matches exact structure of `standards.json`
- Hierarchical organization: Subject → Grade → Standard Code
- Includes title, description, and content strands

✅ **Batch Processing**
- Process entire directories of SOL documents
- Automatic file discovery with pattern matching
- Progress tracking and detailed reporting

✅ **Staging System**
- Output files saved to staging directory
- Named after source files for easy tracking
- Validation and merge capabilities

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- `openai>=1.0.0` - OpenAI API client
- `python-docx` - Word document processing
- `openpyxl>=3.1.0` - Excel file processing
- `click>=8.1.7` - CLI framework
- `rich>=13.6.0` - Terminal UI
- `dataclasses-json>=0.6.0` - Data serialization

### 2. Set Environment Variables

```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

Or create a `.env` file:
```
OPENAI_API_KEY=sk-...
```

## Quick Start

### Process a Single File

```bash
# Basic usage
python sol_pipeline_cli.py process SOL/Documentation/3-2023-Approved-Math-SOL.docx

# With forced parameters (skips detection)
python sol_pipeline_cli.py process myfile.xlsx --subject mathematics --grade 3

# Detection only (no transformation)
python sol_pipeline_cli.py process myfile.docx --detect-only
```

### Process a Directory (Batch)

```bash
# Process all .docx and .xlsx files in directory
python sol_pipeline_cli.py batch SOL/Documentation/

# Process specific patterns
python sol_pipeline_cli.py batch SOL/Documentation/ --pattern "*.docx" --pattern "*Math*"

# Custom output directory
python sol_pipeline_cli.py batch SOL/Documentation/ --output-dir ./my_staging
```

### List Staged Files

```bash
# List all processed files in staging directory
python sol_pipeline_cli.py list-staged

# List from custom directory
python sol_pipeline_cli.py list-staged ./my_staging
```

### Validate a Staged File

```bash
# Check that a staged file matches the expected format
python sol_pipeline_cli.py validate sol_staging/math_grade3_standards.json
```

### Merge Staged Files

```bash
# Combine all staged files into one standards.json file
python sol_pipeline_cli.py merge sol_staging merged_standards.json
```

## Output Format

The pipeline produces JSON files in this exact structure:

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
        "description": "The student will compare and order whole numbers through 9,999.",
        "strands": ["Number and Number Sense"]
      }
    }
  }
}
```

### Format Specification

- **Top Level**: Subject names (lowercase: `mathematics`, `science`, `english`, etc.)
- **Second Level**: Grade levels (strings: `K`, `1`, `2`, `3`, ... or course names like `Algebra 1`)
- **Third Level**: Standard codes (e.g., `3.1`, `K.2`, `ALG.1`)
- **Standard Object**:
  - `title`: Brief summary (5-15 words)
  - `description`: Full description, typically starting with "The student will..."
  - `strands`: Array of content strand names

### Common Content Strands

**Mathematics:**
- Number and Number Sense
- Computation and Estimation
- Measurement and Geometry
- Probability and Statistics
- Patterns, Functions, and Algebra

**Science:**
- Scientific Investigation, Reasoning, and Logic
- Force, Motion, and Energy
- Matter
- Life Processes
- Living Systems
- Interrelationships in Earth/Space Systems
- Earth Patterns, Cycles, and Change
- Earth Resources

**English:**
- Oral Language
- Reading
- Writing
- Research

## CLI Commands Reference

### `process` - Process Single File

Process a single SOL document through the full pipeline.

**Arguments:**
- `FILE_PATH` - Path to .docx or .xlsx file

**Options:**
- `--subject, -s` - Force subject (skips detection)
- `--grade, -g` - Force grade level (skips detection)
- `--output-dir, -o` - Output directory (default: `./sol_staging`)
- `--detect-only` - Run detection stage only, no transformation

**Examples:**
```bash
python sol_pipeline_cli.py process myfile.docx
python sol_pipeline_cli.py process data.xlsx -s mathematics -g 3
python sol_pipeline_cli.py process test.docx --detect-only
```

### `batch` - Process Directory

Process all matching files in a directory.

**Arguments:**
- `DIRECTORY_PATH` - Path to directory containing SOL documents

**Options:**
- `--pattern, -p` - File pattern(s) to match (can specify multiple)
- `--output-dir, -o` - Output directory (default: `./sol_staging`)
- `--skip-detection` - Skip detection stage (not recommended)

**Examples:**
```bash
python sol_pipeline_cli.py batch SOL/Documentation/
python sol_pipeline_cli.py batch docs/ -p "*.docx" -p "*Grade3*"
python sol_pipeline_cli.py batch files/ -o ./output
```

### `list-staged` - List Staged Files

Display all staged standards.json files with metadata.

**Arguments:**
- `STAGING_DIR` - Path to staging directory (default: `./sol_staging`)

**Examples:**
```bash
python sol_pipeline_cli.py list-staged
python sol_pipeline_cli.py list-staged ./my_staging
```

### `validate` - Validate Staged File

Check that a staged file matches the expected standards.json format.

**Arguments:**
- `STAGED_FILE` - Path to staged JSON file

**Examples:**
```bash
python sol_pipeline_cli.py validate sol_staging/math_standards.json
```

### `merge` - Merge Staged Files

Combine multiple staged files into a single standards.json file.

**Arguments:**
- `STAGING_DIR` - Path to staging directory (default: `./sol_staging`)
- `OUTPUT_FILE` - Path for merged output file

**Examples:**
```bash
python sol_pipeline_cli.py merge sol_staging merged_standards.json
python sol_pipeline_cli.py merge ./my_staging complete_standards.json
```

## Python API Usage

You can also use the pipeline programmatically:

```python
from sol_pipeline import SOLPipeline

# Initialize pipeline
pipeline = SOLPipeline(
    openai_api_key="your_key",
    staging_dir="./sol_staging"
)

# Process single file
result = pipeline.process_file("SOL/Documentation/math_grade3.docx")

if result.success:
    print(f"Extracted {result.standards_extracted} standards")
    print(f"Output: {result.output_file}")
else:
    print(f"Error: {result.error}")

# Process directory
results = pipeline.process_directory(
    "SOL/Documentation/",
    patterns=["*.docx", "*.xlsx"]
)

# Detection only
document_text = pipeline.extract_document_text("myfile.docx")
detection = pipeline.detect_sol_content(document_text, "myfile.docx")

if detection.has_sol_content:
    print(f"Subject: {detection.detected_subject}")
    print(f"Grade: {detection.detected_grade}")
    print(f"Standards: {detection.detected_standards_count}")
```

## Pipeline Architecture

### Stage 1: Detection

The detection stage analyzes the document to:

1. **Identify SOL Content** - Determines if the document contains Virginia SOL standards
2. **Extract Metadata** - Identifies subject area and grade level
3. **Assess Confidence** - Provides confidence level (high/medium/low)
4. **Isolate Relevant Content** - Extracts only SOL standards, excluding instructional materials

**Detection Criteria:**
- Presence of standard codes (e.g., "3.1", "K.2", "ALG.1")
- "The student will..." phrasing patterns
- Content strand organization
- Virginia SOL formatting patterns

**Output:**
```python
SOLDetectionResult(
    has_sol_content=True,
    confidence="high",
    detected_subject="mathematics",
    detected_grade="3",
    detected_standards_count=12,
    reasoning="Document contains Virginia Math SOL standards...",
    extracted_content="<SOL standards text>"
)
```

### Stage 2: Transformation

The transformation stage converts extracted SOL content to the standardized format:

1. **Parse Standards** - Identifies individual standard codes and content
2. **Structure Data** - Organizes by subject → grade → standard code
3. **Extract Components** - Generates title, description, and strands
4. **Format Output** - Produces standards.json compatible structure

**LLM Prompting Strategy:**
- Provides exact output format with examples
- Specifies content strand vocabulary
- Enforces strict JSON structure
- Low temperature (0.1) for consistency

## File Naming Convention

Output files are named after source files with `_standards.json` suffix:

- `3-2023-Approved-Math-SOL.docx` → `3-2023-Approved-Math-SOL_standards.json`
- `Grade3_Math_SOL.xlsx` → `Grade3_Math_SOL_standards.json`

## Directory Structure

```
KidConverse/
├── sol_pipeline.py              # Core pipeline implementation
├── sol_pipeline_cli.py          # CLI interface
├── sol_staging/                 # Default staging directory
│   ├── file1_standards.json
│   ├── file2_standards.json
│   └── ...
├── SOL/
│   ├── Documentation/           # Source SOL documents
│   │   ├── 3-2023-Approved-Math-SOL.docx
│   │   ├── Grade3_Math_SOL.xlsx
│   │   └── ...
│   ├── standards.json          # Target format example
│   └── sample-standards.json   # Target format example
└── requirements.txt
```

## Troubleshooting

### "OpenAI API key is required"

Set the `OPENAI_API_KEY` environment variable:
```bash
export OPENAI_API_KEY="sk-..."
```

### "No SOL content detected"

- Check that the document actually contains Virginia SOL standards
- Use `--detect-only` flag to see detection reasoning
- Try forcing parameters with `--subject` and `--grade` if detection is incorrect

### "Invalid JSON response from OpenAI"

- The LLM occasionally returns malformed JSON
- Retry the processing - the issue is usually transient
- Check OpenAI API status if persistent

### Rate Limiting

- The pipeline includes 1-second delays between batch operations
- For large batches, you may need to extend delays or process in smaller chunks

## Best Practices

1. **Review Detection Results** - Run with `--detect-only` first to verify detection accuracy
2. **Validate Output** - Always validate staged files before merging or loading to database
3. **Incremental Processing** - Process files incrementally and review before batch operations
4. **Backup Source Files** - Keep original SOL documents as authoritative source
5. **Version Control** - Track staged files in git to monitor changes

## Next Steps

After processing and staging files:

1. **Validate** all staged files to ensure correct format
2. **Merge** staged files if needed for consolidated standards
3. **Load to Database** using the database loading scripts
4. **Verify** data in database matches expectations

## Integration with Database

Once files are staged and validated, use the database loading scripts:

```bash
# Load staged file to database
python setup_python_sol.py --load-file sol_staging/math_grade3_standards.json

# Or load all staged files
python setup_python_sol.py --load-directory sol_staging
```

## API Rate Limits

The pipeline uses OpenAI's GPT-4o-mini model:
- **Stage 1 (Detection)**: ~3000 tokens per request
- **Stage 2 (Transformation)**: ~4000 tokens per request
- **Total**: ~7000 tokens per file

For batch processing, the built-in delays help stay within rate limits.

## Support

For issues or questions:
1. Check the validation output for specific errors
2. Review detection results with `--detect-only`
3. Verify input file format matches .docx or .xlsx
4. Check OpenAI API key and account status
