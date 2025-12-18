# UI Implementation Skill

## Description
Guidelines for implementing UI components in LP Builder Pro using Tailwind and shadcn/ui.

## Usage
When the user asks to "create a component" or "implement UI", refer to this skill.

## Steps
1.  **Check Design Tokens**: Ensure colors/fonts match `tailwind.config.ts`.
2.  **Use shadcn/ui**: Check if a base component exists in `components/ui`. If not, suggest adding it.
3.  **Responsiveness**: Always implement mobile-first (`class`, `md:class`, `lg:class`).
4.  **Accessibility**: Ensure proper ARIA labels and keyboard navigation.
5.  **State**: If local state is complex, use a custom hook. If global, use the Zustand store.

## Example
```tsx
import { Button } from "@/components/ui/button"

export function ActionButton({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <Button variant="default" size="lg" onClick={onClick} className="hover:scale-105 transition-transform">
      {label}
    </Button>
  )
}
```





