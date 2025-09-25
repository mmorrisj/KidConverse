#!/usr/bin/env python3
"""
Simple test script to verify database connection and basic functionality
Tests the development database setup without making OpenAI API calls
"""
import os
import sys
from pathlib import Path


def test_database_connection():
    """Test basic database connectivity and sample data"""
    print("🔗 Testing Development Database Connection")
    print("=" * 50)

    try:
        # Set environment
        os.environ['DATABASE_URL'] = 'postgresql://devuser:devpassword@localhost:5433/studybuddy_dev'

        from sqlalchemy import create_engine, text
        from server.models import SolStandard
        from sqlalchemy.orm import sessionmaker

        engine = create_engine(os.environ['DATABASE_URL'])
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()

        print("✅ Database connection established")

        # Test basic queries
        total_standards = session.query(SolStandard).count()
        print(f"✅ Total SOL standards: {total_standards}")

        # Test subject breakdown
        from sqlalchemy import func
        subjects = session.query(
            SolStandard.subject,
            func.count(SolStandard.id).label('count')
        ).group_by(SolStandard.subject).all()

        print(f"\n📊 Standards by subject:")
        for subject, count in subjects:
            print(f"   {subject}: {count}")

        # Test grade breakdown
        grades = session.query(
            SolStandard.grade,
            func.count(SolStandard.id).label('count')
        ).group_by(SolStandard.grade).all()

        print(f"\n📈 Standards by grade:")
        for grade, count in grades:
            print(f"   Grade {grade}: {count}")

        # Show sample standard
        sample_standard = session.query(SolStandard).first()
        if sample_standard:
            print(f"\n📚 Sample standard:")
            print(f"   ID: {sample_standard.id}")
            print(f"   Code: {sample_standard.standard_code}")
            print(f"   Subject: {sample_standard.subject}")
            print(f"   Grade: {sample_standard.grade}")
            print(f"   Strand: {sample_standard.strand}")
            print(f"   Description: {sample_standard.description[:100]}...")

            if sample_standard.sol_metadata:
                metadata = sample_standard.sol_metadata
                if 'sub_objectives' in metadata:
                    print(f"   Sub-objectives: {len(metadata['sub_objectives'])}")
                if 'key_terms' in metadata:
                    print(f"   Key terms: {', '.join(metadata['key_terms'][:3])}...")

        session.close()

        print("\n✅ Database test completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False


def test_document_parsing():
    """Test document parsing without AI processing"""
    print("\n📄 Testing Document Parsing")
    print("=" * 30)

    test_file = 'SOL/Documentation/3-2023-Approved-Math-SOL.docx'

    if not Path(test_file).exists():
        print(f"❌ Test file not found: {test_file}")
        return False

    try:
        from sol_processor import SOLProcessor

        # Create processor without database operations
        processor = SOLProcessor(
            database_url='postgresql://devuser:devpassword@localhost:5433/studybuddy_dev',
            openai_api_key='dummy_key_for_testing'
        )

        # Test document text extraction only
        document_text = processor.extract_text_from_docx(test_file)

        print(f"✅ Document text extracted: {len(document_text)} characters")

        # Show preview
        preview = document_text[:200].replace('\n', ' ')
        print(f"   Preview: {preview}...")

        return True

    except Exception as e:
        print(f"❌ Document parsing failed: {e}")
        return False


def test_cli_tools():
    """Test CLI tools availability"""
    print("\n🛠️ Testing CLI Tools")
    print("=" * 20)

    try:
        # Test database management CLI
        if Path('dev_database.py').exists():
            print("✅ dev_database.py available")
        else:
            print("❌ dev_database.py missing")

        # Test SOL CLI
        if Path('sol_cli.py').exists():
            print("✅ sol_cli.py available")
        else:
            print("❌ sol_cli.py missing")

        return True

    except Exception as e:
        print(f"❌ CLI tools test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🧪 Development Database Test Suite")
    print("=" * 50)

    success = True

    # Test 1: Database
    if not test_database_connection():
        success = False

    # Test 2: Document parsing
    if not test_document_parsing():
        success = False

    # Test 3: CLI tools
    if not test_cli_tools():
        success = False

    print("\n" + "=" * 50)

    if success:
        print("🎉 All tests passed!")
        print("\n🚀 Your development environment is ready!")
        print("\nNext steps:")
        print("1. Process SOL documents:")
        print("   python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx")
        print("\n2. Check database contents:")
        print("   python sol_cli.py validate")
        print("\n3. Query specific standards:")
        print("   python sol_cli.py query mathematics 3")

    else:
        print("❌ Some tests failed!")
        print("Please check the errors above.")
        return False

    return True


if __name__ == "__main__":
    if main():
        sys.exit(0)
    else:
        sys.exit(1)