# Quickstart — XPECTO'27

## 1. Prerequisites
- MongoDB running at `mongodb://localhost:27017`
- Rust toolchain + Node.js/npm

## 2. Backend
```bash
cd backend
cp .env.example .env
# edit JWT_SECRET if desired
cargo run              # :3000; seeds fest, mess and payment defaults
curl http://localhost:3000/health   # ok
```

## 3. Frontend
```bash
cd frontend
cat > .env <<EOF
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=false
EOF
npm install   # if needed
npm run dev   # :5173
```

Open `http://localhost:5173`. Events, workshops, team members and sponsors are not seeded; add them in `/admin` or directly to the `events`, `workshops`, `team_members` and `sponsors` MongoDB collections. The admin forms accept custom categories, roles and tiers. For the MongoDB document fields, see [the API reference](./API.md) and [database schemas](./ARCHITECTURE.md). Existing MongoDB records are not deleted when the seed data is removed.

## 4. Docs
- `docs/FRONTEND_AUDIT.md` — frontend pages, components, data models, API contract
- `docs/API.md` — full API reference
- `docs/ARCHITECTURE.md` — backend design, MongoDB schema, data flow
- `docs/DEPLOYMENT.md` — deployment & production notes

No frontend source files were modified.
