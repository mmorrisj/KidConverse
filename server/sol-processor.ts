/**
 * SOL Document Processor
 * Processes .docx/.doc files containing SOL standards and converts them to structured data
 */
import mammoth from 'mammoth';
import { readFileSync, writeFileSync } from 'fs';
import { OpenAI } from 'openai';
import { z } from 'zod';
import { db } from './db';
import { solStandards } from '@shared/schema';

// Enhanced SOL Standard Schema for structured output
export const SOLStandardSchema = z.object({
  standardCode: z.string().describe("The SOL code (e.g., '3.NS.1', 'ALG.A.1')"),
  subject: z.string().describe("Subject area (mathematics, science, english, etc.)"),
  grade: z.string().describe("Grade level (K, 1, 2, 3, ..., 12, or course name like 'Algebra I')"),
  strand: z.string().describe("Content strand/domain (e.g., 'Number and Number Sense', 'Geometry')"),
  title: z.string().optional().describe("Short title/summary of the standard"),
  description: z.string().describe("Full description of what students will learn"),
  subObjectives: z.array(z.object({
    code: z.string().describe("Sub-objective code (e.g., '3.NS.1.a')"),
    description: z.string().describe("Description of the sub-objective")
  })).optional().describe("Sub-objectives or learning indicators"),
  prerequisites: z.array(z.string()).optional().describe("Related standards from previous grades"),
  connections: z.array(z.string()).optional().describe("Related standards from same or other grades"),
  keyTerms: z.array(z.string()).optional().describe("Important vocabulary or concepts"),
  difficulty: z.enum(['foundational', 'grade-level', 'advanced']).optional().default('grade-level'),
  cognitiveComplexity: z.enum(['recall', 'skill', 'strategic', 'extended']).optional().describe("Depth of Knowledge level")
});

export const SOLDocumentSchema = z.object({
  metadata: z.object({
    documentTitle: z.string(),
    subject: z.string(),
    gradeLevel: z.string(),
    yearApproved: z.string().optional(),
    totalStandards: z.number()
  }),
  standards: z.array(SOLStandardSchema)
});

export type SOLStandard = z.infer<typeof SOLStandardSchema>;
export type SOLDocument = z.infer<typeof SOLDocumentSchema>;

export class SOLProcessor {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Extract text content from .docx file
   */
  async extractTextFromDocx(filePath: string): Promise<string> {
    try {
      const buffer = readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });

      if (result.messages.length > 0) {
        console.warn('Mammoth warnings:', result.messages);
      }

      return result.value;
    } catch (error) {
      throw new Error(`Failed to extract text from ${filePath}: ${error}`);
    }
  }

  /**
   * Process SOL document text with GPT-4o to extract structured data
   */
  async processSOLDocument(documentText: string, fileName: string): Promise<SOLDocument> {
    const prompt = this.createSOLExtractionPrompt(documentText, fileName);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in Virginia Standards of Learning (SOL) who extracts structured data from educational documents. You must return valid JSON that matches the provided schema exactly."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(response);
      return SOLDocumentSchema.parse(parsed);

    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Schema validation error:', error.errors);
        throw new Error(`Invalid SOL data structure: ${error.message}`);
      }
      throw new Error(`Failed to process SOL document: ${error}`);
    }
  }

  /**
   * Create the GPT-4o prompt for SOL extraction
   */
  private createSOLExtractionPrompt(documentText: string, fileName: string): string {
    return `
Extract Virginia Standards of Learning (SOL) data from this document and return it as structured JSON.

Document: ${fileName}
Content:
${documentText}

Please extract ALL standards from this document and format them according to this JSON schema:

{
  "metadata": {
    "documentTitle": "string - title of the document",
    "subject": "string - subject (mathematics, science, english, etc.)",
    "gradeLevel": "string - grade level (K, 1, 2, 3, etc. or course name)",
    "yearApproved": "string - year if mentioned",
    "totalStandards": "number - count of main standards"
  },
  "standards": [
    {
      "standardCode": "string - SOL code (e.g., '3.NS.1', 'ALG.A.1')",
      "subject": "string - subject area",
      "grade": "string - grade level",
      "strand": "string - content strand/domain",
      "title": "string - short title (optional)",
      "description": "string - full description",
      "subObjectives": [
        {
          "code": "string - sub-objective code (e.g., '3.NS.1.a')",
          "description": "string - sub-objective description"
        }
      ],
      "prerequisites": ["array of related lower-grade standard codes"],
      "connections": ["array of related same/higher-grade standard codes"],
      "keyTerms": ["array of important vocabulary"],
      "difficulty": "foundational|grade-level|advanced",
      "cognitiveComplexity": "recall|skill|strategic|extended"
    }
  ]
}

IMPORTANT EXTRACTION RULES:
1. Extract EVERY standard mentioned in the document
2. Identify the correct standard code format (e.g., grade.strand.number)
3. Group sub-objectives under their main standard
4. Infer subject and grade from document context
5. Map content to appropriate strands (Number Sense, Geometry, etc.)
6. Extract key vocabulary and terms mentioned
7. Identify cognitive complexity based on verbs used (remember=recall, apply=skill, analyze=strategic, create=extended)
8. Return valid JSON only - no additional text or markdown

Focus on accuracy and completeness. If unsure about a field, use reasonable defaults based on context.
`;
  }

  /**
   * Save processed SOL data to database
   */
  async saveToDatabase(solData: SOLDocument): Promise<void> {
    const standardsToInsert = solData.standards.map(standard => ({
      id: `${standard.subject}-${standard.grade}-${standard.standardCode}`,
      subject: standard.subject.toLowerCase(),
      grade: standard.grade,
      strand: standard.strand,
      description: standard.description,
      // Store additional data as JSON metadata
      metadata: {
        standardCode: standard.standardCode,
        title: standard.title,
        subObjectives: standard.subObjectives,
        prerequisites: standard.prerequisites,
        connections: standard.connections,
        keyTerms: standard.keyTerms,
        difficulty: standard.difficulty,
        cognitiveComplexity: standard.cognitiveComplexity,
        processedFrom: solData.metadata.documentTitle,
        processedAt: new Date().toISOString()
      }
    }));

    try {
      // Insert all standards in batch
      await db.insert(solStandards).values(standardsToInsert).onConflictDoUpdate({
        target: solStandards.id,
        set: {
          description: solStandards.description,
          strand: solStandards.strand,
          // Update metadata while preserving existing data
          metadata: solStandards.metadata
        }
      });

      console.log(`✅ Successfully inserted ${standardsToInsert.length} standards from ${solData.metadata.documentTitle}`);

    } catch (error) {
      throw new Error(`Failed to save to database: ${error}`);
    }
  }

  /**
   * Process a SOL document file end-to-end
   */
  async processFile(filePath: string, outputPath?: string): Promise<SOLDocument> {
    console.log(`🔄 Processing SOL document: ${filePath}`);

    // Extract text from document
    const documentText = await this.extractTextFromDocx(filePath);
    console.log(`📄 Extracted ${documentText.length} characters from document`);

    // Process with GPT-4o
    const solData = await this.processSOLDocument(documentText, filePath);
    console.log(`🧠 Extracted ${solData.standards.length} standards`);

    // Optionally save structured output to file
    if (outputPath) {
      writeFileSync(outputPath, JSON.stringify(solData, null, 2));
      console.log(`💾 Saved structured data to ${outputPath}`);
    }

    // Save to database
    await this.saveToDatabase(solData);

    return solData;
  }

  /**
   * Batch process multiple SOL documents
   */
  async processDirectory(directoryPath: string, pattern: string = '*.docx'): Promise<SOLDocument[]> {
    const { glob } = await import('glob');
    const files = await glob(`${directoryPath}/${pattern}`);

    console.log(`📁 Found ${files.length} documents to process`);

    const results: SOLDocument[] = [];
    for (const file of files) {
      try {
        const result = await this.processFile(file);
        results.push(result);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error);
      }
    }

    return results;
  }
}

// CLI usage example
if (require.main === module) {
  const processor = new SOLProcessor();

  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: tsx sol-processor.ts <path-to-docx-file> [output-json-path]');
    process.exit(1);
  }

  const outputPath = process.argv[3];

  processor.processFile(filePath, outputPath)
    .then(() => {
      console.log('✅ SOL document processing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}