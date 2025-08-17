#!/usr/bin/env python3
"""
Python-based database service using SQLAlchemy ORM
This service handles all database operations for StudyBuddy AI
"""
import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, String, Integer, Text, JSON, DateTime, Boolean, Float, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import uuid

# Initialize Flask app for database API
app = Flask(__name__)

# SQLAlchemy setup
Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# Database Models
class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    age = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    password = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    chats = relationship("Chat", back_populates="user")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="user")

class Chat(Base):
    __tablename__ = 'chats'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    chat_id = Column(String, ForeignKey('chats.id'), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    chat = relationship("Chat", back_populates="messages")

class SolStandard(Base):
    __tablename__ = 'sol_standards'
    
    id = Column(String, primary_key=True)
    subject = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    strand = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    assessment_items = relationship("AssessmentItem", back_populates="sol_standard")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="sol_standard")

class AssessmentItem(Base):
    __tablename__ = 'assessment_items'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    sol_id = Column(String, ForeignKey('sol_standards.id'), nullable=False)
    item_type = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    dok = Column(Integer, nullable=False)
    stem = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    sol_standard = relationship("SolStandard", back_populates="assessment_items")
    attempts = relationship("AssessmentAttempt", back_populates="assessment_item")

class AssessmentAttempt(Base):
    __tablename__ = 'assessment_attempts'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    item_id = Column(String, ForeignKey('assessment_items.id'), nullable=False)
    sol_id = Column(String, ForeignKey('sol_standards.id'), nullable=False)
    user_response = Column(JSON, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="assessment_attempts")
    assessment_item = relationship("AssessmentItem", back_populates="attempts")
    sol_standard = relationship("SolStandard", back_populates="assessment_attempts")

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize database
def init_database():
    Base.metadata.create_all(bind=engine)

def get_session():
    return SessionLocal()

# API Routes
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "database"})

@app.route('/users', methods=['POST'])
def create_user():
    session = get_session()
    try:
        data = request.json
        user = User(
            name=data['name'],
            email=data['email'],
            age=data['age'],
            grade=data['grade'],
            password=data.get('password')
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'age': user.age,
            'grade': user.grade,
            'createdAt': user.created_at.isoformat() if user.created_at else None
        })
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route('/users', methods=['GET'])
def get_all_users():
    session = get_session()
    try:
        users = session.query(User).all()
        return jsonify([
            {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'age': user.age,
                'grade': user.grade,
                'createdAt': user.created_at.isoformat() if user.created_at else None
            }
            for user in users
        ])
    finally:
        session.close()

@app.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    session = get_session()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'age': user.age,
            'grade': user.grade,
            'createdAt': user.created_at.isoformat() if user.created_at else None
        })
    finally:
        session.close()

@app.route('/chats', methods=['POST'])
def create_chat():
    session = get_session()
    try:
        data = request.json
        chat = Chat(
            title=data['title'],
            user_id=data['userId']
        )
        session.add(chat)
        session.commit()
        session.refresh(chat)
        
        return jsonify({
            'id': chat.id,
            'title': chat.title,
            'userId': chat.user_id,
            'createdAt': chat.created_at.isoformat() if chat.created_at else None,
            'updatedAt': chat.updated_at.isoformat() if chat.updated_at else None
        })
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route('/chats', methods=['GET'])
def get_chats():
    session = get_session()
    try:
        user_id = request.args.get('userId')
        if user_id:
            chats = session.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.updated_at.desc()).all()
        else:
            chats = session.query(Chat).order_by(Chat.updated_at.desc()).all()
        
        return jsonify([
            {
                'id': chat.id,
                'title': chat.title,
                'userId': chat.user_id,
                'createdAt': chat.created_at.isoformat() if chat.created_at else None,
                'updatedAt': chat.updated_at.isoformat() if chat.updated_at else None
            }
            for chat in chats
        ])
    finally:
        session.close()

@app.route('/sol/standards', methods=['POST'])
def create_sol_standard():
    session = get_session()
    try:
        data = request.json
        standard = SolStandard(
            id=data['id'],
            subject=data['subject'],
            grade=data['grade'],
            strand=data['strand'],
            description=data['description']
        )
        session.add(standard)
        session.commit()
        session.refresh(standard)
        
        return jsonify({
            'id': standard.id,
            'subject': standard.subject,
            'grade': standard.grade,
            'strand': standard.strand,
            'description': standard.description,
            'createdAt': standard.created_at.isoformat() if standard.created_at else None
        })
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route('/sol/standards', methods=['GET'])
def get_sol_standards():
    session = get_session()
    try:
        subject = request.args.get('subject')
        grade = request.args.get('grade')
        
        query = session.query(SolStandard)
        if subject:
            query = query.filter(SolStandard.subject == subject)
        if grade:
            query = query.filter(SolStandard.grade == grade)
        
        standards = query.all()
        return jsonify([
            {
                'id': standard.id,
                'subject': standard.subject,
                'grade': standard.grade,
                'strand': standard.strand,
                'description': standard.description,
                'createdAt': standard.created_at.isoformat() if standard.created_at else None
            }
            for standard in standards
        ])
    finally:
        session.close()

if __name__ == '__main__':
    init_database()
    print("SQLAlchemy database service starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)