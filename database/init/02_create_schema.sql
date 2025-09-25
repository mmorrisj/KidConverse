-- Create StudyBuddy AI database schema
-- This creates all the tables needed for SOL processing

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    age INTEGER NOT NULL,
    grade TEXT NOT NULL,
    password TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    user_id VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    chat_id VARCHAR NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- SOL Standards table (enhanced for Python processing)
CREATE TABLE IF NOT EXISTS sol_standards (
    id TEXT PRIMARY KEY,
    standard_code TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    strand TEXT NOT NULL,
    title TEXT,
    description TEXT NOT NULL,
    sol_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assessment Items table
CREATE TABLE IF NOT EXISTS assessment_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sol_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('MCQ', 'FIB', 'CR')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    dok INTEGER NOT NULL CHECK (dok BETWEEN 1 AND 4),
    stem TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sol_id) REFERENCES sol_standards(id) ON DELETE CASCADE
);

-- Assessment Attempts table
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR NOT NULL,
    item_id VARCHAR NOT NULL,
    sol_id TEXT NOT NULL,
    user_response JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL,
    feedback TEXT,
    duration_seconds REAL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES assessment_items(id) ON DELETE CASCADE,
    FOREIGN KEY (sol_id) REFERENCES sol_standards(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_sol_standards_subject_grade ON sol_standards(subject, grade);
CREATE INDEX IF NOT EXISTS idx_sol_standards_strand ON sol_standards(strand);
CREATE INDEX IF NOT EXISTS idx_sol_standards_code ON sol_standards(standard_code);
CREATE INDEX IF NOT EXISTS idx_assessment_items_sol_id ON assessment_items(sol_id);
CREATE INDEX IF NOT EXISTS idx_assessment_items_difficulty ON assessment_items(difficulty, item_type);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_id ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_sol_id ON assessment_attempts(sol_id);

-- GIN index for JSON metadata searches
CREATE INDEX IF NOT EXISTS idx_sol_metadata_gin ON sol_standards USING GIN (sol_metadata);

SELECT 'StudyBuddy Development Database Schema Created' AS status;