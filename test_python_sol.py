#!/usr/bin/env python3
"""
Test script for Python SOL processing system
This demonstrates the system without making permanent database changes
"""
import os
import json
import tempfile
from pathlib import Path

from sol_processor import SOLProcessor


def test_sol_processing():
    """Test the complete SOL processing pipeline"""
    print("🧪 Testing Python SOL Processing System\n")

    # Check environment variables
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY environment variable is required")
        print("   Set it with: export OPENAI_API_KEY='your_key_here'")
        print("   Get your API key from: https://platform.openai.com/api-keys")
        return False

    if not os.getenv('DATABASE_URL'):
        print("❌ DATABASE_URL environment variable is required")
        print("   Set it with: export DATABASE_URL='postgresql://user:pass@localhost:5432/db'")
        print("   Or use the same one from your .env file")
        return False

    try:
        # Initialize processor
        print("🔧 Initializing SOL processor...")
        processor = SOLProcessor()

        # Test document extraction
        test_file = 'SOL/Documentation/3-2023-Approved-Math-SOL.docx'

        if not Path(test_file).exists():
            print(f"❌ Test file not found: {test_file}")
            print("   Please ensure you have SOL documentation files available")
            return False

        print(f"📄 Testing with: {test_file}")

        # Extract text
        print("📝 Extracting text from document...")
        document_text = processor.extract_text_from_docx(test_file)
        print(f"   Extracted {len(document_text)} characters")

        # Show preview
        preview = document_text[:500].replace('\n', ' ')
        print(f"   Preview: {preview}...\n")

        # Process with AI (this makes API call)
        print("🧠 Processing with OpenAI GPT-4...")
        sol_data = processor.process_sol_document(document_text, test_file)
        print(f"   Extracted {len(sol_data.standards)} standards")

        # Show document metadata
        print("\n📊 Document Analysis:")
        print(f"   Title: {sol_data.metadata.get('document_title', 'Unknown')}")
        print(f"   Subject: {sol_data.metadata.get('subject', 'Unknown')}")
        print(f"   Grade Level: {sol_data.metadata.get('grade_level', 'Unknown')}")
        print(f"   Total Standards: {sol_data.metadata.get('total_standards', len(sol_data.standards))}")

        # Show sample standards
        print("\n📚 Sample Extracted Standards:")
        for i, std in enumerate(sol_data.standards[:3], 1):
            print(f"\n   {i}. {std.standard_code} - {std.strand}")
            print(f"      Grade: {std.grade} | Difficulty: {std.difficulty}")
            print(f"      Description: {std.description[:120]}...")

            if std.sub_objectives:
                print(f"      Sub-objectives: {len(std.sub_objectives)}")
                for sub in std.sub_objectives[:2]:
                    print(f"        • {sub.code}: {sub.description[:80]}...")

            if std.key_terms:
                print(f"      Key Terms: {', '.join(std.key_terms[:5])}")

        # Save to temporary file for inspection
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(sol_data.to_dict(), f, indent=2)
            temp_file = f.name

        print(f"\n💾 Full results saved to: {temp_file}")

        # Database statistics
        print("\n📈 Database Analysis:")
        try:
            stats = processor.get_database_stats()
            print(f"   Current standards in database: {stats['total_standards']}")

            if stats['by_subject_grade']:
                print("   Standards by subject/grade:")
                for subject, grades in stats['by_subject_grade'].items():
                    print(f"     {subject.title()}: {sum(grades.values())} total")
                    for grade, count in sorted(grades.items()):
                        print(f"       Grade {grade}: {count}")

        except Exception as e:
            print(f"   Database query error: {e}")

        # Grade progression analysis
        print("\n🎯 Multi-Grade Assessment Analysis:")
        grade_standards = {}
        for std in sol_data.standards:
            if std.grade not in grade_standards:
                grade_standards[std.grade] = {'count': 0, 'strands': set()}
            grade_standards[std.grade]['count'] += 1
            grade_standards[std.grade]['strands'].add(std.strand)

        for grade, data in sorted(grade_standards.items()):
            print(f"   Grade {grade}: {data['count']} standards across {len(data['strands'])} strands")

        print("\n✅ Test completed successfully!")

        print("\n🚀 Next Steps:")
        print("1. Review the generated JSON file for accuracy")
        print("2. Run: python sol_cli.py process-file [document.docx] to save to database")
        print("3. Use: python sol_cli.py validate to check database contents")
        print("4. Process more documents: python sol_cli.py process-directory SOL/Documentation/")

        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_dependencies():
    """Check if all required Python packages are installed"""
    required_packages = [
        'docx', 'openai', 'sqlalchemy', 'click', 'rich', 'pydantic'
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)

    if missing:
        print(f"❌ Missing required packages: {', '.join(missing)}")
        print("   Install with: pip install -r requirements.txt")
        return False

    return True


def main():
    """Run the complete test suite"""
    print("🐍 Python SOL Processing System Test")
    print("=" * 50)

    # Check dependencies
    if not check_dependencies():
        return

    # Run main test
    if test_sol_processing():
        print("\n🎉 All tests passed! Your Python SOL processing system is ready.")
    else:
        print("\n❌ Tests failed. Please check the errors above.")


if __name__ == "__main__":
    main()