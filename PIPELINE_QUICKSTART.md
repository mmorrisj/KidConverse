# SOL Pipeline Quick Start

Transform SOL documents (.docx/.xlsx) into `standards.json` format using AI.

## Setup (One-time)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Set OpenAI API key
export OPENAI_API_KEY="sk-..."
```

## Usage

### Process a Single File

```bash
# Basic - auto-detect subject/grade
python sol_pipeline_cli.py process SOL/Documentation/3-2023-Approved-Math-SOL.docx

# With npm script
npm run pipeline:process SOL/Documentation/myfile.xlsx

# Force subject and grade (skips detection)
python sol_pipeline_cli.py process myfile.docx --subject mathematics --grade 3
```

### Process Entire Directory (Batch)

```bash
# Process all .docx and .xlsx files
python sol_pipeline_cli.py batch SOL/Documentation/

# With npm script
npm run pipeline:batch
```

### Check Results

```bash
# List all processed files
python sol_pipeline_cli.py list-staged

# With npm script
npm run pipeline:list

# Validate a specific file
python sol_pipeline_cli.py validate sol_staging/myfile_standards.json

# Merge all staged files into one
python sol_pipeline_cli.py merge sol_staging final_standards.json
```

## How It Works

### Two-Stage Pipeline

**Stage 1: Detection**
- LLM analyzes document to find SOL content
- Identifies subject (mathematics, science, english)
- Determines grade level (K, 1, 2, 3, etc.)
- Extracts only SOL-relevant content

**Stage 2: Transformation**
- LLM converts to exact `standards.json` format
- Outputs: `{ subject: { grade: { code: { title, description, strands } } } }`
- Saved to `sol_staging/` directory

### Output Format

```json
{
  "mathematics": {
    "3": {
      "3.1": {
        "title": "Read and represent whole numbers through 9,999",
        "description": "The student will read and write six-digit whole numbers...",
        "strands": ["Number and Number Sense"]
      }
    }
  }
}
```

## File Locations

- **Input**: `SOL/Documentation/*.docx` or `*.xlsx`
- **Output**: `sol_staging/*_standards.json`
- **Examples**: `SOL/standards.json`, `SOL/sample-standards.json`

## Common Commands

```bash
# Test the pipeline
npm run pipeline:test

# Process one file
python sol_pipeline_cli.py process <file>

# Process directory
python sol_pipeline_cli.py batch <directory>

# List output files
python sol_pipeline_cli.py list-staged

# Validate output
python sol_pipeline_cli.py validate <json_file>

# Merge outputs
python sol_pipeline_cli.py merge sol_staging output.json
```

## Troubleshooting

**"OpenAI API key required"**
```bash
export OPENAI_API_KEY="sk-..."
```

**"No SOL content detected"**
- Use `--detect-only` to see reasoning
- Force parameters: `--subject mathematics --grade 3`

**See full documentation**: `SOL_PIPELINE_GUIDE.md`
