# Agent Instructions

## Development Approach
- **Test-Driven Development (TDD)**: We follow TDD strictly. Write tests before implementing features. Ensure comprehensive coverage for both frontend components and server-side logic.

## Primary Stack & Tools
Based on our setup, our core stack includes:
- **Frontend & Fullstack Framework**: **SvelteKit** (using TypeScript).
- **Database**: **PostgreSQL** (hosted via Neon/Serverless).
- **ORM**: **Drizzle ORM** for type-safe database queries and migrations.
- **Build Tool**: **Vite**.
- **Linting & Formatting**: ESLint and Prettier.

### When to use what:
- **SvelteKit (`src/routes`)**: Use for building user interfaces (`+page.svelte`), layouts (`+layout.svelte`), and handling server-side API requests (`+server.ts` or `+page.server.ts`).
- **PostgreSQL**: Use as the single source of truth for structured application data.
- **Drizzle ORM**: Use for defining database schemas (`src/lib/server/db/schema.ts`), running queries, and managing migrations. Avoid raw SQL strings unless absolutely necessary for complex queries.
- **TypeScript**: Use everywhere to enforce type safety across the frontend and backend.

## Design & Aesthetics
- **Style Guidelines**: Keep it simple, clean, and modern. **No glassmorphism** or overly decorative styles.
- **Mobile-First Design**: Always design layouts for mobile screens first, using responsive queries to scale up to larger displays.
- **CSS**: Use standard CSS/Svelte-scoped styling. Keep color palettes curated and minimalistic.

## Workspace & File Organization Boundaries
- **Generated Code**: All generated source code and project files must be kept under the `web/` folder as much as possible.
- **Documentation**: Any documentation files should be placed under a `docs/` folder.
- **Local Context**: Local files meant only for local context should be kept under a `.local/` folder. This folder is gitignored to avoid pushing sensitive or temporary context files.

## Project Structure
To minimize token context utilization, the codebase folder structure is documented in a separate file. 
When needed, refer to: [.local/folder-structure.md](file:///C:/Users/BCS_Support/Documents/dev/POS-Dashboard-Template/web/.local/folder-structure.md).

## Suggestions for Future Inclusions
These have been moved to a separate file to keep the core instructions concise. 
Reference: [.local/future-suggestions.md](file:///C:/Users/BCS_Support/Documents/dev/POS-Dashboard-Template/web/.local/future-suggestions.md)
