<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a monorepo SaaS project for monitoring company status pages. The frontend is a Vite + React + TypeScript app (in /apps/frontend) and the backend is a Node.js/TypeScript app (in /apps/backend).

## Current Implementation Summary (June 2025)
- **Authentication:** JWT-based, with separate Auth and User tables (Prisma, Neon Postgres). Secure registration/login, token-based user state in frontend.
- **Company Monitoring:** Users can add companies by RSS feed only. Each company stores status, last checked, and latest incident details (title, summary, timestamp) parsed from the RSS feed.
- **Dashboard:** Modern UI (dark/light, purple/blue/grey palette), add/remove companies, view status and incident details, manual refresh button to trigger backend status update.
- **Backend:** Express API, Prisma ORM, RSS parsing (rss-parser), no page scraping. Endpoints for company CRUD, status refresh, and user auth. Vercel/Neon ready.
- **Persistence:** All user and company data stored in Neon Postgres via Prisma.
- **Deployment:** Vercel-ready for both frontend and backend, with build/postinstall scripts for Prisma.

## Best Practices
- Prioritize secure authentication, clear API boundaries, and modern, accessible UI.
- Use Prisma for all DB access, keep types in sync between backend and frontend.
- Prefer RSS for status ingestion; scraping is not supported.
- Keep dashboard interactions fast and user-friendly.

## Recommendations for Extension
- Add status/incident history per company (timeline view, chart, or table).
- Add notifications (email, web push) for status changes or new incidents.
- Support team/multi-user accounts and shared dashboards.
- Add company logo/icon support for better visual identification.
- Allow users to categorize or tag companies (e.g., by criticality or department).
- Add advanced filtering/search on the dashboard.
- Add audit log or activity feed for user actions.
- Add API rate limiting and monitoring for backend endpoints.
- Add integration with third-party status APIs (e.g., Statuspage.io, Better Uptime).
- Add onboarding/tutorial for new users.
