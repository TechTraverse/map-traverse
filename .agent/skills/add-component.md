---
name: Add New Component
description: Create a new UI component in the map-ui-lib package following project standards.
---

# Add New Component

## Context
This skill helps you create a new UI component in `packages/map-ui-lib` that adheres to the project's strict architectural guidelines:
- **No MapLibre dependencies**
- **Controlled component pattern**
- **TailwindCSS with `mapui:` prefix**
- **Storybook story included**

## Key Steps

1.  **Create Component Directory**:
    -   Location: `packages/map-ui-lib/src/components/[ComponentName]/`
    -   Files: `index.ts`, `[ComponentName].tsx`

2.  **Implement Component**:
    -   Use `mapui:` prefix for all Tailwind classes.
    -   Ensure it is fully controlled (props for data, callbacks for actions).
    -   Add `className` prop for consumer overrides.

3.  **Add Story**:
    -   Create `[ComponentName].stories.tsx` in the component directory.
    -   Add a default story and interactive variants.

4.  **Export Component**:
    -   Export from `packages/map-ui-lib/src/components/[ComponentName]/index.ts`.
    -   Export from `packages/map-ui-lib/src/main.ts`.

5.  **Add to Vite Config** (Optional but recommended):
    -   Add an entry point in `packages/map-ui-lib/vite.config.ts` if tree-shaking optimization is desired immediately.

## Example Implementation

```tsx
// packages/map-ui-lib/src/components/MyComponent/MyComponent.tsx
import React from 'react';

export interface MyComponentProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  label,
  isActive,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`mapui:px-4 mapui:py-2 mapui:rounded ${
        isActive ? 'mapui:bg-blue-500 mapui:text-white' : 'mapui:bg-gray-200'
      } ${className}`}
    >
      {label}
    </button>
  );
};
```
