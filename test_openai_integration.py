#!/usr/bin/env python3
"""
Test OpenAI integration with a simple example
"""
import os
import json
from sol_processor import SOLProcessor


def test_openai_simple():
    """Test OpenAI with a simple, short document"""
    print("🤖 Testing OpenAI Integration")
    print("=" * 40)

    # Set up environment
    os.environ['DATABASE_URL'] = 'postgresql://devuser:devpassword@localhost:5433/studybuddy_dev'

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not set")
        return False

    print(f"✅ OpenAI API key available: {api_key[:10]}...")

    try:
        processor = SOLProcessor()
        print("✅ SOL Processor initialized")

        # Test with simple, minimal document text
        simple_doc = """
Grade 3 Mathematics Standards

3.NS.1 - Number and Number Sense
The student will read and write whole numbers through 9,999.

3.CE.1 - Computation and Estimation
The student will add and subtract whole numbers.
        """.strip()

        print(f"📄 Testing with simple document ({len(simple_doc)} characters)")

        # Process with OpenAI
        print("🤖 Sending to OpenAI GPT-4o Mini...")
        result = processor.process_sol_document(simple_doc, "test_doc.txt")

        print("✅ OpenAI processing successful!")
        print(f"   Extracted {len(result.standards)} standards")

        # Show results
        print("\n📊 Results:")
        print(f"   Document Title: {result.metadata.get('document_title', 'Unknown')}")
        print(f"   Subject: {result.metadata.get('subject', 'Unknown')}")
        print(f"   Grade Level: {result.metadata.get('grade_level', 'Unknown')}")

        for i, std in enumerate(result.standards[:2], 1):
            print(f"\n   {i}. {std.standard_code} - {std.strand}")
            print(f"      Description: {std.description[:80]}...")
            if std.key_terms:
                print(f"      Key Terms: {', '.join(std.key_terms[:3])}")

        return True

    except Exception as e:
        print(f"❌ OpenAI test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_openai_api_direct():
    """Test OpenAI API directly"""
    print("\n🔗 Testing Direct OpenAI API Call")
    print("=" * 40)

    try:
        from openai import OpenAI

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print("❌ OPENAI_API_KEY not set")
            return False

        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": "Say 'Hello from OpenAI!' and return just that text."
                }
            ],
            max_tokens=50,
            temperature=0
        )

        result = response.choices[0].message.content
        print(f"✅ Direct API call successful!")
        print(f"   Response: {result}")

        return True

    except Exception as e:
        print(f"❌ Direct API test failed: {e}")
        return False


def main():
    """Run OpenAI integration tests"""
    print("🧪 OpenAI Integration Test Suite")
    print("=" * 50)

    # Test 1: Direct API
    if not test_openai_api_direct():
        return False

    # Test 2: SOL Processing
    if not test_openai_simple():
        return False

    print("\n" + "=" * 50)
    print("🎉 OpenAI integration working correctly!")
    print("\n✅ You can now process SOL documents with:")
    print("   python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx")

    return True


if __name__ == "__main__":
    import sys
    if main():
        sys.exit(0)
    else:
        sys.exit(1)