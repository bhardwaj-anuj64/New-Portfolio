# Project Overview: Anuj Portfolio

This repository contains a custom full-stack portfolio application for Anuj Bhardwaj (anujb.dev). The project replaces rigid templates with a bespoke, high-performance architecture showcasing modern web development, UI/UX interaction, and robust backend engineering.

## Core Architectural Guidelines

1. **Pragmatic & Minimalist (YAGNI):** 
   - Favor native platform capabilities and clean standard libraries over heavy third-party npm packages or bloated abstract classes. Write only the code required to solve the immediate problem.
2. **Performance First:** 
   - Keep frontend bundle sizes small. Optimize 3D animations so they do not degrade frame rates or mobile load times.
3. **Security & Validation:** 
   - Ensure all backend endpoints (especially contact forms or metadata handlers) implement strong validation and sanitization.
4. **Clean Code & Modularity:** 
   - Keep components small, decoupled, and reusable. Follow clean separation of concerns between UI layers, state logic, and API communication.

## Launch Checklist

`LAUNCH_CHECKLIST.md` at the repo root tracks every mock service, placeholder link, unset secret, and fabricated content item in the codebase. Whenever you introduce a new placeholder (fake data, a `href="#"`, an empty config key, invented copy standing in for real content), add it there. When one gets resolved with real content/config, check it off. Don't let this list drift out of sync with the code.

## Response Style for Claude

- Provide concise, production-ready code blocks.
- Avoid unnecessary commentary or over-explaining standard boilerplate.
- When scaffolding features, implement end-to-end functionality cleanly rather than leaving massive missing placeholder stubs.