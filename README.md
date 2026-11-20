# XPECTO-27 Website

React frontend and Rust/Axum backend for the XPECTO-27 website. The backend stores application data in MongoDB.

## Requirements

- Git
- Node.js 20.19 or later and npm
- Rust stable and Cargo
- MongoDB

## Run locally

1. Start MongoDB.
2. Configure and run the backend:

   ```sh
   cd backend
   cp .env.example .env
   ```

   Set `MONGODB_URI`, `DB_NAME`, and `JWT_SECRET` in `.env`. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to create an administrator account.

   ```sh
   cargo run
   ```

3. In a second terminal, start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Open the URL printed by Vite (usually `http://localhost:5173`).

## Website content

Events, workshops, team members, and sponsors are read from MongoDB and are not seeded by the backend. Create and manage them in the `/admin` page, or insert documents directly into the `events`, `workshops`, `team_members`, and `sponsors` collections. Existing database records are preserved; removing seed data does not delete records already stored in MongoDB.

The optional startup seed only provides defaults for fest information, mess options, and payment information. See [the API reference](./docs/API.md), [MongoDB schemas](./docs/ARCHITECTURE.md), and [quickstart guide](./docs/QUICKSTART.md) for details.

## Useful commands

```sh
# frontend, from frontend/
npm run build

# backend, from backend/
cargo check
cargo test
```
