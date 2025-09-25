#!/usr/bin/env tsx

/**
 * CLI tool for processing SOL documents
 * Usage: tsx scripts/process-sol.ts <file-or-directory> [options]
 */

import { Command } from 'commander';
import { SOLProcessor } from '../server/sol-processor';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const program = new Command();

program
  .name('process-sol')
  .description('Process Virginia SOL documents into structured database format')
  .version('1.0.0');

program
  .argument('<path>', 'Path to .docx file or directory containing .docx files')
  .option('-o, --output <path>', 'Output directory for JSON files')
  .option('-p, --pattern <pattern>', 'File pattern for directory processing', '*.docx')
  .option('--dry-run', 'Extract and validate data without saving to database')
  .option('--verbose', 'Show detailed processing information')
  .action(async (inputPath: string, options) => {
    try {
      const processor = new SOLProcessor();

      if (!existsSync(inputPath)) {
        console.error(`❌ Path does not exist: ${inputPath}`);
        process.exit(1);
      }

      const isDirectory = statSync(inputPath).isDirectory();

      if (isDirectory) {
        console.log(`📁 Processing directory: ${inputPath}`);
        await processor.processDirectory(inputPath, options.pattern);
      } else {
        console.log(`📄 Processing file: ${inputPath}`);

        const outputPath = options.output
          ? join(options.output, `${inputPath.replace(/\.[^/.]+$/, '')}.json`)
          : undefined;

        await processor.processFile(inputPath, outputPath);
      }

      console.log('✅ Processing completed successfully!');

    } catch (error) {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    }
  });

// Add command to process all SOL documentation
program
  .command('process-all')
  .description('Process all SOL documents in the SOL/Documentation directory')
  .option('-o, --output <path>', 'Output directory for JSON files', './processed-sol')
  .option('--math-only', 'Process only mathematics SOL documents')
  .option('--science-only', 'Process only science SOL documents')
  .option('--english-only', 'Process only English/literacy SOL documents')
  .action(async (options) => {
    try {
      const processor = new SOLProcessor();
      const solDir = './SOL/Documentation';

      if (!existsSync(solDir)) {
        console.error(`❌ SOL Documentation directory not found: ${solDir}`);
        process.exit(1);
      }

      let pattern = '*.docx';
      if (options.mathOnly) {
        pattern = '*Math*.docx';
      } else if (options.scienceOnly) {
        pattern = '*Science*.docx';
      } else if (options.englishOnly) {
        pattern = '*Literacy*.docx';
      }

      console.log(`🔄 Processing all SOL documents with pattern: ${pattern}`);
      await processor.processDirectory(solDir, pattern);

      console.log('✅ All SOL documents processed successfully!');

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      process.exit(1);
    }
  });

// Add command to validate existing database data
program
  .command('validate')
  .description('Validate SOL data in database')
  .action(async () => {
    try {
      const { db } = await import('../server/db');
      const { solStandards } = await import('../shared/schema');

      const allStandards = await db.select().from(solStandards);

      console.log(`📊 Found ${allStandards.length} standards in database`);

      // Group by subject and grade
      const bySubject = allStandards.reduce((acc, std) => {
        if (!acc[std.subject]) acc[std.subject] = {};
        if (!acc[std.subject][std.grade]) acc[std.subject][std.grade] = 0;
        acc[std.subject][std.grade]++;
        return acc;
      }, {} as Record<string, Record<string, number>>);

      console.log('\n📈 Standards by Subject and Grade:');
      Object.entries(bySubject).forEach(([subject, grades]) => {
        console.log(`\n${subject.toUpperCase()}:`);
        Object.entries(grades).forEach(([grade, count]) => {
          console.log(`  Grade ${grade}: ${count} standards`);
        });
      });

    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

program.parse();