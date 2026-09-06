# Project Overview: Anuj Portfolio

This repository contains a custom full-stack portfolio application for Anuj Bhardwaj (anujb.dev). The project replaces rigid templates with a bespoke, high-performance architecture showcasing modern web development, UI/UX interaction, and robust backend engineering.

## Tech Stack & Architecture

- **Monorepo Structure:**
  - `/frontend`: React Single Page Application (SPA) bundled via Vite.
  - `/backend`: Modern .NET Web API (.NET 8/9).
  - `/docker`: Local and production containerization via `docker-compose.yml`.
- **Frontend Technologies:** React, Vite, Tailwind CSS, Framer Motion (for smooth transitions, card tilts, and subtle animations), and a lightweight Canvas/Three.js integration for background 3D accents.
- **Backend Technologies:** C# .NET Web API, structured REST endpoints, secure CORS policy, and robust input validation/sanitization.

## Core Architectural Guidelines

1. **Pragmatic & Minimalist (YAGNI):** 
   - Favor native platform capabilities and clean standard libraries over heavy third-party npm packages or bloated abstract classes. Write only the code required to solve the immediate problem.
2. **Performance First:** 
   - Keep frontend bundle sizes small. Optimize 3D animations so they do not degrade frame rates or mobile load times.
3. **Security & Validation:** 
   - Ensure all backend endpoints (especially contact forms or metadata handlers) implement strong validation and sanitization.
4. **Clean Code & Modularity:** 
   - Keep components small, decoupled, and reusable. Follow clean separation of concerns between UI layers, state logic, and API communication.

## Common Development Commands

- **Frontend (`/frontend`):**
  - Install dependencies: `npm install`
  - Run local dev server: `npm run dev`
  - Build for production: `npm run build`
- **Backend (`/backend`):**
  - Run API locally: `dotnet run`
  - Restore packages: `dotnet restore`
- **Docker Orchestration (Root):**
  - Build and start containers: `docker compose up --build`
  - Tear down containers: `docker compose down`

## Response Style for Claude

- Provide concise, production-ready code blocks.
- Avoid unnecessary commentary or over-explaining standard boilerplate.
- When scaffolding features, implement end-to-end functionality cleanly rather than leaving massive missing placeholder stubs.