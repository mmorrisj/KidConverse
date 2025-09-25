#!/usr/bin/env python3
"""
Database setup and migration for SOL processing system
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from server.models import Base, User, Chat, Message, SolStandard, AssessmentItem, AssessmentAttempt


def create_database_tables(database_url: str):
    """Create all database tables"""
    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
    return engine


def add_database_indexes(engine):
    """Add performance indexes for SOL queries"""
    with engine.connect() as conn:
        # Indexes for SOL standards
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sol_standards_subject_grade
            ON sol_standards(subject, grade)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sol_standards_strand
            ON sol_standards(strand)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sol_standards_code
            ON sol_standards(standard_code)
        """))

        # Indexes for assessment items
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_items_sol_id
            ON assessment_items(sol_id)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_items_difficulty
            ON assessment_items(difficulty, item_type)
        """))

        # Indexes for assessment attempts
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_id
            ON assessment_attempts(user_id)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_attempts_sol_id
            ON assessment_attempts(sol_id)
        """))

        conn.commit()

    print("✅ Database indexes created successfully")


def migrate_sol_schema(engine):
    """Migrate SOL standards table to new schema with enhanced fields"""
    with engine.connect() as conn:
        # Add new columns if they don't exist
        try:
            conn.execute(text("""
                ALTER TABLE sol_standards
                ADD COLUMN IF NOT EXISTS standard_code VARCHAR;
            """))

            conn.execute(text("""
                ALTER TABLE sol_standards
                ADD COLUMN IF NOT EXISTS title VARCHAR;
            """))

            conn.execute(text("""
                ALTER TABLE sol_standards
                ADD COLUMN IF NOT EXISTS sol_metadata JSONB;
            """))

            conn.commit()
            print("✅ SOL schema migration completed")

        except Exception as e:
            print(f"⚠️ Schema migration note: {e}")


def setup_database(database_url: str = None):
    """Complete database setup"""
    database_url = database_url or os.getenv('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL environment variable is required")
        return False

    try:
        print("🔄 Setting up database...")

        # Create tables
        engine = create_database_tables(database_url)

        # Run migrations
        migrate_sol_schema(engine)

        # Add indexes
        add_database_indexes(engine)

        print("✅ Database setup completed successfully")
        return True

    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False


if __name__ == "__main__":
    import sys

    database_url = sys.argv[1] if len(sys.argv) > 1 else None

    if setup_database(database_url):
        print("\n🎉 Your PostgreSQL database is ready for SOL processing!")
        print("\nNext steps:")
        print("1. Set your environment variables:")
        print("   export DATABASE_URL='your_postgresql_url'")
        print("   export OPENAI_API_KEY='your_openai_key'")
        print("2. Install Python dependencies:")
        print("   pip install -r requirements.txt")
        print("3. Process SOL documents:")
        print("   python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx")
    else:
        sys.exit(1)