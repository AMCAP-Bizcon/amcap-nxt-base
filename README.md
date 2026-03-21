# 🚀 2026 SaaS Boilerplate (Next.js 16 + Supabase + Drizzle)

A production-ready, infinitely scalable Full-Stack SaaS boilerplate. Built with the "2026 Speed Run" stack to maximize developer velocity while maintaining enterprise-grade reliability, security, and type safety.

## 🛠️ Tech Stack

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Components)
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (Oxide engine, CSS-first config)
* **Auth & Backend:** [Supabase](https://supabase.com/) (PostgreSQL, `@supabase/ssr`)
* **ORM:** [Drizzle ORM](https://orm.drizzle.team/) (Edge-compatible, type-safe)
* **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Owned, customizable components)
* **Interactions:** [@dnd-kit](https://dndkit.com/) & `react-resizable-panels` 
* **Editor:** Tiptap (Rich Text Integration)
* **Deployment:** [Vercel](https://vercel.com/) (Zero-config CI/CD)

## ✨ Core Features

* **Server-First Architecture:** Leverages React Server Components and Server Actions to eliminate boilerplate API routes and reduce client-side JavaScript.
* **Modern Auth Flow:** Uses `@supabase/ssr` with cookie-based sessions. Auto-syncs Supabase `auth.users` with the public `profiles` table.
* **Edge Routing:** Route protection handled via Next.js 16 `proxy.ts` (the high-performance replacement for the deprecated `middleware.ts`).
* **Connection Pooling:** Configured to safely handle serverless database connections without crashing Postgres.
* **Granular RBAC (Role-Based Access Control):** Built-in dynamic permission system. Control `read`, `create`, `update`, and `delete` actions at the database table level across user roles.
* **Multi-Tenancy & Organizations:** Natively supports assigning users, roles, and records to specific Organizations/Workspaces.
* **Advanced User Management:** Hierarchical self-referential user relationships (Manager ↔ Managed User mappings).
* **Modular Master-Detail Architecture:** Abstraction of complex data views into generic, highly reusable templates (`src/components/templates/`). This enterprise-grade layout effortlessly scales to new CRM/ERP modules using a standard `BaseModuleConfig`.
* **URL-Driven State Management:** Deep linking out of the box with `searchParams`-powered layouts (`?id=123&tab=details`).
* **App Icons Grid UX:** iOS-inspired dynamic grid layout on the home page with hover animations and an emerald-themed aesthetic.
* **Interactive Modules:** 
  - **Todos:** Nested parent/child relationships, media attachments, drag-and-drop sequencing (touch-friendly), and organization tagging. Includes keyboard shortcuts (`Enter` to save, `Esc` to discard).
  - **Organizations:** Centralized workspace management and tenant isolation.
  - **Roles & Access Rules:** UI-driven management for application table permissions.
  - **Users:** Comprehensive profile, hierarchy, and assignment management.

---

## 🚦 Getting Started

### 1. Prerequisites
* Node.js (v18+)
* A [Supabase](https://supabase.com) account

### 2. Clone and Install
```bash
git clone https://github.com/YOUR_USERNAME/amcap-nxt-base.git my-new-saas
cd my-new-saas
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory. You will need 4 variables from your Supabase project dashboard.

**CRITICAL NOTE ON DATABASE URLs:** Serverless functions require connection pooling.

  * Use the Transaction Pooler (Port 6543) for your `DATABASE_URL` (used by the Next.js app).
  * Use the Session/Direct connection (Port 5432) for your `DIRECT_URL` (used by Drizzle for migrations).

*Ensure special characters in your database password are URL-encoded (e.g., `#` becomes `%23`, `?` becomes `%3F`).*

```env
# Supabase API Keys (Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-publishable-anon-key"

# Database Connections (Settings -> Database)
DATABASE_URL="postgresql://postgres.[ref]:[url-encoded-password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[url-encoded-password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### 4. Database Setup (Drizzle)

Push the initial schema (which includes all identity, RBAC, and business logic tables) to your Supabase database:

```bash
npx drizzle-kit push
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

*(Note: If you want to use fake emails during local testing, remember to disable "Confirm email" in your Supabase Auth settings).*

## 🏗️ Project Structure

```plaintext
src/
├── app/
│   ├── auth/actions.ts      # Server Actions for login/signup/logout
│   ├── login/               # Authentication UI
│   ├── organizations/       # Workspace & Tenant management module
│   ├── roles/               # RBAC rules and permission mapping
│   ├── todo/                # Advanced task management & nested records
│   ├── users/               # Profile and hierarchical user management
│   ├── layout.tsx           # Global layout (includes Navbar)
│   └── page.tsx             # Public landing page (App Icons Grid)
├── components/
│   ├── templates/           # Reusable Master-Detail scaffolding logic
│   ├── ui/                  # shadcn/ui primitives (Button, Input, etc.)
│   └── Navbar.tsx           # Global navigation with auth state
├── db/
│   ├── index.ts             # Drizzle client & connection pooling
│   └── schema.ts            # Enterprise schema (RBAC, Orgs, Profiles, etc.)
├── utils/
│   ├── rbac.ts              # Permission validation wrapper (`requirePermission`)
│   └── supabase/            # Client/Server auth utilities
└── proxy.ts                 # Edge proxy (Next.js 16 Bouncer) for route protection
```

## 🔐 Security & RBAC

This project uses a custom, database-driven Role-Based Access Control system. To protect server actions or data fetches, wrap them in the `requirePermission` utility:

```typescript
import { requirePermission } from '@/utils/rbac'

export async function createOrganization(data: any) {
    // Throws an error if the user lacks 'create' permissions on the 'organizations' table
    await requirePermission('organizations', 'create'); 
    
    // ... proceed with creation logic
}
```

## 🚀 Deployment (Vercel)

1.  Push your code to GitHub.
2.  Import the repository into Vercel.
3.  Add your 4 Environment Variables in the Vercel project settings. (Do not include quotation marks `""` around the URLs in Vercel's UI).
4.  Click **Deploy**.

### Post-Deployment Checklist

Once deployed, you must update your Supabase Auth settings so it knows your live URL:

1.  Go to **Supabase Dashboard -> Authentication -> URL Configuration**.
2.  Update the **Site URL** to your Vercel domain (e.g., `https://my-saas.vercel.app`).
3.  Add the Vercel domain to your **Redirect URLs** (e.g., `https://my-saas.vercel.app/**`).

## 💡 Adding New Components

To add new UI components via shadcn/ui, simply run:

```bash
npx shadcn@latest add [component-name]
```

## 🗄️ Database Migrations

When you update `src/db/schema.ts` with new tables or columns, sync it to your database by running:

```bash
npx drizzle-kit push
```

## 📐 Coding Guidelines

When contributing to this repository, please adhere to the following best practices:

  - **Documentation & Context:** Provide descriptive docstrings for all functions, components, and significant code blocks.
  - **Performance First:** Optimize for rendering performance. Avoid unnecessary re-renders in React by using memoization (`useMemo`, `useCallback`) only when computationally necessary.
  - **Optimistic UI:** Always implement Optimistic UI patterns for data mutations to ensure a snappy user experience.
  - **Component Reusability:** Build components that are small, focused, and single-purpose. Leverage `src/components/templates/` for new domain models.
  - **Type Safety:** Ensure strict typing with TypeScript. Avoid `any` types; define clear interfaces for component props, API responses, and database schemas.

## 🏆 Credits & Acknowledgments

This boilerplate was architected and built by:

  * **Aniruddh Sisodia** - [Amcap Business Consulting Private Limited](https://amcapbizcon.com)
  * **Antigravity (Google Gemini)** - AI Pair Programmer & Architectural Co-Pilot
  * **The Next.js Team & Vercel** - For creating the incredible underlying framework.

Amcap Business Consulting Private Limited actively maintains this boilerplate to continuously build, improve, and deploy modern, monetizable web applications.

## 📄 License & Copyright

**Copyright (c) 2026 Aniruddh Sisodia / Amcap Business Consulting Private Limited**

This project is open-source and released under the [MIT License](LICENSE).

You are completely free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software, and to use it to build your own monetized web applications. The only requirement is that you must include the above copyright notice and this permission notice in all copies or substantial portions of the Software.