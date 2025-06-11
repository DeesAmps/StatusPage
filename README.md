# StatusPage SaaS Monorepo

This project is a SaaS application for monitoring the status pages of various companies. Users can create an account, log in, and add companies' status pages to their dashboard for real-time monitoring.

## Structure
- `apps/frontend`: Vite + React + TypeScript frontend (ready for Vercel)
- `apps/backend`: Node.js + TypeScript backend (Express, API, scraping, authentication)

## Features
- User authentication (sign up, login, logout)
- Dashboard to add/view monitored companies
- Real-time status updates (via RSS or scraping)
- Status indicators (up, fully down, partially down)

## Getting Started
1. Install dependencies in both frontend and backend:
   ```sh
   cd apps/frontend && npm install
   cd ../backend && npm install
   ```
2. Start the frontend:
   ```sh
   cd apps/frontend && npm run dev
   ```
3. Start the backend:
   ```sh
   cd apps/backend && npm run dev
   ```

## Deployment
- Frontend: Deploy `/apps/frontend` to Vercel
- Backend: Deploy `/apps/backend` to your preferred Node.js host

---

For more details, see the README files in each app folder.
