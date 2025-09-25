# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload (frontend on Vite, backend on tsx)
- `npm run build` - Build both client (Vite) and server (esbuild) for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking across the project
- `npm run db:push` - Deploy database schema changes using Drizzle Kit

## Project Architecture

### Monorepo Structure
- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared TypeScript types and schemas
- `attached_assets/` - Static assets for the application

### Frontend Architecture (React + TypeScript)
- **Framework**: React 18 with TypeScript and Vite build system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (`@tanstack/react-query`) for server state
- **UI Components**: Shadcn/UI built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Key Components**: Navigation, ChatSidebar, MessageInput, UserSelector, QuizSelector

### Backend Architecture (Express + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations
- **API Pattern**: RESTful endpoints with comprehensive request/response logging
- **ORM Layer**: Custom SQLAlchemy-inspired models in `server/orm-models.ts`
- **Authentication**: Local storage-based sessions with user profiles

### Database Schema (PostgreSQL)
- `users` - Student profiles (name, email, age, grade)
- `chats` - Conversation threads with user relationships
- `messages` - Individual chat messages with role and content
- `sol_standards` - Virginia Standards of Learning definitions
- `assessment_items` - AI-generated questions with metadata
- `assessment_attempts` - Student responses with scoring

### Path Aliases
- `@/` - Points to `client/src/`
- `@shared/` - Points to `shared/` directory
- `@assets/` - Points to `attached_assets/` directory

## AI Integration

This application integrates OpenAI GPT-4o with child-safety features:
- **Educational Focus**: AI responses limited to homework and academic assistance
- **Personalized Responses**: AI adapts to user's age, grade, and name
- **Content Safety**: Built-in filtering ensures child-appropriate interactions
- **Multimodal Support**: Image analysis for visual homework assistance

## Key Development Patterns

### Database Operations
Use the ORM layer instead of direct storage calls:
```typescript
// Access ORM through server/orm-models.ts
const orm = createORMSession(storage);
const user = await orm.User.findById(userId);
const chats = await orm.Chat.findByUserId(userId);
```

### Type Safety
- All API endpoints use Zod schemas for validation (`shared/schema.ts`)
- Database operations are type-safe through Drizzle ORM
- Frontend components use TypeScript interfaces from shared schemas

### Dual-Mode Application
The app operates in two distinct modes:
1. **Chat Mode**: Conversational AI homework assistance
2. **SOL Assessment Mode**: Virginia Standards of Learning assessments

### Component Structure
- UI components follow Shadcn/UI patterns with Radix primitives
- Custom components in `client/src/components/`
- Reusable utilities in `client/src/lib/`

## Environment Configuration

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o
- `SENDGRID_API_KEY` - SendGrid for email functionality (optional)
- `NODE_ENV` - Environment mode (development/production)

## Docker Deployment

The application is optimized for Docker deployment, particularly ARM architecture (Raspberry Pi):
- Multi-stage Docker build in `Dockerfile`
- Docker Compose setup with PostgreSQL
- Health checks and restart policies configured
- See `DOCKER_DEPLOYMENT.md` for detailed deployment instructions

## Database Migrations

- Use Drizzle Kit for schema management: `npm run db:push`
- Schema definitions in `shared/schema.ts`
- Migration history in `./migrations/` directory
- Database configuration in `drizzle.config.ts`

## File Upload and Storage

- Google Cloud Storage integration for image uploads
- File upload UI components using Uppy.js
- Object storage abstraction in `server/objectStorage.ts`

## Important Notes

- No existing linting or testing commands in package.json - consider adding these for code quality
- The application emphasizes child safety with content filtering throughout
- Image uploads support homework assistance with multimodal AI capabilities
- SOL assessments feature question generation aligned to Virginia educational standards