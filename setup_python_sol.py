#!/usr/bin/env python3
"""
Quick setup script for Python SOL processing system
"""
import os
import subprocess
import sys
from pathlib import Path


def check_and_install_dependencies():
    """Check and install required Python packages"""
    print("🔧 Checking Python dependencies...")

    required_packages = {
        'docx': 'python-docx',
        'openai': 'openai',
        'sqlalchemy': 'sqlalchemy',
        'click': 'click',
        'rich': 'rich',
        'pydantic': 'pydantic',
        'dotenv': 'python-dotenv',
        'dataclasses_json': 'dataclasses-json'
    }

    missing_packages = []

    for import_name, package_name in required_packages.items():
        try:
            __import__(import_name)
            print(f"   ✅ {package_name} installed")
        except ImportError:
            missing_packages.append(package_name)
            print(f"   ❌ {package_name} missing")

    if missing_packages:
        print(f"\n📦 Installing missing packages: {', '.join(missing_packages)}")
        try:
            subprocess.run([
                sys.executable, '-m', 'pip', 'install'
            ] + missing_packages, check=True)
            print("✅ All dependencies installed successfully")
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            return False

    return True


def setup_environment():
    """Help user set up environment variables"""
    print("\n🌍 Environment Variables Setup")

    env_file = Path('.env')
    database_url = None
    openai_key = None

    # Check if .env file exists and read it
    if env_file.exists():
        print("   Found .env file, reading existing values...")
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=', 1)[1].strip().strip('"')
                elif line.startswith('OPENAI_API_KEY='):
                    openai_key = line.split('=', 1)[1].strip().strip('"')

    # Check current environment
    current_db_url = os.getenv('DATABASE_URL') or database_url
    current_openai_key = os.getenv('OPENAI_API_KEY') or openai_key

    print(f"   DATABASE_URL: {'✅ Set' if current_db_url else '❌ Not set'}")
    print(f"   OPENAI_API_KEY: {'✅ Set' if current_openai_key else '❌ Not set'}")

    if not current_db_url:
        print("\n❌ DATABASE_URL is required")
        print("   This should be your PostgreSQL connection string")
        print("   Example: postgresql://username:password@localhost:5432/studybuddy")
        return False

    if not current_openai_key:
        print("\n❌ OPENAI_API_KEY is required")
        print("   Get your API key from: https://platform.openai.com/api-keys")
        print("   Then set it with: export OPENAI_API_KEY='your_key_here'")
        return False

    return True


def check_database_connection():
    """Test database connection"""
    print("\n🗄️ Testing database connection...")

    try:
        from sqlalchemy import create_engine, text

        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            # Try reading from .env file
            env_file = Path('.env')
            if env_file.exists():
                with open(env_file, 'r') as f:
                    for line in f:
                        if line.startswith('DATABASE_URL='):
                            database_url = line.split('=', 1)[1].strip().strip('"')
                            break

        if not database_url:
            print("   ❌ DATABASE_URL not found")
            return False

        engine = create_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        print("   ✅ Database connection successful")
        return True

    except Exception as e:
        print(f"   ❌ Database connection failed: {e}")
        print("   Make sure PostgreSQL is running and DATABASE_URL is correct")
        return False


def setup_database_schema():
    """Set up database tables"""
    print("\n📊 Setting up database schema...")

    try:
        from database_setup import setup_database

        if setup_database():
            print("   ✅ Database schema setup completed")
            return True
        else:
            print("   ❌ Database schema setup failed")
            return False

    except Exception as e:
        print(f"   ❌ Schema setup error: {e}")
        return False


def check_sol_documents():
    """Check if SOL documents are available"""
    print("\n📚 Checking for SOL documents...")

    sol_dir = Path('SOL/Documentation')
    if not sol_dir.exists():
        print("   ❌ SOL/Documentation directory not found")
        return False

    docx_files = list(sol_dir.glob('*.docx'))
    if not docx_files:
        print("   ❌ No .docx files found in SOL/Documentation")
        return False

    print(f"   ✅ Found {len(docx_files)} SOL documents")
    for doc in docx_files[:3]:  # Show first 3
        print(f"      • {doc.name}")

    if len(docx_files) > 3:
        print(f"      ... and {len(docx_files) - 3} more")

    return True


def main():
    """Run the complete setup process"""
    print("🐍 Python SOL Processing System Setup")
    print("=" * 50)

    success = True

    # Step 1: Dependencies
    if not check_and_install_dependencies():
        success = False

    # Step 2: Environment
    if not setup_environment():
        success = False

    # Step 3: Database
    if success and not check_database_connection():
        success = False

    # Step 4: Schema
    if success and not setup_database_schema():
        success = False

    # Step 5: Documents
    if success and not check_sol_documents():
        success = False

    print("\n" + "=" * 50)

    if success:
        print("🎉 Setup completed successfully!")
        print("\n🚀 Ready to process SOL documents!")
        print("\nNext steps:")
        print("1. Test the system:")
        print("   python test_python_sol.py")
        print("\n2. Process a document:")
        print("   python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx")
        print("\n3. Process all documents:")
        print("   python sol_cli.py process-directory SOL/Documentation/")
        print("\n4. Check database:")
        print("   python sol_cli.py validate")

    else:
        print("❌ Setup incomplete. Please resolve the issues above.")
        sys.exit(1)


if __name__ == "__main__":
    main()