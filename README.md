# FloodNow AI — SIH26085

Urban Flood Nowcasting System (Drainage and Rainfall Coupling)

## Run

The website is a static HTML/CSS/JS frontend backed by the TypeScript API in `backend/`.

### Backend

See `backend/README.md`. In short: configure PostgreSQL, copy `backend/.env.example` to `backend/.env`, run `npm install`, `npx prisma migrate dev --name init`, `npm run prisma:seed`, then `npm run dev`.

### Frontend

Serve this directory with VS Code Live Server on port 5500. The shared `script.js` calls `http://localhost:3000/api` and keeps the existing static demo values as a fallback when the API is unavailable.

## Pages

- index.html — Landing page
- dashboard.html — Live monitoring dashboard
- map.html — Flood-risk map
- analytics.html — Rainfall/drainage analytics
- alerts.html — Alert center
- admin.html — Municipal dashboard
- history.html — Historical analysis
- emergency.html — Emergency response

## Architecture

Existing HTML frontend -> REST API -> Express/TypeScript -> Prisma/PostgreSQL. Current demo data is seeded for four Nellore locations and alert severity is derived from per-location water-level thresholds. A future radar, weather, IoT, GIS, or ML provider can feed `POST /api/measurements` server-side.
