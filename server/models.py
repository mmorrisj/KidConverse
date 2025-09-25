"""
SQLAlchemy ORM models for StudyBuddy AI database schema
"""
from sqlalchemy import create_engine, Column, String, Integer, Text, JSON, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import os
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    age = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    password = Column(String, nullable=True)  # For future authentication
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    chats = relationship("Chat", back_populates="user")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="user")


class Chat(Base):
    __tablename__ = 'chats'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    chat_id = Column(String, ForeignKey('chats.id'), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")


class SolStandard(Base):
    __tablename__ = 'sol_standards'

    id = Column(String, primary_key=True)
    standard_code = Column(String, nullable=False)  # e.g., "3.NS.1", "ALG.A.1"
    subject = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    strand = Column(String, nullable=False)
    title = Column(String, nullable=True)  # Short title/summary
    description = Column(Text, nullable=False)
    sol_metadata = Column(JSON, nullable=True)  # Enhanced data: sub-objectives, prerequisites, etc.
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    assessment_items = relationship("AssessmentItem", back_populates="sol_standard")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="sol_standard")

    def __repr__(self):
        return f"<SolStandard(id='{self.id}', code='{self.standard_code}', grade='{self.grade}')>"


class AssessmentItem(Base):
    __tablename__ = 'assessment_items'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    sol_id = Column(String, ForeignKey('sol_standards.id'), nullable=False)
    item_type = Column(String, nullable=False)  # 'MCQ', 'FIB', 'CR'
    difficulty = Column(String, nullable=False)  # 'easy', 'medium', 'hard'
    dok = Column(Integer, nullable=False)  # Depth of Knowledge level
    stem = Column(Text, nullable=False)  # Question text
    payload = Column(JSON, nullable=False)  # Question-specific data (options, answers, etc.)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    sol_standard = relationship("SolStandard", back_populates="assessment_items")
    attempts = relationship("AssessmentAttempt", back_populates="assessment_item")


class AssessmentAttempt(Base):
    __tablename__ = 'assessment_attempts'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    item_id = Column(String, ForeignKey('assessment_items.id'), nullable=False)
    sol_id = Column(String, ForeignKey('sol_standards.id'), nullable=False)
    user_response = Column(JSON, nullable=False)  # Student's answer
    is_correct = Column(Boolean, nullable=False)
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="assessment_attempts")
    assessment_item = relationship("AssessmentItem", back_populates="attempts")
    sol_standard = relationship("SolStandard", back_populates="assessment_attempts")


class MasteryProgress(Base):
    __tablename__ = 'mastery_progress'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    sol_id = Column(String, ForeignKey('sol_standards.id'), nullable=False)
    ewma_score = Column(Float, nullable=False, default=0.0)
    attempt_count = Column(Integer, nullable=False, default=0)
    last_attempt = Column(DateTime, nullable=True)
    mastery_level = Column(String, nullable=False, default='beginning')  # 'beginning', 'developing', 'proficient', 'advanced'
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# Database connection and session management
class DatabaseManager:
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def create_tables(self):
        """Create all tables in the database"""
        Base.metadata.create_all(bind=self.engine)
    
    def get_session(self):
        """Get a database session"""
        return self.SessionLocal()
    
    def drop_tables(self):
        """Drop all tables (use with caution!)"""
        Base.metadata.drop_all(bind=self.engine)


# Database manager can be initialized when needed:
# db_manager = DatabaseManager(database_url="your_url_here")