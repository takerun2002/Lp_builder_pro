# Coding Conventions

## General Principles
- **"Strong Designers First"**: UI should be simple, respecting professional workflows.
- **Component Design**: Use atomic design principles where appropriate, but prioritize practicality.
- **Type Safety**: Strict TypeScript usage.

## Styling
- Use Tailwind CSS for utility-first styling.
- Define global design tokens (colors, fonts) in `tailwind.config.ts`.
- Use `shadcn/ui` for base components, customized via `components.json`.

## State Management
- Use Zustand for global client state (e.g., current project, selected tool).
- Keep server state management simple (SQLite).

## File Structure (Suggested)
- `app/`: Next.js App Router pages
- `components/`: React components (ui/, features/, shared/)
- `lib/`: Utility functions, API clients
- `hooks/`: Custom React hooks
- `store/`: Zustand stores
- `db/`: Database schema and migrations



