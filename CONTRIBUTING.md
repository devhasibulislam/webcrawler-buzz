# Contributing to WebCrawler.buzz

First off, thank you for considering contributing to WebCrawler.buzz! Every contribution helps make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a respectful, inclusive environment.

## How Can I Contribute?

### 🐛 Report Bugs

Found a bug? [Open an issue](https://github.com/devhasibulislam/webcrawler/issues/new) with:

- A clear descriptive title
- Steps to reproduce the behavior
- Expected vs. actual behavior
- Your environment (Node version, OS, browser)

### 💡 Suggest Features

Have an idea? [Open a feature request](https://github.com/devhasibulislam/webcrawler/issues/new) with:

- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### 🔧 Submit Code

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with a clear message (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js v20+
- PostgreSQL (Neon free tier works)
- Redis (Redis Cloud free tier works)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/webcrawler.buzz.git
cd webcrawler.buzz

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run migrate

# Start development server (with hot reload)
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript + build CSS |
| `npm start` | Run production build |
| `npm run migrate` | Run database migrations |
| `npm run lint` | Run ESLint |
| `npm run css:watch` | Watch & rebuild Tailwind CSS |

## Pull Request Process

1. **Branch from `main`**, create a feature or fix branch
2. **Write clear commits**, use [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code restructuring
   - `chore:` for maintenance tasks
3. **Test your changes**, make sure the app runs correctly
4. **Update documentation**, if your change affects the API or user-facing behavior
5. **Open a PR**, describe what you changed and why

## Style Guide

### TypeScript

- **Strict mode** is enabled, no `any` unless absolutely necessary
- Use `async/await` over raw Promises
- Use parameterized queries for all database operations (never string concatenation)
- Add JSDoc comments to exported functions

### Code Structure

- **Routes** define HTTP endpoints with Swagger annotations
- **Controllers** handle request/response logic
- **Services** contain business logic and database queries
- **Queue workers** handle background processing

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `crawler.service.ts`)
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Database columns: `snake_case`

## Reporting Security Issues

**Do NOT open a public issue for security vulnerabilities.** Instead, see [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

---

Thank you for making WebCrawler.buzz better! 🕷️
