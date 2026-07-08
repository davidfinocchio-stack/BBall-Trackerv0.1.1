# Basket Tracker Analytics

An advanced, production-ready full-stack sports analytics and live tracking application designed for coaches, statisticians, and basketball enthusiasts. This platform enables real-time play-by-play telemetry, dynamic spatial shot mapping, multi-level database persistence, and aggregate league/player report compilation.

---

## Key Features

- **🏀 Real-Time Live Game Controller**: Streamlined play-by-play event logger covering field goals (makes/misses, spatial coordinates, zone metrics), rebounds, turnovers, assists, blocks, steals, and fouls.
- **🗺️ Spatial Shot Charts**: Interactive interactive 2D basketball court overlay using responsive SVG paths to map shots with specific category indicators.
- **📊 Dynamic Advanced Boxscores**: Live, aggregated boxscores compiling traditional box statistics paired with advanced performance metrics (PER, True Shooting %, eFG %).
- **🏆 League Leaderboard Hub**: Complete player-centric standings across Points Per Game (PPG), Assists Per Game (APG), Rebounds Per Game (RPG), and Steals Per Game (SPG).
- **🛡️ Clean Roster Management**: Hierarchical registration schemas for Teams, Players, and Tournament fixtures.
- **⚡ Zero-Config SQLite Persistence**: SQLite local server file-backed relational storage using SQLAlchemy models.

---

## Tech Stack

### Frontend (Client SPA)
- **Framework**: React 19 (TypeScript) with Vite
- **Styling**: Tailwind CSS & Material-UI (MUI v5/v9)
- **Animations**: Framer Motion (`motion/react`)
- **Data Visualizations**: Recharts & custom interactive SVG coordinate maps

### Backend (Server API)
- **Application Framework**: FastAPI (Python 3.10+)
- **Database ORM**: SQLAlchemy with Alembic migrations
- **Validation**: Pydantic v2 Settings and schemas
- **Reverse Proxy**: Node Express HTTP-proxy server for unified dev environments and local container routes on port `3000`

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)

### 2. Configure Environment
Create a `.env` file at the root or reference the pre-configured `.env.example`:

```bash
# General
PORT=3000

# Backend CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### 3. Installation

Install Node.js dependencies at root:
```bash
npm install
```

Install Python dependencies for the backend:
```bash
pip install -r basket-tracker/backend/requirements.txt
```

### 4. Running the Development Servers
Launch both the Python FastAPI server and the React Vite server managed by Node Express via a single command:
```bash
npm run dev
```
The application will boot and be accessible at `http://localhost:3000`.

---

## Production Build & Start

Compile the React frontend into static assets and bundle the backend entry proxy using `esbuild`:
```bash
npm run build
```

Boot the production-grade application:
```bash
npm run start
```

---

## Directory Structure

```
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── server.ts
├── vite.config.ts
└── basket-tracker/
    ├── backend/
    │   ├── app/
    │   │   ├── api/          # Endpoints (Games, Teams, Players, Analytics)
    │   │   ├── database/     # SQLAlchemy Session & Base
    │   │   ├── models/       # Relational Database Models
    │   │   └── services/     # Aggregations, Leaderboards, Boxscores
    │   └── requirements.txt
    └── frontend/
        └── src/
            ├── components/   # Visualizer court & controllers
            ├── pages/        # Dashboard, Games, Reports, Teams, Players
            └── services/     # API Axios client
```

---

## License

This project is licensed under the [MIT License](LICENSE).
