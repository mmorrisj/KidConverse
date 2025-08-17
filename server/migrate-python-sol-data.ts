
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import { solStandards } from "@shared/schema";

interface StandardData {
  code: string;
  description: string;
  subStandards?: string[];
}

async function migratePythonSolData() {
  try {
    console.log("Loading SOL standards from Python files...");
    
    const standardsToInsert = [];
    
    // Process Algebra 1 standards
    const algebraData = await processPythonFile("SOL/ALG_MATH_SOL.py", "mathematics", "Algebra1");
    standardsToInsert.push(...algebraData);
    
    // Process Grade 2 standards
    const grade2Data = await processPythonFile("SOL/2_MATH_SOL.py", "mathematics", "2");
    standardsToInsert.push(...grade2Data);
    
    // Process other grade files
    for (let grade = 1; grade <= 7; grade++) {
      try {
        const gradeData = await processPythonFile(`SOL/${grade}_MATH_SOL.py`, "mathematics", grade.toString());
        standardsToInsert.push(...gradeData);
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
      } catch (error) {
        console.log(`File ${file} not found or error processing: ${error}`);
      }
    }
    
    console.log(`Preparing to insert ${standardsToInsert.length} standards...`);
    
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
    // Process Algebra 1 format
    const algebraMatch = fileContent.match(/algebra1_data\s*=\s*\[([\s\S]*?)\]/);
    if (algebraMatch) {
      const dataStr = algebraMatch[1];
      const tupleMatches = dataStr.match(/\("([^"]+)",\s*"([^"]+)",\s*\[([\s\S]*?)\]\)/g);
      
      if (tupleMatches) {
        for (const match of tupleMatches) {
          const parts = match.match(/\("([^"]+)",\s*"([^"]+)",\s*\[([\s\S]*?)\]\)/);
          if (parts) {
            const [, code, description, subStandardsStr] = parts;
            
            standards.push({
              id: `${subject}-${grade}-${code}`,
              standardCode: code,
              subject: subject,
              grade: grade,
              strand: extractStrand(code),
              title: code,
              description: description,
              metadata: {
                imported: true,
                importDate: new Date().toISOString(),
                source: "virginia-sol-python",
                hasSubStandards: true
              }
            });
            
            // Extract sub-standards
            const subMatches = subStandardsStr.match(/"([^"]+)"/g);
            if (subMatches) {
              for (const subMatch of subMatches) {
                const subDescription = subMatch.replace(/"/g, '');
                const subCode = extractSubStandardCode(subDescription);
                
                standards.push({
                  id: `${subject}-${grade}-${subCode}`,
                  standardCode: subCode,
                  subject: subject,
                  grade: grade,
                  strand: extractStrand(code),
                  title: subCode,
                  description: subDescription,
                  metadata: {
                    imported: true,
                    importDate: new Date().toISOString(),
                    source: "virginia-sol-python",
                    parentStandard: code
                  }
                });
              }
            }
          }
        }
      }
    }
  } else if (filePath.includes("2_MATH_SOL.py")) {
    // Process Grade 2 format
    const grade2Match = fileContent.match(/grade2_standards\s*=\s*\[([\s\S]*?)\]/);
    if (grade2Match) {
      const dataStr = grade2Match[1];
      const tupleMatches = dataStr.match(/\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\[([\s\S]*?)\]\)/g);
      
      if (tupleMatches) {
        for (const match of tupleMatches) {
          const parts = match.match(/\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\[([\s\S]*?)\]\)/);
          if (parts) {
            const [, strand, code, description, subStandardsStr] = parts;
            
            standards.push({
              id: `${subject}-${grade}-${code}`,
              standardCode: code,
              subject: subject,
              grade: grade,
              strand: strand,
              title: code,
              description: description,
              metadata: {
                imported: true,
                importDate: new Date().toISOString(),
                source: "virginia-sol-python",
                hasSubStandards: true
              }
            });
            
            // Extract sub-standards
            const subMatches = subStandardsStr.match(/\("([^"]+)",\s*"([^"]+)"\)/g);
            if (subMatches) {
              for (const subMatch of subMatches) {
                const subParts = subMatch.match(/\("([^"]+)",\s*"([^"]+)"\)/);
                if (subParts) {
                  const [, subCode, subDescription] = subParts;
                  
                  standards.push({
                    id: `${subject}-${grade}-${subCode}`,
                    standardCode: subCode,
                    subject: subject,
                    grade: grade,
                    strand: strand,
                    title: subCode,
                    description: subDescription,
                    metadata: {
                      imported: true,
                      importDate: new Date().toISOString(),
                      source: "virginia-sol-python",
                      parentStandard: code
                    }
                  });
                }
              }
            }
          }
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
  return words.join('_').toLowerCase();
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
