
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import { solStandards } from "@shared/schema";

async function migratePythonSolData() {
  try {
    console.log("Loading SOL standards from Python files...");
    
    const standardsToInsert = [];
    
    // Process Algebra 1 standards
    try {
      const algebraData = await processPythonFile("SOL/ALG_MATH_SOL.py", "mathematics", "Algebra1");
      standardsToInsert.push(...algebraData);
      console.log(`Loaded ${algebraData.length} Algebra 1 standards`);
    } catch (error) {
      console.log(`Error processing Algebra 1: ${error}`);
    }
    
    // Process Grade 2 standards
    try {
      const grade2Data = await processPythonFile("SOL/2_MATH_SOL.py", "mathematics", "2");
      standardsToInsert.push(...grade2Data);
      console.log(`Loaded ${grade2Data.length} Grade 2 standards`);
    } catch (error) {
      console.log(`Error processing Grade 2: ${error}`);
    }
    
    // Process Grade 3 standards
    try {
      const grade3Data = await processPythonFile("SOL/3_MATH_SOL.py", "mathematics", "3");
      standardsToInsert.push(...grade3Data);
      console.log(`Loaded ${grade3Data.length} Grade 3 standards`);
    } catch (error) {
      console.log(`Error processing Grade 3: ${error}`);
    }
    
    // Process other grade files
    for (let grade = 1; grade <= 7; grade++) {
      if (grade === 2 || grade === 3) continue; // Already processed
      try {
        const gradeData = await processPythonFile(`SOL/${grade}_MATH_SOL.py`, "mathematics", grade.toString());
        standardsToInsert.push(...gradeData);
        console.log(`Loaded ${gradeData.length} Grade ${grade} standards`);
      } catch (error) {
        console.log(`Grade ${grade} file not found or error processing: ${error}`);
      }
    }
    
    // Process other algebra files
    const otherFiles = [
      { file: "ALG2_MATH_SOL.py", grade: "Algebra2" },
      { file: "AFDA_MATH_SOL.py", grade: "AFDA" },
      { file: "TRIG_MATH_SOL.py", grade: "Trigonometry" }
    ];
    
    for (const { file, grade } of otherFiles) {
      try {
        const data = await processPythonFile(`SOL/${file}`, "mathematics", grade);
        standardsToInsert.push(...data);
        console.log(`Loaded ${data.length} ${grade} standards`);
      } catch (error) {
        console.log(`File ${file} not found or error processing: ${error}`);
      }
    }
    
    console.log(`Preparing to insert ${standardsToInsert.length} standards...`);
    
    if (standardsToInsert.length === 0) {
      console.log("No standards found to insert. Check file parsing logic.");
      return;
    }
    
    // Insert standards in batches
    const batchSize = 50;
    for (let i = 0; i < standardsToInsert.length; i += batchSize) {
      const batch = standardsToInsert.slice(i, i + batchSize);
      await db.insert(solStandards).values(batch).onConflictDoNothing();
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(standardsToInsert.length / batchSize)}`);
    }
    
    console.log("✅ Python SOL standards migration completed successfully!");
    
    // Verify the data
    const count = await db.select().from(solStandards);
    console.log(`📊 Total standards in database: ${count.length}`);
    
  } catch (error) {
    console.error("❌ Error during Python SOL data migration:", error);
    throw error;
  }
}

async function processPythonFile(filePath: string, subject: string, grade: string) {
  const fullPath = join(process.cwd(), filePath);
  const fileContent = readFileSync(fullPath, "utf-8");
  
  const standards = [];
  
  if (filePath.includes("ALG_MATH_SOL.py")) {
    // Process Algebra 1 format: ("A.EO.1", "description", ["sub1", "sub2"])
    const algebraMatch = fileContent.match(/algebra1_data\s*=\s*\[([\s\S]*?)\n\]/);
    if (algebraMatch) {
      const dataStr = algebraMatch[1];
      // More robust regex to match tuples
      const tupleRegex = /\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g;
      let match;
      
      while ((match = tupleRegex.exec(dataStr)) !== null) {
        const [, code, description, subStandardsStr] = match;
        
        // Add main standard
        standards.push({
          id: `${subject}-${grade}-${code}`,
          subject: subject,
          grade: grade,
          strand: extractStrand(code),
          description: description
        });
        
        // Extract sub-standards
        const subStandardRegex = /"([^"]+)"/g;
        let subMatch;
        while ((subMatch = subStandardRegex.exec(subStandardsStr)) !== null) {
          const subDescription = subMatch[1];
          const subCode = extractSubStandardCode(subDescription);
          
          standards.push({
            id: `${subject}-${grade}-${subCode}`,
            subject: subject,
            grade: grade,
            strand: extractStrand(code),
            description: subDescription
          });
        }
      }
    }
  } else if (filePath.includes("2_MATH_SOL.py")) {
    // Process Grade 2 format: ("strand", "code", "description", [("subcode", "subdesc")])
    const grade2Match = fileContent.match(/grade2_standards\s*=\s*\[([\s\S]*?)\n\]/);
    if (grade2Match) {
      const dataStr = grade2Match[1];
      // Match the 4-tuple format
      const tupleRegex = /\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g;
      let match;
      
      while ((match = tupleRegex.exec(dataStr)) !== null) {
        const [, strand, code, description, subStandardsStr] = match;
        
        // Add main standard
        standards.push({
          id: `${subject}-${grade}-${code}`,
          subject: subject,
          grade: grade,
          strand: strand,
          description: description
        });
        
        // Extract sub-standards
        const subStandardRegex = /\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;
        let subMatch;
        while ((subMatch = subStandardRegex.exec(subStandardsStr)) !== null) {
          const [, subCode, subDescription] = subMatch;
          
          standards.push({
            id: `${subject}-${grade}-${subCode}`,
            subject: subject,
            grade: grade,
            strand: strand,
            description: subDescription
          });
        }
      }
    }
  } else if (filePath.includes("3_MATH_SOL.py")) {
    // Process Grade 3 format (similar to Grade 2)
    const grade3Match = fileContent.match(/standards_data\s*=\s*\[([\s\S]*?)\n\]/);
    if (grade3Match) {
      const dataStr = grade3Match[1];
      const tupleRegex = /\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g;
      let match;
      
      while ((match = tupleRegex.exec(dataStr)) !== null) {
        const [, strand, code, description, subStandardsStr] = match;
        
        // Add main standard
        standards.push({
          id: `${subject}-${grade}-${code}`,
          subject: subject,
          grade: grade,
          strand: strand,
          description: description
        });
        
        // Extract sub-standards
        const subStandardRegex = /\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;
        let subMatch;
        while ((subMatch = subStandardRegex.exec(subStandardsStr)) !== null) {
          const [, subCode, subDescription] = subMatch;
          
          standards.push({
            id: `${subject}-${grade}-${subCode}`,
            subject: subject,
            grade: grade,
            strand: strand,
            description: subDescription
          });
        }
      }
    }
  }
  
  return standards;
}

function extractStrand(code: string): string {
  if (code.startsWith("A.EO")) return "Expressions and Operations";
  if (code.startsWith("A.EI")) return "Equations and Inequalities";
  if (code.startsWith("A.F")) return "Functions";
  if (code.startsWith("A.ST")) return "Statistics";
  return "General";
}

function extractSubStandardCode(description: string): string {
  const match = description.match(/^([A-Z]+\.[A-Z]+\.\d+\.[a-z])/);
  if (match) return match[1];
  
  // Generate a code based on the description
  const words = description.split(' ').slice(0, 2);
  return words.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePythonSolData()
    .then(() => {
      console.log("Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migratePythonSolData };
