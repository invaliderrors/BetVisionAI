# CLAUDE.md - Developer Guidelines & AI Rules

This file defines the strict operational boundaries, coding standards, and workflows for this project. Claude must adhere to these rules without exception.

---

## 1. Commit & Git Policies

### ✅ COMMIT ON EVERY CHANGE
* **Always commit after every atomic change.** Do not batch unrelated edits into one commit.
* Prefer **very granular** commits: one logical change (one file group, one behavior) per commit.
* Commit continuously as work progresses — after each file group, each passing test suite, each config change — never leave completed work uncommitted.
* Use **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `build:`, `ci:`), scoped where useful (e.g. `feat(domain): add RiskAppetite value object`).
* Only the working tree the change touches should be staged; keep commits focused and reviewable.

### 🚫 NO CO-AUTHORED COMMITS
* **Do not** append `Co-authored-by: Claude <...>` or any AI attribution to commit messages.
* All git commits must appear as if they were written entirely by a human developer.
* Keep commit messages concise, imperative, and conventional (e.g., `feat: add user authentication endpoint`).

---

## 2. Tech Stack & Best Practices

### 🟦 TypeScript (Perfect Typing)
* **Zero `any` Policy:** The use of `any` is strictly prohibited. Use `unknown` if a type is truly dynamic, and narrow it appropriately.
* **Strict Mode:** Always assume `strict: true` in `tsconfig.json`. Handle `null` and `undefined` explicitly.
* **Prefer Interfaces/Types over Type Assertion:** Avoid using `as Type` unless dealing with external un-typed APIs. Let TypeScript infer types naturally where possible, but explicitly type exported function signatures and API boundaries.
* **Discriminated Unions:** Use discriminated unions for complex states (e.g., API responses, UI states).

### 🐘 PostgreSQL & Database
* **Raw Queries:** Never write raw SQL strings directly in the application code without sanitization. Use a type-safe query builder, ORM, or prepared statements to prevent SQL injection.
* **Migrations:** All schema changes must be driven by explicit migration files. Never modify the live database schema imperatively.
* **Naming Conventions:** Use `snake_case` for database tables, columns, and indexes. Use `camelCase` in TypeScript, mapping fields at the data access layer.
* **Indexing:** Always add indexes on foreign keys and columns frequently used in `WHERE`, `ORDER BY`, or `JOIN` clauses.

### 🧪 Testing Strategy (Test Everything)
* **100% Core Coverage:** Every new feature, bug fix, or utility function must be accompanied by tests.
* **Unit Tests:** Pure functions and isolated business logic must have 100% unit test coverage.
* **Integration Tests:** API endpoints and database interactions must be tested with integration tests using a test database lifecycle (setup/teardown).
* **Deterministic Tests:** Mock external network requests, time-dependent logic, and random generators to ensure tests never flake.

---

## 3. Code Quality & Architecture

* **DRY vs. AHA:** Avoid premature abstraction, but do not repeat critical business logic. Prefer clean, readable code over clever one-liners.
* **Error Handling:** Never swallow errors. Use explicit `try/catch` blocks, log errors with adequate context, and return meaningful, typed error responses.
* **Separation of Concerns:** Keep routing/controllers, business logic (services), and data access (repositories) strictly decoupled.

---

## 4. Operational Commands

Use these exact commands for common tasks in this repository:

### Development & Build
* Run development server: `npm run dev`
* Build project: `npm run build`
* Typecheck project: `npm run typecheck`

### Database
* Generate migration: `npm run migration:generate -- name=<migration_name>`
* Run migrations: `npm run migration:run`
* Rollback migration: `npm run migration:revert`

### Testing & Linting
* Run all tests: `npm run test`
* Run tests in watch mode: `npm run test:watch`
* Run coverage report: `npm run test:cov`
* Lint code: `npm run lint`
* Fix lint errors: `npm run lint:fix`

---

## 5. Response Protocol

When providing code, Claude must:
1. Ensure the code compiles flawlessly with zero TypeScript warnings or errors.
2. Provide the corresponding tests (unit or integration) alongside the implementation.
3. Validate that database interactions are performance-optimized and secure.