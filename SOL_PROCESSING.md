# SOL Document Processing System

This system allows you to input .docx or .doc files containing Virginia Standards of Learning (SOL) layouts, process them with GPT-4o, and load structured SOL data into the database.

## Features

- ✅ **Document Parsing**: Extract text from .docx files using Mammoth
- ✅ **AI Processing**: Use GPT-4o to structure SOL data with intelligent extraction
- ✅ **Schema Validation**: Ensure data quality with Zod schemas
- ✅ **Database Integration**: Automatically save to PostgreSQL with enhanced metadata
- ✅ **CLI Tools**: Easy-to-use command-line interface
- ✅ **Batch Processing**: Process entire directories of SOL documents

## Quick Start

### 1. Process a Single Document

```bash
# Process a single SOL document
tsx scripts/process-sol.ts SOL/Documentation/3-2023-Approved-Math-SOL.docx

# Process with JSON output
tsx scripts/process-sol.ts SOL/Documentation/3-2023-Approved-Math-SOL.docx -o ./output/
```

### 2. Process All SOL Documents

```bash
# Process all .docx files in SOL/Documentation directory
tsx scripts/process-sol.ts process-all

# Process only math SOL documents
tsx scripts/process-sol.ts process-all --math-only

# Process only science SOL documents
tsx scripts/process-sol.ts process-all --science-only
```

### 3. Validate Database

```bash
# Check what SOL data is currently in the database
tsx scripts/process-sol.ts validate
```

## Data Structure

The system extracts comprehensive SOL data including:

### Main Standard Information
- **Standard Code**: e.g., "3.NS.1", "ALG.A.1"
- **Subject**: mathematics, science, english
- **Grade**: K, 1, 2, 3, ..., 12, or course names
- **Strand**: Content domain (Number Sense, Geometry, etc.)
- **Description**: Full learning objective description

### Enhanced Metadata
- **Sub-objectives**: Detailed learning indicators (e.g., 3.NS.1.a, 3.NS.1.b)
- **Prerequisites**: Related standards from previous grades
- **Connections**: Related standards from same/other grades
- **Key Terms**: Important vocabulary
- **Difficulty**: foundational, grade-level, advanced
- **Cognitive Complexity**: recall, skill, strategic, extended

### Example Extracted Data

```json
{
  "metadata": {
    "documentTitle": "Grade 3 Mathematics SOL",
    "subject": "mathematics",
    "gradeLevel": "3",
    "totalStandards": 12
  },
  "standards": [
    {
      "standardCode": "3.NS.1",
      "subject": "mathematics",
      "grade": "3",
      "strand": "Number and Number Sense",
      "title": "Place Value Understanding",
      "description": "The student will use place value understanding to read, write, and determine the place and value of each digit in a whole number, up to six digits, with and without models.",
      "subObjectives": [
        {
          "code": "3.NS.1.a",
          "description": "Read and write six-digit whole numbers in standard form, expanded form, and word form."
        },
        {
          "code": "3.NS.1.b",
          "description": "Apply patterns within the base 10 system to determine and communicate the place and value of each digit in a six-digit whole number."
        }
      ],
      "prerequisites": ["2.NS.1", "2.NS.2"],
      "keyTerms": ["place value", "standard form", "expanded form", "digit"],
      "difficulty": "grade-level",
      "cognitiveComplexity": "skill"
    }
  ]
}
```

## Database Schema

Enhanced SOL standards table:

```sql
CREATE TABLE sol_standards (
  id TEXT PRIMARY KEY,                    -- e.g., "mathematics-3-3.NS.1"
  standard_code TEXT NOT NULL,           -- e.g., "3.NS.1"
  subject TEXT NOT NULL,                 -- mathematics, science, english
  grade TEXT NOT NULL,                   -- K, 1, 2, 3, ..., 12
  strand TEXT NOT NULL,                  -- Number Sense, Geometry, etc.
  title TEXT,                           -- Short summary
  description TEXT NOT NULL,             -- Full description
  metadata JSONB,                       -- Enhanced data (sub-objectives, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Multi-Grade Assessment Strategy

The processed data supports adaptive testing across grades:

### Sampling Strategy
- **70%** questions from student's target grade
- **20%** questions from 1-2 grades below (prerequisites)
- **10%** questions from 1-2 grades above (advanced readiness)

### Strand Balancing
Ensure questions span major content strands:
- Number and Number Sense
- Computation and Estimation
- Measurement and Geometry
- Probability and Statistics
- Patterns, Functions, and Algebra

### Difficulty Progression
- Start with **foundational** questions
- Progress to **grade-level** standards
- Challenge with **advanced** concepts based on performance

## API Integration

The system integrates with your existing ORM models:

```typescript
import { createORMSession } from './server/orm-models';

// Query SOL standards for adaptive testing
const orm = createORMSession(storage);

// Get standards for specific grade and subject
const standards = await orm.SolStandard.findBySubjectAndGrade('mathematics', '3');

// Get related standards across grades
const relatedStandards = await orm.SolStandard.findRelated('3.NS.1');
```

## Error Handling

The system includes comprehensive error handling:

- **Document parsing errors**: Invalid .docx format
- **AI processing errors**: GPT-4o API failures
- **Schema validation errors**: Invalid data structure
- **Database errors**: Connection or constraint issues

## Performance Considerations

- **Rate limiting**: Built-in delays between API calls
- **Batch processing**: Efficient database insertions
- **Memory management**: Stream processing for large documents
- **Caching**: Results cached to avoid reprocessing

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY not found"**
   - Ensure your `.env` file has `OPENAI_API_KEY=your_key_here`

2. **"Document extraction failed"**
   - Check that the file is a valid .docx format
   - Ensure the file isn't corrupted or password protected

3. **"Schema validation error"**
   - The AI extracted data doesn't match expected format
   - Check the document structure and try again

4. **"Database connection error"**
   - Ensure PostgreSQL is running and `DATABASE_URL` is correct
   - Run database migrations: `npm run db:push`

### Debug Mode

Add verbose logging:

```bash
tsx scripts/process-sol.ts SOL/Documentation/3-2023-Approved-Math-SOL.docx --verbose
```

## Next Steps

1. **Process your SOL documents**: Use the CLI to load all your SOL data
2. **Implement question generation**: Create assessment items from standards
3. **Build adaptive testing**: Use grade relationships for smart question selection
4. **Add performance tracking**: Monitor student progress across standards

This system provides the foundation for sophisticated, adaptive SOL assessments that can gauge student understanding across multiple grade levels.