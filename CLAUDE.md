# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudyBuddy AI (KidConverse) is a child-safe educational chat application for students aged 12 and under. It provides AI-powered homework assistance with built-in content filtering and safety measures.

## Common Development Commands

### Development
```bash
npm run dev          # Start development server with hot reload
npm run check        # Type check with TypeScript
npm run build        # Build production version (client + server)
npm run start        # Start production server
```

### Database Management
```bash
npm run db:push      # Push schema changes to database (Drizzle)
```

### Docker Commands
```bash
docker-compose up -d                    # Start services in background
docker-compose exec studybuddy npm run db:push  # Initialize database
docker-compose logs studybuddy         # View application logs
docker-compose logs postgres           # View database logs
```

## Architecture Overview

### Full-Stack Structure
- **Frontend**: React 18 + TypeScript + Vite (in `client/` directory)
- **Backend**: Express.js + TypeScript (in `server/` directory)
- **Database**: PostgreSQL with Drizzle ORM
- **Shared**: Common types and schemas (in `shared/` directory)

### Key Architectural Patterns

**Client-Server Separation**: The application uses a clear separation between client and server code:
- Client builds to `dist/public/`
- Server builds to `dist/`
- Shared types in `shared/schema.ts` ensure type safety across boundaries

**REST API with Server-Sent Events**: The `/api/chats/:chatId/messages` endpoint uses SSE for real-time AI response streaming, allowing typewriter-effect display of AI responses.

**Storage Abstraction**: Server uses an `IStorage` interface (implemented in `server/storage.ts`) that abstracts database operations for users, chats, and messages.

**Route Structure**: All API endpoints are in `server/routes.ts` with Express middleware for logging, health checks, and error handling.

### Database Schema (Drizzle ORM)
Located in `shared/schema.ts`:
- `users`: id, name, email, age, grade, createdAt
- `chats`: id, title, userId, createdAt, updatedAt
- `messages`: id, chatId, content, role, imageUrl, createdAt

### Frontend Architecture
- **Routing**: Uses `wouter` for client-side routing
- **State Management**: TanStack Query for server state + localStorage for user sessions
- **UI Components**: Shadcn/UI built on Radix UI primitives
- **Main Components**:
  - `UserSelector`: User account selection/switching
  - `ChatSidebar`: Chat history and management
  - `ChatMessages`: Message display with streaming support
  - `MessageInput`: Message composition with image upload

### OpenAI Integration
- **Model**: GPT-4o with child-specific system prompts
- **Safety**: Content filtering via `filterUserInput()` in `server/services/openai.ts`
- **Multimodal**: Image analysis support for homework assistance
- **Personalization**: AI responses adapt based on user age/grade

### File Upload & Object Storage
- Image uploads handled through `ObjectStorageService` in `server/objectStorage.ts`
- Upload URLs generated via `/api/objects/upload`
- Objects served through `/objects/:objectPath(*)` route

## Development Environment

### Vite Configuration
- Path aliases: `@` → `client/src`, `@shared` → `shared`
- Development proxy for API routes
- Replit-specific plugins for cloud development

### Environment Variables
Required for development:
```env
DATABASE_URL=postgresql://...     # PostgreSQL connection
OPENAI_API_KEY=sk-...            # OpenAI API access
SENDGRID_API_KEY=SG.             # Email service (optional)
NODE_ENV=development             # Environment mode
```

### Docker Deployment
Multi-stage Dockerfile optimized for ARM64 (Raspberry Pi):
- Production image runs as non-root user `studybuddy`
- Health check on `/health` endpoint
- Serves on port 5000

## Testing and Quality

### Type Safety
- Comprehensive TypeScript configuration
- Zod schemas for runtime validation
- Shared types between client/server

### Code Organization
- Monorepo structure with clear separation of concerns
- Centralized error handling in Express middleware
- Consistent naming conventions for API endpoints

## Safety and Content Filtering

### Child Safety Features
- AI content filtering before responses
- Educational scope restriction
- Age-appropriate language adaptation
- Input validation and sanitization

### Security Considerations
- No traditional authentication (localStorage-based user sessions)
- Input validation with Zod schemas
- Content filtering for child safety
- Health check endpoints for monitoring

## Recent Technical Debt and Known Issues

### Resolved Issues
- User registration API routing (fixed in recent commits)
- Streaming response implementation for chat
- Database migration from in-memory to PostgreSQL
- Multi-user support with account switching

### Current Architecture Strengths
- Type-safe full-stack development
- Real-time chat with streaming responses
- Comprehensive Docker deployment setup
- Child-safe AI integration with content filtering