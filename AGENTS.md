# Aura Fashion - Agent Guidelines & Repository Rules

Welcome to the **Aura Fashion** repository. All autonomous agents and developers working in this workspace must follow the guidelines and architecture rules defined below.

## 1. Project Architecture Overview

Aura Fashion is a full-stack fashion eCommerce application organized into two core subdirectories:

- **`Web_aura/`** (Frontend):
  - Framework: React 19 + Vite 8
  - UI & Icons: Lucide React (`lucide-react`)
  - Linter: ESLint with React Hooks and React Refresh plugins
  - Styling: Component-scoped CSS files matching JSX component names
  - Structure:
    - `src/components/`: Modular reusable UI components (e.g., `DauTrang`, `Banner`, `GioHangMini`, `SanPhamTieuBieu`)
    - `src/page/`: Application and Admin pages (`page/admin/AdminProducts.jsx`, etc.)
    - `src/utils/api.js`: Centralized Axios/fetch API utility
    - `src/data/`: Mock data and static definitions (`duLieu.js`)

- **`server/`** (Backend):
  - Runtime & Framework: Node.js (ES modules / CommonJS) + Express 5
  - Database: MySQL with `mysql2` driver (connection pool configured in `db.js`)
  - Authentication: JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` password hashing
  - Uploads: `multer` middleware
  - Structure:
    - `controllers/`: Request handling and business logic
    - `routes/`: Express route definitions
    - `middleware/`: Auth verification and input validation (`middleware/auth.js`)
    - `seedAdmin.js`, `seedTemplates.js`: Database seeding scripts

---

## 2. Frontend Development Rules (`Web_aura`)

1. **Component Structure**:
   - Keep each component in its dedicated folder under `src/components/<ComponentName>/` with paired `<ComponentName>.jsx` and `<ComponentName>.css`.
   - Admin pages are grouped under `src/page/admin/` with stylesheets under `src/page/css/`.
2. **React 19 Best Practices**:
   - Prefer functional components and standard React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
   - Do not mutate state directly; always create fresh copies.
   - Clean up event listeners and timers in `useEffect` return functions.
3. **API Integration**:
   - Route all backend requests through `src/utils/api.js` to ensure consistent base URLs and authorization header handling.
4. **Code Quality & Linting**:
   - Before completing tasks, run `npm run lint` from `Web_aura/` and ensure zero errors or unhandled warnings.
   - Run `npm run build` to verify production build integrity.

---

## 3. Backend Development Rules (`server`)

1. **Security & SQL Injection Prevention**:
   - NEVER concatenate raw user input into SQL queries. Always use prepared statements / parameterized queries via `mysql2` (e.g., `db.query('SELECT * FROM products WHERE id = ?', [id])`).
   - Store passwords hashed using `bcryptjs` with appropriate salt rounds.
   - Secure admin routes using `middleware/auth.js` to verify token authenticity and role permissions.
2. **Environment Variables**:
   - Sensitive credentials (DB host, username, password, JWT secret) must reside in `server/.env`.
   - Never commit actual production secrets to Git.
3. **Error Handling & Response Consistency**:
   - Wrap asynchronous controller operations in `try...catch` blocks.
   - Standardize API JSON responses:
     - Success: `{ success: true, data: ... }` or `{ message: "...", data: ... }`
     - Failure: `{ success: false, error: "Descriptive error message" }` with appropriate HTTP status codes (400, 401, 403, 404, 500).

---

## 4. Verification Workflow

Whenever making code changes:
- For frontend changes: Run `cd Web_aura && npm run lint` and verify build with `npm run build`.
- For backend changes: Verify syntax with `node -c <file>` or test server startup in `server/`.
- Maintain clean Git commit messages (e.g., `feat: ...`, `fix: ...`, `refactor: ...`).
