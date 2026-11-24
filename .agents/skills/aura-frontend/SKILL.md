---
name: aura-frontend
description: >-
  Work with the Aura Fashion React 19 + Vite frontend. Use when the user asks to
  create UI components, update styles, fix frontend bugs, run ESLint, or verify
  the frontend build in Web_aura/.
---

# Aura Fashion Frontend Workflow

This skill guides you through developing, modifying, and testing the Aura Fashion frontend (`Web_aura/`).

## Setup and Commands

All frontend operations run inside the `Web_aura` directory:

```bash
cd Web_aura
npm run dev      # Start Vite local development server
npm run lint     # Run ESLint to verify code quality
npm run build    # Build production bundle to dist/
npm run preview  # Preview production build locally
```

## Creating a New Component

1. Create a folder inside `Web_aura/src/components/<ComponentName>/`.
2. Add `<ComponentName>.jsx` and `<ComponentName>.css`.
3. Import icons from `lucide-react` when visual icons are required.
4. Connect API calls using `Web_aura/src/utils/api.js`.

## Verification Steps

Always verify frontend changes:
1. Run `npm run lint` inside `Web_aura/`.
2. Fix any unused imports or React Hook dependency warnings.
3. Run `npm run build` to confirm there are no JSX compilation or asset bundle errors.
