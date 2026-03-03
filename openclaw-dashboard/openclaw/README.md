# OpenClaw Dynamic Dashboard Project

This project is a full-stack starter for a dynamic OpenClaw agent dashboard deployable as:
- Web app (React)
- Mobile app (React Native)
- Backend API (Node.js + Express)
- PostgreSQL with pgvector as the data store

## Structure

- `backend/` — Express API, connects to pgvector (Postgres)
- `frontend-web/` — React web app (agent, channels, skills, cron jobs)
- `frontend-mobile/` — React Native app (Android/iOS)
- `db/` — Schema/migrations

## Getting Started

1. Fill out `backend/.env` with your Azure Postgres connection details (sample in `.env.sample`).
2. Run database migrations in `/db` before starting backend.
3. Start backend and frontend servers independently for local development.

---

## Tech Stack
- React / React Native
- Node.js (Express)
- PostgreSQL + pgvector

---

Fill in your secrets, edit endpoints, and build out dynamic UI as your OpenClaw environment grows.
