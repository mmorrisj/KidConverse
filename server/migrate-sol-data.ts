import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import { solStandards } from "@shared/schema";

async function migrateSolData() {
  try {
    console.log("Loading SOL standards data...");
    
    // Read the SOL standards JSON file
    const solDataPath = join(process.cwd(), "SOL", "standards.json");
    const solData = JSON.parse(readFileSync(solDataPath, "utf-8"));
    
    const standardsToInsert = [];
    
    // Process each subject
    for (const [subject, grades] of Object.entries(solData)) {
      if (typeof grades !== "object" || grades === null) continue;
      
      // Process each grade
      for (const [grade, standards] of Object.entries(grades)) {
        if (typeof standards !== "object" || standards === null) continue;
        
        // Process each standard
        for (const [code, standard] of Object.entries(standards)) {
          if (typeof standard !== "object" || standard === null) continue;
          
          const standardData = standard as any;
          
          standardsToInsert.push({
            id: `${subject}-${grade}-${code}`,
            standardCode: code,
            subject: subject,
            grade: grade,
            strand: standardData.strands?.[0] || "General",
            title: standardData.title || "",
            description: standardData.description || "",
            metadata: {
              imported: true,
              importDate: new Date().toISOString(),
              source: "virginia-sol",
              strands: standardData.strands || []
            }
          });
        }
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
    
    console.log("✅ SOL standards migration completed successfully!");
    
    // Verify the data
    const count = await db.select().from(solStandards);
    console.log(`📊 Total standards in database: ${count.length}`);
    
  } catch (error) {
    console.error("❌ Error during SOL data migration:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSolData()
    .then(() => {
      console.log("Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateSolData };