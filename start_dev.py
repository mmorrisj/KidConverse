#!/usr/bin/env python3
"""
Development server startup script
Handles database startup and environment setup
"""
import os
import subprocess
import sys
import time
from pathlib import Path

import click
from rich.console import Console
from rich import print as rprint

console = Console()


@click.command()
@click.option('--with-pgadmin', is_flag=True, help='Also start pgAdmin')
@click.option('--docker', is_flag=True, help='Use Docker for web app too')
@click.option('--port', default=5001, help='Port for development server')
def start_dev(with_pgadmin: bool, docker: bool, port: int):
    """Start the StudyBuddy development environment"""

    rprint("🚀 Starting StudyBuddy Development Environment")
    rprint("=" * 50)

    try:
        # Step 1: Start development database
        rprint("1. 🗄️ Starting development database...")

        db_cmd = ['python', 'dev_database.py', 'start']
        if with_pgadmin:
            db_cmd.append('--with-pgadmin')

        subprocess.run(db_cmd, check=True)
        rprint("   ✅ Development database started")

        # Step 2: Wait for database to be ready
        rprint("2. ⏳ Waiting for database to be ready...")
        time.sleep(5)

        # Step 3: Check database connection
        rprint("3. 🔗 Testing database connection...")
        os.environ['DATABASE_URL'] = 'postgresql://devuser:devpassword@localhost:5433/studybuddy_dev'

        test_result = subprocess.run([
            'python', 'dev_database.py', 'status'
        ], capture_output=True, text=True, check=True)

        if 'Database connection successful' in test_result.stdout:
            rprint("   ✅ Database connection verified")
        else:
            rprint("   ❌ Database connection failed")
            return False

        # Step 4: Set up environment
        rprint("4. 🌍 Setting up environment...")

        # Load development environment
        env_file = Path('.env.development')
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.strip() and not line.startswith('#') and '=' in line:
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value.strip('\'"')

        # Override port if specified
        os.environ['PORT'] = str(port)

        rprint(f"   ✅ Environment configured for port {port}")

        # Step 5: Start web application
        if docker:
            rprint("5. 🐳 Starting web application with Docker...")
            subprocess.run([
                'docker-compose', '-f', 'docker-compose.dev-full.yml', 'up', '-d'
            ], check=True)
        else:
            rprint("5. 🌐 Starting web application...")
            rprint(f"   Starting development server on http://localhost:{port}")
            rprint("   Press Ctrl+C to stop")

            # Start the development server
            subprocess.run(['npm', 'run', 'dev'], check=True)

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to start development environment: {e}")
        return False
    except KeyboardInterrupt:
        rprint("\n👋 Shutting down development environment...")

        # Cleanup
        if docker:
            subprocess.run([
                'docker-compose', '-f', 'docker-compose.dev-full.yml', 'down'
            ], check=False)

        rprint("✅ Development environment stopped")
        return True

    return True


@click.command()
def stop_dev():
    """Stop the development environment"""
    rprint("🛑 Stopping StudyBuddy Development Environment")

    try:
        # Stop Docker services if running
        subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev-full.yml', 'down'
        ], check=False)

        # Stop development database
        subprocess.run(['python', 'dev_database.py', 'stop'], check=True)

        rprint("✅ Development environment stopped")

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Error stopping environment: {e}")


@click.command()
def status_dev():
    """Show development environment status"""
    rprint("📊 StudyBuddy Development Environment Status")
    rprint("=" * 45)

    # Database status
    try:
        result = subprocess.run([
            'python', 'dev_database.py', 'status'
        ], capture_output=True, text=True, check=True)

        rprint("🗄️ Database Status:")
        console.print(result.stdout)

    except subprocess.CalledProcessError:
        rprint("❌ Development database not running")

    # Docker status
    try:
        result = subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev-full.yml', 'ps'
        ], capture_output=True, text=True, check=True)

        if result.stdout.strip():
            rprint("\n🐳 Docker Services:")
            console.print(result.stdout)
        else:
            rprint("\n🐳 No Docker services running")

    except subprocess.CalledProcessError:
        rprint("\n🐳 Docker services not available")


@click.group()
def cli():
    """StudyBuddy Development Environment Manager"""
    pass


cli.add_command(start_dev, name='start')
cli.add_command(stop_dev, name='stop')
cli.add_command(status_dev, name='status')


if __name__ == '__main__':
    cli()