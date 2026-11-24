---
name: aura-backend
description: >-
  Work with the Aura Fashion Node.js/Express backend and MySQL database. Use when
  the user asks to add or modify API routes, controllers, authentication, database
  schema, or run database seed scripts in server/.
---

# Aura Fashion Backend Workflow

This skill guides you through maintaining and extending the Aura Fashion backend (`server/`).

## Project Layout

- `server/index.js`: Main server entry point (Express app, CORS, routes mounting, error handling).
- `server/db.js`: MySQL2 connection pool.
- `server/routes/`: Route declarations (`auth.routes.js`, `products.routes.js`, `categories.routes.js`, `orders.routes.js`, `templates.routes.js`, `dashboard.routes.js`).
- `server/controllers/`: Business logic corresponding to routes.
- `server/middleware/auth.js`: JWT authentication and authorization token verification.
- `server/seedAdmin.js`, `server/seedTemplates.js`: Database seeding utilities.

## Safety & Database Rules

1. **Parameterize all queries**:
   ```javascript
   // Good:
   await db.execute('SELECT * FROM products WHERE category_id = ?', [categoryId]);
   // FORBIDDEN:
   // await db.execute(`SELECT * FROM products WHERE category_id = ${categoryId}`);
   ```
2. **Environment Variables**:
   Verify `server/.env` contains required connection settings (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`).

## Verification Steps

1. Check JavaScript syntax:
   ```bash
   node -c server/index.js
   node -c server/controllers/<controller>.js
   ```
2. Verify endpoints return standard JSON response structures with proper HTTP status codes.
