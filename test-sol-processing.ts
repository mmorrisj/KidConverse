/**
 * Test script for SOL document processing
 * This demonstrates processing a SOL document without making database changes
 */

import { SOLProcessor } from './server/sol-processor';
import { writeFileSync } from 'fs';

async function testSOLProcessing() {
  console.log('🧪 Testing SOL Document Processing System\n');

  try {
    const processor = new SOLProcessor();

    // Test with one of the existing SOL documents
    const testFile = 'SOL/Documentation/3-2023-Approved-Math-SOL.docx';

    console.log(`📄 Processing test file: ${testFile}`);

    // Extract text from document
    const documentText = await processor.extractTextFromDocx(testFile);
    console.log(`📄 Extracted ${documentText.length} characters from document`);

    // Show first 500 characters as preview
    console.log('\n📋 Document Preview:');
    console.log(documentText.substring(0, 500) + '...\n');

    // Process with GPT-4o (this will make an API call)
    console.log('🧠 Processing with GPT-4o...');
    const solData = await processor.processSOLDocument(documentText, testFile);

    console.log(`✅ Extracted ${solData.standards.length} standards\n`);

    // Show metadata
    console.log('📊 Document Metadata:');
    console.log(`  Title: ${solData.metadata.documentTitle}`);
    console.log(`  Subject: ${solData.metadata.subject}`);
    console.log(`  Grade Level: ${solData.metadata.gradeLevel}`);
    console.log(`  Total Standards: ${solData.metadata.totalStandards}\n`);

    // Show first few standards as examples
    console.log('📚 Sample Standards:');
    solData.standards.slice(0, 3).forEach((standard, index) => {
      console.log(`\n  ${index + 1}. ${standard.standardCode} - ${standard.strand}`);
      console.log(`     ${standard.description.substring(0, 100)}...`);

      if (standard.subObjectives && standard.subObjectives.length > 0) {
        console.log(`     Sub-objectives: ${standard.subObjectives.length}`);
        standard.subObjectives.slice(0, 2).forEach(sub => {
          console.log(`       • ${sub.code}: ${sub.description.substring(0, 80)}...`);
        });
      }
    });

    // Save results to JSON file for inspection
    const outputFile = 'test-sol-output.json';
    writeFileSync(outputFile, JSON.stringify(solData, null, 2));
    console.log(`\n💾 Full results saved to: ${outputFile}`);

    // Show grade progression analysis
    console.log('\n📈 Grade Progression Analysis:');
    const gradeMap = new Map();
    solData.standards.forEach(std => {
      if (!gradeMap.has(std.grade)) {
        gradeMap.set(std.grade, { total: 0, strands: new Set() });
      }
      gradeMap.get(std.grade).total++;
      gradeMap.get(std.grade).strands.add(std.strand);
    });

    gradeMap.forEach((data, grade) => {
      console.log(`  Grade ${grade}: ${data.total} standards across ${data.strands.size} strands`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the generated JSON file');
    console.log('2. Run with --save-to-db flag to load into database');
    console.log('3. Process additional SOL documents');

  } catch (error) {
    console.error('❌ Test failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSOLProcessing();
}