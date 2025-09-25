-- Insert sample data for development and testing
-- This helps you test SOL processing without starting from scratch

-- Sample users
INSERT INTO users (id, name, email, age, grade) VALUES
('dev-user-1', 'Alice Johnson', 'alice@example.com', 8, '3'),
('dev-user-2', 'Bob Smith', 'bob@example.com', 10, '5'),
('dev-user-3', 'Carol Williams', 'carol@example.com', 12, '7')
ON CONFLICT (id) DO NOTHING;

-- Sample SOL standards for testing
INSERT INTO sol_standards (id, standard_code, subject, grade, strand, title, description, sol_metadata) VALUES
(
    'mathematics-3-3.NS.1',
    '3.NS.1',
    'mathematics',
    '3',
    'Number and Number Sense',
    'Place Value Understanding',
    'The student will use place value understanding to read, write, and determine the place and value of each digit in a whole number, up to six digits, with and without models.',
    '{
        "sub_objectives": [
            {"code": "3.NS.1.a", "description": "Read and write six-digit whole numbers in standard form, expanded form, and word form."},
            {"code": "3.NS.1.b", "description": "Apply patterns within the base 10 system to determine and communicate the place and value of each digit."}
        ],
        "prerequisites": ["2.NS.1", "2.NS.2"],
        "connections": ["4.NS.1"],
        "key_terms": ["place value", "standard form", "expanded form", "digit"],
        "difficulty": "grade-level",
        "cognitive_complexity": "skill",
        "processed_from": "Development Sample Data",
        "processed_at": "2024-01-15T10:00:00Z"
    }'
),
(
    'mathematics-3-3.CE.1',
    '3.CE.1',
    'mathematics',
    '3',
    'Computation and Estimation',
    'Addition and Subtraction',
    'The student will estimate, represent, solve, and justify solutions to single-step and multistep problems using addition and subtraction with whole numbers where addends and minuends do not exceed 1,000.',
    '{
        "sub_objectives": [
            {"code": "3.CE.1.a", "description": "Determine and justify whether an estimate or an exact answer is appropriate when solving contextual problems."},
            {"code": "3.CE.1.b", "description": "Apply strategies to estimate a solution for addition or subtraction problems where addends/minuends do not exceed 1,000."}
        ],
        "prerequisites": ["2.CE.1", "2.CE.2"],
        "connections": ["4.CE.1"],
        "key_terms": ["estimate", "addition", "subtraction", "regrouping"],
        "difficulty": "grade-level",
        "cognitive_complexity": "skill",
        "processed_from": "Development Sample Data",
        "processed_at": "2024-01-15T10:00:00Z"
    }'
),
(
    'mathematics-4-4.NS.1',
    '4.NS.1',
    'mathematics',
    '4',
    'Number and Number Sense',
    'Extended Place Value',
    'The student will demonstrate an understanding of place value through millions and thousandths.',
    '{
        "sub_objectives": [
            {"code": "4.NS.1.a", "description": "Read and write numbers through millions using numerals, number names, and expanded form."},
            {"code": "4.NS.1.b", "description": "Compare and order numbers through millions."}
        ],
        "prerequisites": ["3.NS.1", "3.NS.2"],
        "connections": ["5.NS.1"],
        "key_terms": ["millions", "thousandths", "expanded form", "compare", "order"],
        "difficulty": "grade-level",
        "cognitive_complexity": "skill",
        "processed_from": "Development Sample Data",
        "processed_at": "2024-01-15T10:00:00Z"
    }'
)
ON CONFLICT (id) DO NOTHING;

-- Sample chats
INSERT INTO chats (id, title, user_id) VALUES
('dev-chat-1', 'Math Homework Help', 'dev-user-1'),
('dev-chat-2', 'Science Questions', 'dev-user-2'),
('dev-chat-3', 'Reading Comprehension', 'dev-user-3')
ON CONFLICT (id) DO NOTHING;

-- Sample messages
INSERT INTO messages (chat_id, role, content) VALUES
('dev-chat-1', 'user', 'Can you help me understand place value?'),
('dev-chat-1', 'assistant', 'Of course! Place value tells us the value of a digit based on its position in a number. For example, in the number 345, the 3 is in the hundreds place, so it represents 300.'),
('dev-chat-2', 'user', 'What is the water cycle?'),
('dev-chat-2', 'assistant', 'The water cycle is how water moves around Earth through evaporation, condensation, and precipitation. Water evaporates from oceans and lakes, forms clouds, and then falls as rain or snow.');

-- Sample assessment item
INSERT INTO assessment_items (id, sol_id, item_type, difficulty, dok, stem, payload) VALUES
(
    'dev-item-1',
    'mathematics-3-3.NS.1',
    'MCQ',
    'medium',
    2,
    'What is the value of the digit 5 in the number 3,527?',
    '{
        "options": ["5", "50", "500", "5,000"],
        "correct_answer": "500",
        "explanation": "The digit 5 is in the hundreds place, so its value is 500."
    }'
)
ON CONFLICT (id) DO NOTHING;

-- Sample assessment attempt
INSERT INTO assessment_attempts (user_id, item_id, sol_id, user_response, is_correct, score, max_score) VALUES
('dev-user-1', 'dev-item-1', 'mathematics-3-3.NS.1', '{"selected": "500"}', true, 1.0, 1.0);

SELECT 'StudyBuddy Development Sample Data Loaded' AS status;