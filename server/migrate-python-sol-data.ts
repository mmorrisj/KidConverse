import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import { solStandards } from "@shared/schema";

async function migratePythonSolData() {
  try {
    console.log("Loading SOL standards from Python files...");

    const standardsToInsert = [];

    // File mappings with their expected variable names and formats
    const fileConfigs = [
      { file: "ALG_MATH_SOL.py", grade: "Algebra1", variable: "algebra1_data", format: "algebra" },
      { file: "ALG2_MATH_SOL.py", grade: "Algebra2", variable: "a2_data", format: "algebra" },
      { file: "AFDA_MATH_SOL.py", grade: "AFDA", variable: "afda_data", format: "algebra" },
      { file: "TRIG_MATH_SOL.py", grade: "Trigonometry", variable: "trig_data", format: "algebra" },
      { file: "1_MATH_SOL.py", grade: "1", variable: "grade1_standards", format: "grade" },
      { file: "2_MATH_SOL.py", grade: "2", variable: "grade2_standards", format: "grade" },
      { file: "3_MATH_SOL.py", grade: "3", variable: "standards_data", format: "grade" },
      { file: "4_MATH_SOL.py", grade: "4", variable: "grade4_standards", format: "grade" },
      { file: "5_MATH_SOL.py", grade: "5", variable: "grade5_standards", format: "grade" },
      { file: "6_MATH_SOL.py", grade: "6", variable: "grade6_standards", format: "grade" },
      { file: "7_MATH_SOL.py", grade: "7", variable: "grade7_data", format: "grade" },
    ];

    for (const config of fileConfigs) {
      try {
        const filePath = join(process.cwd(), "SOL", config.file);
        const fileContent = readFileSync(filePath, "utf-8");

        const standards = parseFile(fileContent, config, "mathematics");
        standardsToInsert.push(...standards);
        console.log(`✅ Loaded ${standards.length} standards from ${config.file}`);
      } catch (error) {
        console.log(`❌ Error processing ${config.file}: ${error.message}`);
      }
    }

    console.log(`\nPreparing to insert ${standardsToInsert.length} standards...`);

    if (standardsToInsert.length === 0) {
      console.log("No standards found to insert. Check file parsing logic.");
      return;
    }

    // Clear existing standards to avoid duplicates
    await db.delete(solStandards);
    console.log("Cleared existing standards");

    // Insert standards in batches
    const batchSize = 50;
    for (let i = 0; i < standardsToInsert.length; i += batchSize) {
      const batch = standardsToInsert.slice(i, i + batchSize);
      await db.insert(solStandards).values(batch);
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

function parseFile(content: string, config: any, subject: string) {
  const standards = [];

  try {
    if (config.format === "algebra") {
      // Parse algebra format: ("code", "description", ["sub1", "sub2"])
      const match = content.match(new RegExp(`${config.variable}\\s*=\\s*\\[([\\s\\S]*?)\\n\\]`));
      if (!match) {
        console.log(`Could not find ${config.variable} in file`);
        return standards;
      }

      const dataContent = match[1];

      // Split by main tuples - look for patterns like ("A.EO.1", "description", [
      const tupleMatches = dataContent.split(/(?=\s*\(\s*"[A-Z]\.[A-Z]+\.\d+")/).filter(part => part.trim());

      for (const tupleContent of tupleMatches) {
        const tupleMatch = tupleContent.match(/\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/);
        if (tupleMatch) {
          const [, code, description, subStandardsStr] = tupleMatch;

          // Add main standard
          standards.push({
            id: `${subject}-${config.grade}-${code}`,
            subject: subject,
            grade: config.grade,
            strand: extractStrand(code),
            description: description.trim()
          });

          // Extract sub-standards
          const subMatches = subStandardsStr.match(/"([^"]+)"/g);
          if (subMatches) {
            subMatches.forEach(subMatch => {
              const subDescription = subMatch.replace(/"/g, '');
              const subCode = extractSubStandardCode(subDescription, code);

              standards.push({
                id: `${subject}-${config.grade}-${subCode}`,
                subject: subject,
                grade: config.grade,
                strand: extractStrand(code),
                description: subDescription.trim()
              });
            });
          }
        }
      }
    } else if (config.format === "grade") {
      // Parse grade format: ("strand", "code", "description", [("subcode", "subdesc")])
      const match = content.match(new RegExp(`${config.variable}\\s*=\\s*\\[([\\s\\S]*?)\\n\\]`));
      if (!match) {
        console.log(`Could not find ${config.variable} in file`);
        return standards;
      }

      const dataContent = match[1];

      // Split by main tuples - look for patterns starting with ("
      const tupleMatches = dataContent.split(/(?=\s*\(\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*\[)/).filter(part => part.trim());

      for (const tupleContent of tupleMatches) {
        const tupleMatch = tupleContent.match(/\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/);
        if (tupleMatch) {
          const [, strand, code, description, subStandardsStr] = tupleMatch;

          // Add main standard
          standards.push({
            id: `${subject}-${config.grade}-${code}`,
            subject: subject,
            grade: config.grade,
            strand: strand.trim(),
            description: description.trim()
          });

          // Extract sub-standards
          const subTupleMatches = subStandardsStr.match(/\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g);
          if (subTupleMatches) {
            subTupleMatches.forEach(subTuple => {
              const subMatch = subTuple.match(/\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
              if (subMatch) {
                const [, subCode, subDescription] = subMatch;

                standards.push({
                  id: `${subject}-${config.grade}-${subCode}`,
                  subject: subject,
                  grade: config.grade,
                  strand: strand.trim(),
                  description: subDescription.trim()
                });
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing ${config.file}:`, error);
  }

  return standards;
}

function extractStrand(code: string): string {
  if (code.startsWith("A.EO")) return "Expressions and Operations";
  if (code.startsWith("A.EI")) return "Equations and Inequalities";
  if (code.startsWith("A.F")) return "Functions";
  if (code.startsWith("A.ST")) return "Statistics";
  if (code.includes(".NS.")) return "Number and Number Sense";
  if (code.includes(".CE.")) return "Computation and Estimation";
  if (code.includes(".MG.")) return "Measurement and Geometry";
  if (code.includes(".PS.")) return "Probability and Statistics";
  if (code.includes(".PFA.")) return "Patterns, Functions, and Algebra";
  return "General";
}

function extractSubStandardCode(description: string, parentCode: string): string {
  // Try to extract code from description like "A.EO.1.a"
  const match = description.match(/^([A-Z]+\.[A-Z]+\.\d+\.[a-z]+)/);
  if (match) return match[1];

  // Try to extract code like "2.NS.1.a"
  const gradeMatch = description.match(/^(\d+\.[A-Z]+\.\d+\.[a-z]+)/);
  if (gradeMatch) return gradeMatch[1];

  // Generate a code based on parent + increment
  const words = description.split(' ').slice(0, 2);
  return `${parentCode}.${words.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '')}`.substring(0, 50);
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