-- Create necessary PostgreSQL extensions for StudyBuddy AI
-- This script runs automatically when the dev database starts

-- UUID generation for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- JSON operations (useful for SOL metadata)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Text search capabilities
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Add a startup message
SELECT 'StudyBuddy Development Database Extensions Loaded' AS status;