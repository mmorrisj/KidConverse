#!/usr/bin/env python3
"""
Test script for development database setup
Verifies that the dev database is working for SOL processing
"""
import os
import sys
from pathlib import Path


def test_development_setup():
    """Test the complete development setup"""
    print("🧪 Testing Development Database Setup")
    print("=" * 50)

    success = True

    # Test 1: Check environment files
    print("\n1. 📁 Checking environment files...")
    env_files = ['.env.development', '.env.test']
    for env_file in env_files:
        if Path(env_file).exists():
            print(f"   ✅ {env_file} exists")
        else:
            print(f"   ❌ {env_file} missing")
            success = False

    # Test 2: Check Docker Compose
    print("\n2. 🐳 Checking Docker Compose files...")
    compose_files = ['docker-compose.dev.yml']
    for compose_file in compose_files:
        if Path(compose_file).exists():
            print(f"   ✅ {compose_file} exists")
        else:
            print(f"   ❌ {compose_file} missing")
            success = False

    # Test 3: Check database init scripts
    print("\n3. 📊 Checking database initialization scripts...")
    init_dir = Path('database/init')
    if init_dir.exists():
        init_files = list(init_dir.glob('*.sql'))
        print(f"   ✅ Found {len(init_files)} initialization scripts")
        for init_file in init_files:
            print(f"      • {init_file.name}")
    else:
        print("   ❌ database/init directory missing")
        success = False

    # Test 4: Check dev database management script
    print("\n4. 🛠️ Checking management scripts...")
    if Path('dev_database.py').exists():
        print("   ✅ dev_database.py exists")
    else:
        print("   ❌ dev_database.py missing")
        success = False

    # Test 5: Python imports
    print("\n5. 🐍 Testing Python imports...")
    try:
        import sqlalchemy
        print("   ✅ sqlalchemy imported")
    except ImportError:
        print("   ❌ sqlalchemy not available")
        success = False

    try:
        import click
        print("   ✅ click imported")
    except ImportError:
        print("   ❌ click not available")
        success = False

    try:
        import rich
        print("   ✅ rich imported")
    except ImportError:
        print("   ❌ rich not available")
        success = False

    # Test 6: Docker availability
    print("\n6. 🐳 Testing Docker availability...")
    try:
        import subprocess
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True, check=True)
        print(f"   ✅ Docker available: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   ❌ Docker not available")
        success = False

    try:
        result = subprocess.run(['docker-compose', '--version'], capture_output=True, text=True, check=True)
        print(f"   ✅ Docker Compose available: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   ❌ Docker Compose not available")
        success = False

    print("\n" + "=" * 50)

    if success:
        print("🎉 Development setup test passed!")
        print("\n🚀 Ready to start development database!")
        print("\nNext steps:")
        print("1. Start development database:")
        print("   python dev_database.py start")
        print("\n2. Set environment variables:")
        print("   export $(cat .env.development | xargs)")
        print("\n3. Test SOL processing:")
        print("   python test_python_sol.py")
        print("\n4. Process SOL documents:")
        print("   python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx")

    else:
        print("❌ Development setup has issues!")
        print("\nPlease resolve the errors above before proceeding.")
        return False

    return True


def show_usage_examples():
    """Show common usage examples"""
    print("\n📚 Common Development Commands:")
    print("\n🗄️ Database Management:")
    print("   python dev_database.py start          # Start dev database")
    print("   python dev_database.py stop           # Stop dev database")
    print("   python dev_database.py restart        # Restart database")
    print("   python dev_database.py reset          # Reset all data")
    print("   python dev_database.py status         # Check status")
    print("   python dev_database.py connect        # Connect with psql")

    print("\n🧪 SOL Processing:")
    print("   # Set development environment")
    print("   export $(cat .env.development | xargs)")
    print("")
    print("   # Test processing")
    print("   python test_python_sol.py")
    print("")
    print("   # Process documents")
    print("   python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx")
    print("   python sol_cli.py process-directory SOL/Documentation/")
    print("   python sol_cli.py validate")

    print("\n🔄 Switch Between Environments:")
    print("   # Development")
    print("   export $(cat .env.development | xargs)")
    print("")
    print("   # Production (your existing setup)")
    print("   export $(cat .env | xargs)")
    print("")
    print("   # Test")
    print("   export $(cat .env.test | xargs)")


if __name__ == "__main__":
    if test_development_setup():
        show_usage_examples()
    else:
        sys.exit(1)