# Overview

StudyBuddy AI is a child-safe educational chat application designed for students aged 12 and under. The platform provides a secure learning environment where children can ask homework questions and receive educational assistance through an AI-powered chat interface. The application emphasizes safety with built-in content filtering and focuses exclusively on educational content across all school subjects.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side is built with **React 18** using **TypeScript** and follows a modern component-based architecture:

- **Routing**: Uses `wouter` for lightweight client-side routing
- **State Management**: Leverages React Query (`@tanstack/react-query`) for server state management and caching
- **UI Framework**: Implements Shadcn/UI components built on Radix UI primitives for accessibility
- **Styling**: Uses Tailwind CSS with custom design tokens and CSS variables for theming
- **Build System**: Vite for fast development and optimized production builds

## Backend Architecture

The server follows a **REST API** pattern built with **Express.js**:

- **Framework**: Express.js with TypeScript for type safety
- **Database Layer**: Drizzle ORM for type-safe database operations
- **Storage Strategy**: Implements an abstraction layer (`IStorage` interface) with in-memory storage for development
- **API Design**: RESTful endpoints for chat and message management
- **Request Logging**: Custom middleware for API request/response logging

## Data Storage Solutions

- **Database**: Configured for PostgreSQL using Drizzle ORM with planned Neon Database integration
- **Schema Design**: Three main entities:
  - Users (id, username, password)
  - Chats (id, title, userId, timestamps)  
  - Messages (id, chatId, content, role, timestamp)
- **Migration System**: Drizzle Kit handles schema migrations and database management

## Authentication and Authorization

The architecture includes user schema preparation but currently operates without active authentication, allowing for easy testing and development. The system is designed to accommodate future authentication integration.

## Safety and Content Filtering

- **AI Safety Layer**: Implements child-specific system prompts for OpenAI GPT-4o
- **Content Filtering**: Built-in safety mechanisms to ensure educational focus
- **Input Validation**: Zod schema validation for all API requests
- **Educational Scope**: Restricts conversations to homework and academic topics

## Development and Build Pipeline

- **Development**: Hot reload with Vite and Express integration
- **Type Safety**: Comprehensive TypeScript configuration across client and server
- **Code Organization**: Monorepo structure with shared types and schemas
- **Build Process**: Separate client (Vite) and server (esbuild) build processes

# External Dependencies

## Core Framework Dependencies

- **React Ecosystem**: React 18, React DOM, React Query for state management
- **Backend**: Express.js with TypeScript support
- **Database**: Drizzle ORM with PostgreSQL dialect, Neon Database serverless driver
- **Build Tools**: Vite for frontend, esbuild for backend, TypeScript compiler

## UI and Design System

- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icons and Font Awesome integration
- **Form Handling**: React Hook Form with Hookform resolvers

## AI Integration

- **OpenAI API**: GPT-4o model for educational chat responses
- **Safety Features**: Custom system prompts and content filtering for child safety

## Development Tools

- **Type Validation**: Zod for runtime type checking and schema validation
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Date Handling**: date-fns for date manipulation and formatting
- **Development Environment**: Replit-specific plugins for enhanced development experience

## Database and Infrastructure

- **Primary Database**: PostgreSQL via Neon Database serverless platform
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL-backed session management