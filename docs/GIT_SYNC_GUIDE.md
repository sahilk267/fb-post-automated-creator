# Git Repository Sync Guide

**Project stack:** Python/FastAPI. Ye guide batata hai kya Git me sync karna hai aur kya ignore karna hai.

---

## ✅ Sync with Git

### Source & config
```
✅ app/                  # Python/FastAPI application
   ├── api/, core/, models/, schemas/, services/
   └── main.py
✅ frontend/             # React (Vite + TypeScript + Tailwind) UI
   └── (do not sync frontend/dist — build output)
✅ tests/                # Pytest suite
✅ requirements.txt
✅ Dockerfile
✅ docker-compose.yml
✅ scripts/
✅ .env.example
✅ .gitignore
✅ README.md
```

### Documentation
```
✅ docs/                 # All documentation
```

---

## ❌ Do NOT sync (add to .gitignore)

```
❌ .env                  # Secrets
❌ *.db, *.sqlite        # Database files
❌ __pycache__/          # Python cache
❌ .venv/, venv/         # Virtual env
❌ *.log, logs/          # Logs
❌ .DS_Store, Thumbs.db  # OS
❌ .vscode/, .idea/      # IDE (optional)
❌ coverage/              # Test coverage
❌ dist/, build/, tmp/   # Build/temp
```

---

## Git commands

```bash
# Clone
git clone <repo-url>
cd FB_Page_Post_Creator

# Setup
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # then edit .env
# Optional: run UI locally — cd frontend && npm install && npm run dev
# Docker image builds frontend and serves UI at / (see Dockerfile multi-stage build)

# Daily
git status
git add app/ frontend/ tests/ docs/ requirements.txt Dockerfile docker-compose.yml scripts/ .gitignore README.md
git commit -m "Your message"
git push
```

---

## Checklist before commit

- [ ] `.env` not committed
- [ ] No `*.db` / `*.sqlite` committed
- [ ] `app/`, `requirements.txt`, `docs/` included
- [ ] `.gitignore` up to date

---

**Last Updated:** February 2025
