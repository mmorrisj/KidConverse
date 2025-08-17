#!/usr/bin/env python3
"""
Migration script to transition from current PostgreSQL setup to SQLAlchemy ORM
"""
import os
import sys
import asyncio
import psycopg2
from sqlalchemy import create_engine, text
from models import db_manager, User, Chat, Message, SolStandard, AssessmentItem, AssessmentAttempt

async def migrate_existing_data():
    """Migrate existing data from current schema to SQLAlchemy models"""
    
    # Get database connection
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not found")
        return False
    
    try:
        # Initialize SQLAlchemy database
        print("Initializing SQLAlchemy schema...")
        db_manager.create_tables()
        print("✓ SQLAlchemy tables created successfully")
        
        # Get a session
        session = db_manager.get_session()
        
        # Check if we have existing data to migrate
        engine = db_manager.engine
        
        # Check for existing users table
        result = engine.execute(text("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'users' AND table_schema = 'public'
        """))
        users_table_exists = result.scalar() > 0
        
        if users_table_exists:
            print("Found existing data, starting migration...")
            
            # Migrate users
            print("Migrating users...")
            users_result = engine.execute(text("SELECT * FROM users"))
            user_count = 0
            for row in users_result:
                existing_user = session.query(User).filter(User.id == row.id).first()
                if not existing_user:
                    user = User(
                        id=row.id,
                        name=row.name,
                        email=row.email,
                        age=row.age,
                        grade=row.grade,
                        password=getattr(row, 'password', None),
                        created_at=getattr(row, 'created_at', None)
                    )
                    session.add(user)
                    user_count += 1
            session.commit()
            print(f"✓ Migrated {user_count} users")
            
            # Migrate chats
            print("Migrating chats...")
            try:
                chats_result = engine.execute(text("SELECT * FROM chats"))
                chat_count = 0
                for row in chats_result:
                    existing_chat = session.query(Chat).filter(Chat.id == row.id).first()
                    if not existing_chat:
                        chat = Chat(
                            id=row.id,
                            title=row.title,
                            user_id=row.user_id,
                            created_at=getattr(row, 'created_at', None),
                            updated_at=getattr(row, 'updated_at', None)
                        )
                        session.add(chat)
                        chat_count += 1
                session.commit()
                print(f"✓ Migrated {chat_count} chats")
            except Exception as e:
                print(f"Note: Could not migrate chats: {e}")
            
            # Migrate messages
            print("Migrating messages...")
            try:
                messages_result = engine.execute(text("SELECT * FROM messages"))
                message_count = 0
                for row in messages_result:
                    existing_message = session.query(Message).filter(Message.id == row.id).first()
                    if not existing_message:
                        message = Message(
                            id=row.id,
                            chat_id=row.chat_id,
                            role=row.role,
                            content=row.content,
                            created_at=getattr(row, 'created_at', None)
                        )
                        session.add(message)
                        message_count += 1
                session.commit()
                print(f"✓ Migrated {message_count} messages")
            except Exception as e:
                print(f"Note: Could not migrate messages: {e}")
            
            # Migrate SOL standards
            print("Migrating SOL standards...")
            try:
                standards_result = engine.execute(text("SELECT * FROM sol_standards"))
                standard_count = 0
                for row in standards_result:
                    existing_standard = session.query(SolStandard).filter(SolStandard.id == row.id).first()
                    if not existing_standard:
                        standard = SolStandard(
                            id=row.id,
                            subject=row.subject,
                            grade=row.grade,
                            strand=row.strand,
                            description=row.description,
                            created_at=getattr(row, 'created_at', None)
                        )
                        session.add(standard)
                        standard_count += 1
                session.commit()
                print(f"✓ Migrated {standard_count} SOL standards")
            except Exception as e:
                print(f"Note: Could not migrate SOL standards: {e}")
            
            # Migrate assessment items
            print("Migrating assessment items...")
            try:
                items_result = engine.execute(text("SELECT * FROM assessment_items"))
                item_count = 0
                for row in items_result:
                    existing_item = session.query(AssessmentItem).filter(AssessmentItem.id == row.id).first()
                    if not existing_item:
                        item = AssessmentItem(
                            id=row.id,
                            sol_id=row.sol_id,
                            item_type=row.item_type,
                            difficulty=row.difficulty,
                            dok=row.dok,
                            stem=row.stem,
                            payload=row.payload,
                            created_at=getattr(row, 'created_at', None)
                        )
                        session.add(item)
                        item_count += 1
                session.commit()
                print(f"✓ Migrated {item_count} assessment items")
            except Exception as e:
                print(f"Note: Could not migrate assessment items: {e}")
            
            # Migrate assessment attempts
            print("Migrating assessment attempts...")
            try:
                attempts_result = engine.execute(text("SELECT * FROM assessment_attempts"))
                attempt_count = 0
                for row in attempts_result:
                    existing_attempt = session.query(AssessmentAttempt).filter(AssessmentAttempt.id == row.id).first()
                    if not existing_attempt:
                        attempt = AssessmentAttempt(
                            id=row.id,
                            user_id=row.user_id,
                            item_id=row.item_id,
                            sol_id=row.sol_id,
                            user_response=row.user_response,
                            is_correct=row.is_correct,
                            score=row.score,
                            max_score=row.max_score,
                            feedback=getattr(row, 'feedback', None),
                            duration_seconds=getattr(row, 'duration_seconds', None),
                            created_at=getattr(row, 'created_at', None)
                        )
                        session.add(attempt)
                        attempt_count += 1
                session.commit()
                print(f"✓ Migrated {attempt_count} assessment attempts")
            except Exception as e:
                print(f"Note: Could not migrate assessment attempts: {e}")
            
        else:
            print("No existing data found, fresh SQLAlchemy installation complete")
        
        session.close()
        print("\n🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(migrate_existing_data())
    sys.exit(0 if success else 1)