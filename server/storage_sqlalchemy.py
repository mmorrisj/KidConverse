"""
SQLAlchemy-based storage implementation for StudyBuddy AI
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime
import json

from .models import (
    db_manager, User, Chat, Message, SolStandard, 
    AssessmentItem, AssessmentAttempt, MasteryProgress
)

class SQLAlchemyStorage:
    """Storage implementation using SQLAlchemy ORM"""
    
    def __init__(self):
        self.db_manager = db_manager
    
    def get_session(self) -> Session:
        """Get a database session"""
        return self.db_manager.get_session()
    
    def init_database(self):
        """Initialize database schema"""
        self.db_manager.create_tables()
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        session = self.get_session()
        try:
            user = User(
                name=user_data['name'],
                email=user_data['email'],
                age=user_data['age'],
                grade=user_data['grade'],
                password=user_data.get('password')
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            return {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'age': user.age,
                'grade': user.grade,
                'created_at': user.created_at
            }
        finally:
            session.close()
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        session = self.get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            return {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'age': user.age,
                'grade': user.grade,
                'created_at': user.created_at
            }
        finally:
            session.close()
    
    async def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        session = self.get_session()
        try:
            users = session.query(User).all()
            return [
                {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'age': user.age,
                    'grade': user.grade,
                    'created_at': user.created_at
                }
                for user in users
            ]
        finally:
            session.close()
    
    # Chat operations
    async def create_chat(self, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new chat"""
        session = self.get_session()
        try:
            chat = Chat(
                title=chat_data['title'],
                user_id=chat_data['userId']
            )
            session.add(chat)
            session.commit()
            session.refresh(chat)
            
            return {
                'id': chat.id,
                'title': chat.title,
                'userId': chat.user_id,
                'created_at': chat.created_at,
                'updated_at': chat.updated_at
            }
        finally:
            session.close()
    
    async def get_chats_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all chats for a user"""
        session = self.get_session()
        try:
            chats = session.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.updated_at.desc()).all()
            return [
                {
                    'id': chat.id,
                    'title': chat.title,
                    'userId': chat.user_id,
                    'created_at': chat.created_at,
                    'updated_at': chat.updated_at
                }
                for chat in chats
            ]
        finally:
            session.close()
    
    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get chat by ID"""
        session = self.get_session()
        try:
            chat = session.query(Chat).filter(Chat.id == chat_id).first()
            if not chat:
                return None
            
            return {
                'id': chat.id,
                'title': chat.title,
                'userId': chat.user_id,
                'created_at': chat.created_at,
                'updated_at': chat.updated_at
            }
        finally:
            session.close()
    
    async def update_chat(self, chat_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update chat"""
        session = self.get_session()
        try:
            chat = session.query(Chat).filter(Chat.id == chat_id).first()
            if not chat:
                return None
            
            for key, value in updates.items():
                if hasattr(chat, key):
                    setattr(chat, key, value)
            
            session.commit()
            session.refresh(chat)
            
            return {
                'id': chat.id,
                'title': chat.title,
                'userId': chat.user_id,
                'created_at': chat.created_at,
                'updated_at': chat.updated_at
            }
        finally:
            session.close()
    
    async def delete_chat(self, chat_id: str) -> bool:
        """Delete chat and all its messages"""
        session = self.get_session()
        try:
            chat = session.query(Chat).filter(Chat.id == chat_id).first()
            if not chat:
                return False
            
            session.delete(chat)
            session.commit()
            return True
        finally:
            session.close()
    
    # Message operations
    async def create_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new message"""
        session = self.get_session()
        try:
            message = Message(
                chat_id=message_data['chatId'],
                role=message_data['role'],
                content=message_data['content']
            )
            session.add(message)
            session.commit()
            session.refresh(message)
            
            return {
                'id': message.id,
                'chatId': message.chat_id,
                'role': message.role,
                'content': message.content,
                'timestamp': message.created_at
            }
        finally:
            session.close()
    
    async def get_messages_by_chat(self, chat_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a chat"""
        session = self.get_session()
        try:
            messages = session.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
            return [
                {
                    'id': message.id,
                    'chatId': message.chat_id,
                    'role': message.role,
                    'content': message.content,
                    'timestamp': message.created_at
                }
                for message in messages
            ]
        finally:
            session.close()
    
    # SOL Standards operations
    async def create_sol_standard(self, standard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new SOL standard"""
        session = self.get_session()
        try:
            standard = SolStandard(
                id=standard_data['id'],
                subject=standard_data['subject'],
                grade=standard_data['grade'],
                strand=standard_data['strand'],
                description=standard_data['description']
            )
            session.add(standard)
            session.commit()
            session.refresh(standard)
            
            return {
                'id': standard.id,
                'subject': standard.subject,
                'grade': standard.grade,
                'strand': standard.strand,
                'description': standard.description,
                'created_at': standard.created_at
            }
        finally:
            session.close()
    
    async def get_sol_standards_by_subject_grade(self, subject: str, grade: str) -> List[Dict[str, Any]]:
        """Get SOL standards by subject and grade"""
        session = self.get_session()
        try:
            standards = session.query(SolStandard).filter(
                and_(SolStandard.subject == subject, SolStandard.grade == grade)
            ).all()
            
            return [
                {
                    'id': standard.id,
                    'subject': standard.subject,
                    'grade': standard.grade,
                    'strand': standard.strand,
                    'description': standard.description,
                    'created_at': standard.created_at
                }
                for standard in standards
            ]
        finally:
            session.close()
    
    async def get_sol_standard(self, standard_id: str) -> Optional[Dict[str, Any]]:
        """Get SOL standard by ID"""
        session = self.get_session()
        try:
            standard = session.query(SolStandard).filter(SolStandard.id == standard_id).first()
            if not standard:
                return None
            
            return {
                'id': standard.id,
                'subject': standard.subject,
                'grade': standard.grade,
                'strand': standard.strand,
                'description': standard.description,
                'created_at': standard.created_at
            }
        finally:
            session.close()
    
    # Assessment Item operations
    async def create_assessment_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new assessment item"""
        session = self.get_session()
        try:
            item = AssessmentItem(
                sol_id=item_data['solId'],
                item_type=item_data['itemType'],
                difficulty=item_data['difficulty'],
                dok=item_data['dok'],
                stem=item_data['stem'],
                payload=item_data['payload']
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            
            return {
                'id': item.id,
                'solId': item.sol_id,
                'itemType': item.item_type,
                'difficulty': item.difficulty,
                'dok': item.dok,
                'stem': item.stem,
                'payload': item.payload,
                'createdAt': item.created_at
            }
        finally:
            session.close()
    
    async def get_assessment_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get assessment item by ID"""
        session = self.get_session()
        try:
            item = session.query(AssessmentItem).filter(AssessmentItem.id == item_id).first()
            if not item:
                return None
            
            return {
                'id': item.id,
                'solId': item.sol_id,
                'itemType': item.item_type,
                'difficulty': item.difficulty,
                'dok': item.dok,
                'stem': item.stem,
                'payload': item.payload,
                'createdAt': item.created_at
            }
        finally:
            session.close()
    
    # Assessment Attempt operations
    async def create_assessment_attempt(self, attempt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new assessment attempt"""
        session = self.get_session()
        try:
            attempt = AssessmentAttempt(
                user_id=attempt_data['userId'],
                item_id=attempt_data['itemId'],
                sol_id=attempt_data['solId'],
                user_response=attempt_data['userResponse'],
                is_correct=attempt_data['isCorrect'],
                score=attempt_data['score'],
                max_score=attempt_data['maxScore'],
                feedback=attempt_data.get('feedback'),
                duration_seconds=attempt_data.get('durationSeconds')
            )
            session.add(attempt)
            session.commit()
            session.refresh(attempt)
            
            return {
                'id': attempt.id,
                'userId': attempt.user_id,
                'itemId': attempt.item_id,
                'solId': attempt.sol_id,
                'userResponse': attempt.user_response,
                'isCorrect': attempt.is_correct,
                'score': attempt.score,
                'maxScore': attempt.max_score,
                'feedback': attempt.feedback,
                'durationSeconds': attempt.duration_seconds,
                'createdAt': attempt.created_at
            }
        finally:
            session.close()
    
    async def get_user_mastery_data(self, user_id: str) -> Dict[str, Any]:
        """Get mastery tracking data for a user"""
        session = self.get_session()
        try:
            # Get recent attempts grouped by SOL standard
            attempts = session.query(AssessmentAttempt).filter(
                AssessmentAttempt.user_id == user_id
            ).order_by(AssessmentAttempt.created_at.desc()).all()
            
            mastery_data = {}
            
            for attempt in attempts:
                sol_id = attempt.sol_id
                if sol_id not in mastery_data:
                    mastery_data[sol_id] = {
                        'ewma': 0.0,
                        'count': 0,
                        'lastAttempt': None
                    }
                
                # Update EWMA (Exponentially Weighted Moving Average)
                # Alpha = 0.3 for weighting recent attempts more heavily
                alpha = 0.3
                if mastery_data[sol_id]['count'] == 0:
                    mastery_data[sol_id]['ewma'] = attempt.score / attempt.max_score
                else:
                    normalized_score = attempt.score / attempt.max_score
                    mastery_data[sol_id]['ewma'] = (
                        alpha * normalized_score + 
                        (1 - alpha) * mastery_data[sol_id]['ewma']
                    )
                
                mastery_data[sol_id]['count'] += 1
                if (not mastery_data[sol_id]['lastAttempt'] or 
                    attempt.created_at > mastery_data[sol_id]['lastAttempt']):
                    mastery_data[sol_id]['lastAttempt'] = attempt.created_at
            
            return mastery_data
        finally:
            session.close()