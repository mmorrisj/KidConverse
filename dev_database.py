#!/usr/bin/env python3
"""
Development Database Management Script
Easy commands to manage your development database for SOL processing
"""
import os
import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich import print as rprint

console = Console()


@click.group()
def cli():
    """Development Database Management for StudyBuddy SOL Processing"""
    pass


@cli.command()
@click.option('--with-pgadmin', is_flag=True, help='Also start pgAdmin web interface')
def start(with_pgadmin: bool):
    """Start the development database"""
    rprint("🚀 Starting development database...")

    try:
        cmd = ['docker-compose', '-f', 'docker-compose.dev.yml', 'up', '-d', 'postgres-dev']
        if with_pgadmin:
            cmd = ['docker-compose', '-f', 'docker-compose.dev.yml', '--profile', 'admin', 'up', '-d']

        result = subprocess.run(cmd, check=True, capture_output=True, text=True)

        rprint("✅ Development database started successfully!")
        rprint(f"   PostgreSQL: localhost:5433")
        rprint(f"   Database: studybuddy_dev")
        rprint(f"   User: devuser")

        if with_pgadmin:
            rprint(f"   pgAdmin: http://localhost:8080")
            rprint(f"   pgAdmin login: dev@studybuddy.com / devpassword")

        rprint("\n🔧 Connection string:")
        rprint("   postgresql://devuser:devpassword@localhost:5433/studybuddy_dev")

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to start database: {e}")
        if e.stderr:
            rprint(f"Error details: {e.stderr}")
        sys.exit(1)


@cli.command()
def stop():
    """Stop the development database"""
    rprint("🛑 Stopping development database...")

    try:
        subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev.yml', 'down'
        ], check=True)

        rprint("✅ Development database stopped successfully!")

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to stop database: {e}")
        sys.exit(1)


@cli.command()
def restart():
    """Restart the development database"""
    rprint("🔄 Restarting development database...")

    try:
        # Stop
        subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev.yml', 'down'
        ], check=True)

        # Start
        subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev.yml', 'up', '-d', 'postgres-dev'
        ], check=True)

        rprint("✅ Development database restarted successfully!")

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to restart database: {e}")
        sys.exit(1)


@cli.command()
def reset():
    """Reset the development database (destroys all data!)"""
    if click.confirm('⚠️ This will destroy ALL data in the development database. Continue?'):
        rprint("🗑️ Resetting development database...")

        try:
            # Stop containers
            subprocess.run([
                'docker-compose', '-f', 'docker-compose.dev.yml', 'down'
            ], check=True)

            # Remove volume
            subprocess.run([
                'docker', 'volume', 'rm', 'studybuddy_pgdata_dev'
            ], check=False)  # Don't fail if volume doesn't exist

            # Start fresh
            subprocess.run([
                'docker-compose', '-f', 'docker-compose.dev.yml', 'up', '-d', 'postgres-dev'
            ], check=True)

            rprint("✅ Development database reset successfully!")
            rprint("   Fresh database with sample data is ready")

        except subprocess.CalledProcessError as e:
            rprint(f"❌ Failed to reset database: {e}")
            sys.exit(1)
    else:
        rprint("❌ Database reset cancelled")


@cli.command()
def status():
    """Show development database status"""
    rprint("📊 Development Database Status")

    try:
        result = subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev.yml', 'ps'
        ], capture_output=True, text=True, check=True)

        rprint("\n🐳 Docker Containers:")
        console.print(result.stdout)

        # Test connection
        rprint("🔗 Testing database connection...")
        os.environ['DATABASE_URL'] = 'postgresql://devuser:devpassword@localhost:5433/studybuddy_dev'

        from sqlalchemy import create_engine, text

        try:
            engine = create_engine(os.environ['DATABASE_URL'])
            with engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) as total_standards FROM sol_standards"))
                count = result.fetchone()[0]

            rprint(f"✅ Database connection successful")
            rprint(f"   SOL Standards in database: {count}")

        except Exception as e:
            rprint(f"❌ Database connection failed: {e}")

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to get status: {e}")


@cli.command()
def connect():
    """Connect to development database with psql"""
    rprint("🔌 Connecting to development database...")

    try:
        subprocess.run([
            'docker', 'exec', '-it', 'studybuddy-postgres-dev',
            'psql', '-U', 'devuser', '-d', 'studybuddy_dev'
        ], check=True)

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to connect: {e}")
        rprint("   Make sure the database is running: python dev_database.py start")


@cli.command()
def logs():
    """Show database logs"""
    rprint("📋 Development database logs:")

    try:
        subprocess.run([
            'docker-compose', '-f', 'docker-compose.dev.yml', 'logs', '-f', 'postgres-dev'
        ], check=True)

    except KeyboardInterrupt:
        rprint("\n👋 Stopped following logs")
    except subprocess.CalledProcessError as e:
        rprint(f"❌ Failed to show logs: {e}")


@cli.command()
def backup():
    """Create a backup of development data"""
    backup_file = f"backup_dev_{int(__import__('time').time())}.sql"

    rprint(f"💾 Creating backup: {backup_file}")

    try:
        with open(backup_file, 'w') as f:
            subprocess.run([
                'docker', 'exec', 'studybuddy-postgres-dev',
                'pg_dump', '-U', 'devuser', 'studybuddy_dev'
            ], stdout=f, check=True)

        rprint(f"✅ Backup created successfully: {backup_file}")

    except subprocess.CalledProcessError as e:
        rprint(f"❌ Backup failed: {e}")


@cli.command()
@click.argument('backup_file', type=click.Path(exists=True))
def restore(backup_file):
    """Restore from backup file"""
    if click.confirm(f'⚠️ This will replace all data with {backup_file}. Continue?'):
        rprint(f"📥 Restoring from: {backup_file}")

        try:
            with open(backup_file, 'r') as f:
                subprocess.run([
                    'docker', 'exec', '-i', 'studybuddy-postgres-dev',
                    'psql', '-U', 'devuser', '-d', 'studybuddy_dev'
                ], stdin=f, check=True)

            rprint("✅ Restore completed successfully!")

        except subprocess.CalledProcessError as e:
            rprint(f"❌ Restore failed: {e}")
    else:
        rprint("❌ Restore cancelled")


@cli.command()
def setup_env():
    """Set up environment variables for development"""
    rprint("🌍 Setting up development environment...")

    env_dev = Path('.env.development')
    if not env_dev.exists():
        rprint("❌ .env.development file not found")
        return

    rprint("✅ Found .env.development file")
    rprint("\n🔧 To use the development database, run:")
    rprint("   export $(cat .env.development | xargs)")
    rprint("\n   Or source the environment:")
    rprint("   set -a; source .env.development; set +a")

    rprint("\n📝 Key environment variables:")
    with open(env_dev, 'r') as f:
        for line in f:
            if line.startswith(('DATABASE_URL=', 'PGHOST=', 'PGPORT=')):
                rprint(f"   {line.strip()}")


if __name__ == '__main__':
    cli()