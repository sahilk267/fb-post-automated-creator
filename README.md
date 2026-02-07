# Content Automation Platform

Enterprise-grade content automation platform with manual approval workflows and comprehensive audit logging.

## Features

- **Content Management**: Create, update, and manage content with approval workflows
- **Approval Workflow**: Draft → Pending Approval → Approved/Rejected
- **Audit Logging**: Complete audit trail of all system actions
- **User Management**: Role-based access control (Admin/User)
- **RESTful API**: Clean FastAPI-based REST API

## Tech Stack

- Python 3.11
- FastAPI
- SQLAlchemy (ORM)
- SQLite (database)
- Docker-ready

## Project Structure

```
app/
├── api/              # API routes
│   └── routes/       # Route handlers
├── core/             # Core configuration
│   ├── config.py     # Settings
│   └── database.py   # DB connection
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── services/         # Business logic
└── main.py           # FastAPI app
```

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the application:**
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Access the API:**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Docker

1. **Build and run:**
   ```bash
   docker-compose up --build
   ```

2. **Access the API:**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

## API Endpoints

### Content
- `POST /api/v1/content/` - Create content
- `GET /api/v1/content/` - List content
- `GET /api/v1/content/{id}` - Get content
- `PATCH /api/v1/content/{id}` - Update content (draft only)
- `POST /api/v1/content/{id}/submit` - Submit for approval
- `POST /api/v1/content/{id}/approve` - Approve/reject (admin only)
- `DELETE /api/v1/content/{id}` - Delete content (draft only)

### Users
- `POST /api/v1/users/` - Create user (admin only)
- `GET /api/v1/users/` - List users (admin only)
- `GET /api/v1/users/me` - Get current user

### Audit Logs
- `GET /api/v1/audit-logs/` - List audit logs (admin only)
- `GET /api/v1/audit-logs/{id}` - Get audit log (admin only)

## Content Workflow

1. **Draft**: Content is created in draft status
2. **Pending Approval**: Content is submitted for approval
3. **Approved/Rejected**: Admin approves or rejects the content

Only draft content can be updated or deleted.

## Authentication

**Note**: Currently uses a simplified user ID system. In production, implement:
- JWT tokens
- OAuth2
- Session-based authentication

To use the API, pass `user_id` as a query parameter (defaults to 1). This is a placeholder for proper authentication.

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: Database connection string
- `DEBUG`: Enable debug mode
- `API_PREFIX`: API route prefix

## Database

SQLite database is created automatically on first run. The database file (`content_platform.db`) will be created in the project root.

## Project Status

✅ **Complete and Verified** (December 2024)

- All 22 Python files implemented and verified
- No linter or syntax errors
- All functionality tested and working
- Complete documentation

For detailed verification results, see `docs/VERIFICATION_REPORT.md`

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- `ARCHITECTURE.md` - Complete architecture specification
- `IMPLEMENTATION_PLAN.md` - Phase-wise implementation guide
- `PROJECT_TRACKING.md` - Project progress and verification status
- `VERIFICATION_REPORT.md` - Latest verification results
- `QUICK_REFERENCE.md` - Quick architecture reference
- `DATA_FLOW.md` - Detailed data flow diagrams

## License

MIT

