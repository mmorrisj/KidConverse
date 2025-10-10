#!/usr/bin/env python3
"""
Test script for SOL Processing Pipeline
Demonstrates pipeline functionality with sample files
"""

import os
import json
from pathlib import Path
from sol_pipeline import SOLPipeline

def test_pipeline():
    """Test the SOL pipeline with a sample file"""

    print("\n" + "="*60)
    print("SOL Processing Pipeline Test")
    print("="*60 + "\n")

    # Check for API key
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ Error: OPENAI_API_KEY environment variable not set")
        print("\nSet it with:")
        print('  export OPENAI_API_KEY="sk-..."')
        print("\nOr create a .env file with:")
        print('  OPENAI_API_KEY=sk-...')
        return False

    # Initialize pipeline
    try:
        pipeline = SOLPipeline(staging_dir="./test_staging")
        print("✓ Pipeline initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize pipeline: {e}")
        return False

    # Find a test file
    test_files = [
        "SOL/Documentation/3-2023-Approved-Math-SOL.docx",
        "SOL/3_MATH_SOL.py",
        "SOL/Grade3_Math_SOL_All_Standards.xlsx"
    ]

    test_file = None
    for file_path in test_files:
        if Path(file_path).exists() and file_path.endswith(('.docx', '.xlsx')):
            test_file = file_path
            break

    if not test_file:
        print("\n⚠️  No test files found in expected locations:")
        for f in test_files:
            print(f"   - {f}")
        print("\nSkipping file processing test.")
        print("\nTo test the pipeline, run:")
        print('  python sol_pipeline_cli.py process <your_file.docx>')
        return True

    print(f"\n📁 Testing with file: {test_file}")

    # Test detection only
    print("\n" + "-"*60)
    print("Stage 1: Detection Test")
    print("-"*60)

    try:
        document_text = pipeline.extract_document_text(test_file)
        print(f"✓ Extracted {len(document_text):,} characters from document")

        detection = pipeline.detect_sol_content(document_text, Path(test_file).name)

        print(f"\nDetection Results:")
        print(f"  Has SOL Content: {'✓ Yes' if detection.has_sol_content else '✗ No'}")
        print(f"  Confidence: {detection.confidence}")
        print(f"  Subject: {detection.detected_subject or 'N/A'}")
        print(f"  Grade: {detection.detected_grade or 'N/A'}")
        print(f"  Estimated Standards: {detection.detected_standards_count}")
        print(f"  Reasoning: {detection.reasoning[:100]}...")

        if not detection.has_sol_content:
            print("\n⚠️  No SOL content detected. Skipping transformation test.")
            return True

    except Exception as e:
        print(f"❌ Detection failed: {e}")
        return False

    # Test full pipeline
    print("\n" + "-"*60)
    print("Stage 2: Full Pipeline Test")
    print("-"*60)

    try:
        result = pipeline.process_file(test_file)

        if result.success:
            print(f"\n✓ Processing successful!")
            print(f"  Standards extracted: {result.standards_extracted}")
            print(f"  Output file: {result.output_file}")

            # Show sample of output
            if result.output_file and Path(result.output_file).exists():
                with open(result.output_file, 'r') as f:
                    output_data = json.load(f)

                print(f"\n📄 Output Preview:")
                print(json.dumps(output_data, indent=2)[:500] + "...")

                # Validate structure
                print(f"\n🔍 Validation:")
                subjects = list(output_data.keys())
                print(f"  Subjects: {', '.join(subjects)}")

                for subject in subjects[:1]:  # Just show first subject
                    grades = list(output_data[subject].keys())
                    print(f"  Grades in {subject}: {', '.join(grades)}")

                    for grade in grades[:1]:  # Just show first grade
                        standards = list(output_data[subject][grade].keys())
                        print(f"  Standards in {grade}: {', '.join(standards[:5])}...")

                        # Show one complete standard
                        if standards:
                            std_code = standards[0]
                            std = output_data[subject][grade][std_code]
                            print(f"\n  Example Standard ({std_code}):")
                            print(f"    Title: {std.get('title', 'N/A')}")
                            print(f"    Description: {std.get('description', 'N/A')[:100]}...")
                            print(f"    Strands: {std.get('strands', [])}")

        else:
            print(f"\n❌ Processing failed: {result.error}")
            return False

    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        return False

    print("\n" + "="*60)
    print("✓ All tests completed successfully!")
    print("="*60)
    print("\nNext steps:")
    print("1. Review output in ./test_staging/ directory")
    print("2. Run validation: python sol_pipeline_cli.py validate test_staging/*.json")
    print("3. Process more files: python sol_pipeline_cli.py batch SOL/Documentation/")
    print()

    return True


if __name__ == "__main__":
    import sys

    success = test_pipeline()
    sys.exit(0 if success else 1)
