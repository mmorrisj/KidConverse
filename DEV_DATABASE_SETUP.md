# Development Database Setup

This document explains how to set up and use a separate development database for SOL processing without affecting your production data.

## 🎯 Overview

**Production Database:**
- Docker container: Uses `kidconverse_pgdata` volume (your existing data)
- Port: 5439 (mapped from container 5432)
- Database: `studybuddy`
- Used by your main application

**Development Database:**
- Docker container: Uses `studybuddy_pgdata_dev` volume (separate data)
- Port: 5433 (mapped from container 5432)
- Database: `studybuddy_dev`
- Used for SOL processing development and testing

## 🚀 Quick Start

### 1. Test Setup
```bash
python test_dev_setup.py
```

### 2. Start Development Database
```bash
python dev_database.py start
```

### 3. Set Development Environment
```bash
export $(cat .env.development | xargs)
```

### 4. Test SOL Processing
```bash
python test_python_sol.py
```

## 📁 File Structure

```
KidConverse/
├── docker-compose.yml          # Production database
├── docker-compose.dev.yml      # Development database
├── .env                        # Production environment
├── .env.development           # Development environment
├── .env.test                  # Test environment
├── database/
│   └── init/
│       ├── 01_create_extensions.sql
│       ├── 02_create_schema.sql
│       └── 03_sample_data.sql
├── dev_database.py            # Database management CLI
└── test_dev_setup.py         # Setup verification
```

## 🛠️ Database Management Commands

### Basic Operations
```bash
# Start development database
python dev_database.py start

# Start with pgAdmin web interface
python dev_database.py start --with-pgadmin

# Stop development database
python dev_database.py stop

# Restart development database
python dev_database.py restart

# Check status
python dev_database.py status
```

### Data Management
```bash
# Reset database (destroys all data!)
python dev_database.py reset

# Create backup
python dev_database.py backup

# Restore from backup
python dev_database.py restore backup_dev_1234567890.sql

# Connect with psql
python dev_database.py connect

# View logs
python dev_database.py logs
```

## 🌍 Environment Management

### Switch to Development
```bash
export $(cat .env.development | xargs)
echo "Current database: $PGDATABASE on port $PGPORT"
```

### Switch to Production
```bash
export $(cat .env | xargs)
echo "Current database: $PGDATABASE on port $PGPORT"
```

### Switch to Test
```bash
export $(cat .env.test | xargs)
echo "Current database: $PGDATABASE on port $PGPORT"
```

## 🧪 SOL Processing Workflow

### 1. Start Development Environment
```bash
# Start database
python dev_database.py start

# Set environment
export $(cat .env.development | xargs)
```

### 2. Process SOL Documents
```bash
# Process a single document
python sol_cli.py process-file SOL/Documentation/3-2023-Approved-Math-SOL.docx

# Process all math documents
python sol_cli.py process-directory SOL/Documentation/ --math-only

# Check what's in database
python sol_cli.py validate

# Query specific standards
python sol_cli.py query mathematics 3
```

### 3. Test Multi-Grade Assessment
```bash
# Use the development database to test your adaptive assessment logic
python -c "
from sol_processor import SOLProcessor
processor = SOLProcessor()
stats = processor.get_database_stats()
print(f'Standards available: {stats[\"total_standards\"]}')
"
```

## 📊 Database Connections

### Development Database
- **Host:** localhost
- **Port:** 5433
- **Database:** studybuddy_dev
- **User:** devuser
- **Password:** devpassword
- **URL:** `postgresql://devuser:devpassword@localhost:5433/studybuddy_dev`

### Production Database (Unchanged)
- **Host:** localhost
- **Port:** 5439
- **Database:** studybuddy
- **User:** user
- **Password:** password
- **URL:** `postgresql://user:password@localhost:5439/studybuddy`

### pgAdmin (Optional)
- **URL:** http://localhost:8080
- **Email:** dev@studybuddy.com
- **Password:** devpassword

## 🔄 Development Workflow

### Daily Development
1. Start development database: `python dev_database.py start`
2. Set environment: `export $(cat .env.development | xargs)`
3. Work on SOL processing
4. Test changes: `python test_python_sol.py`
5. Process documents as needed

### Reset for Fresh Testing
1. Reset database: `python dev_database.py reset`
2. This gives you fresh schema with sample data

### Before Committing Code
1. Test with clean database: `python dev_database.py reset`
2. Run full test suite: `python test_python_sol.py`
3. Process a few sample documents to verify

## ⚠️ Important Notes

### Production Safety
- **Your production data is completely safe** - it uses a separate Docker volume
- Development database runs on port 5433, production on 5439
- Never mix environment variables between dev and production

### Data Persistence
- Development data persists across container restarts
- Use `reset` command to get a fresh start
- Use `backup` and `restore` for data management

### Port Conflicts
- Development: 5433
- Production: 5439 (your existing setup)
- Test: 5434 (if you set up test database)

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Check what's using the port
lsof -i :5433

# Stop development database
python dev_database.py stop
```

### "Database connection failed"
```bash
# Check database status
python dev_database.py status

# View logs
python dev_database.py logs

# Restart if needed
python dev_database.py restart
```

### "Environment variables not set"
```bash
# Verify environment
echo $DATABASE_URL
echo $PGDATABASE

# Set development environment
export $(cat .env.development | xargs)
```

### Sample Data Missing
```bash
# Reset to get fresh sample data
python dev_database.py reset
```

This setup gives you a completely isolated development environment for SOL processing while keeping your production data safe!