# FINAL LOCKED ARCHITECTURE DOCUMENT

**Project stack:** Python/FastAPI. This document is the single source of truth for architecture.  
Scaling & MVP scope: [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md).

**Version:** 1.0.1  
**Status:** LOCKED - No changes without architecture review  
**Last Updated:** 2025  
**Purpose:** Architecture definition; scaling/automation on this stack

---

## Executive Summary

This document defines the **FINAL, LOCKED** architecture for the Enterprise Content Automation Platform. This architecture is **immutable** and serves as the single source of truth for all development decisions. Any deviations require formal architecture review.

**Platform Type:** Monolithic application with service-oriented internal architecture  
**Deployment Model:** Single containerized application (Docker)  
**Database:** SQLite (development), PostgreSQL-ready (production)

**Product & integration context (MVP):**  
Meta-compliant SaaS (single App, OAuth-only consent, page-level tokens), token lifecycle, multi-tenancy (tenant = user, user → multiple pages), and Viral Content Engine are defined in [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md). This monolithic architecture is **correct for MVP**; microservices split and Media/File service are **deferred to post-MVP**.

---

## 1. Service List

The platform consists of **4 core services** organized as internal service modules within a monolithic FastAPI application:

### 1.1 API Gateway Service
- **Location:** `app/main.py`, `app/api/`
- **Purpose:** HTTP request handling, routing, authentication, response formatting
- **Type:** Internal service (exposed externally via HTTP)

### 1.2 Content Management Service
- **Location:** `app/services/content_service.py`
- **Purpose:** Content CRUD operations, approval workflow state machine
- **Type:** Internal service (not directly exposed)

### 1.3 Audit Logging Service
- **Location:** `app/services/audit_service.py`
- **Purpose:** Immutable audit trail creation and management
- **Type:** Internal service (not directly exposed)

### 1.4 User Management Service
- **Location:** `app/api/routes/users.py` (implicit service)
- **Purpose:** User CRUD operations, role management
- **Type:** Internal service (exposed via API Gateway)

---

## 2. Tech Stack Per Service

### 2.1 API Gateway Service

**Technology Stack:**
- **Framework:** FastAPI 0.104.1
- **Runtime:** Python 3.11
- **Server:** Uvicorn (ASGI)
- **Validation:** Pydantic 2.5.0
- **Dependencies:** `app/api/dependencies.py`

**Key Libraries:**
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `pydantic` - Request/response validation
- `python-multipart` - Form data handling

**Responsibilities:**
- HTTP request/response handling
- Route registration and middleware
- CORS configuration
- OpenAPI documentation generation
- Error handling and HTTP status codes
- Authentication/authorization (via dependencies)

**NOT Allowed To:**
- ❌ Perform business logic (delegates to services)
- ❌ Direct database queries (uses services)
- ❌ Modify audit logs directly
- ❌ Bypass service layer
- ❌ Store business state in memory
- ❌ Make external API calls to social media platforms
- ❌ Auto-publish content without approval

---

### 2.2 Content Management Service

**Technology Stack:**
- **Language:** Python 3.11
- **ORM:** SQLAlchemy 2.0.23
- **Database:** SQLite (via SQLAlchemy)
- **Dependencies:** `app/models/content.py`, `app/services/audit_service.py`

**Key Libraries:**
- `sqlalchemy` - ORM and database abstraction
- `datetime` - Timestamp management

**Responsibilities:**
- Content CRUD operations (Create, Read, Update, Delete)
- Approval workflow state machine enforcement
- Business rule validation (status transitions)
- Content status management (Draft → Pending → Approved/Rejected)
- Ownership tracking (created_by_id, approved_by_id)

**NOT Allowed To:**
- ❌ Handle HTTP requests/responses directly
- ❌ Bypass audit logging (must call AuditService)
- ❌ Allow invalid state transitions
- ❌ Update/delete non-draft content
- ❌ Approve content without admin check (checked by API layer)
- ❌ Make external API calls
- ❌ Auto-publish to social media
- ❌ Modify audit logs
- ❌ Access user credentials or authentication tokens
- ❌ Store content in filesystem (database only)

---

### 2.3 Audit Logging Service

**Technology Stack:**
- **Language:** Python 3.11
- **ORM:** SQLAlchemy 2.0.23
- **Database:** SQLite (via SQLAlchemy)
- **Storage Format:** JSON metadata field

**Key Libraries:**
- `sqlalchemy` - ORM
- `typing` - Type hints for metadata

**Responsibilities:**
- Create immutable audit log entries
- Standardize audit log format
- Store action metadata (JSON)
- Link actions to users and entities
- Provide audit trail for compliance

**NOT Allowed To:**
- ❌ Update existing audit logs (immutable)
- ❌ Delete audit logs
- ❌ Modify audit log timestamps
- ❌ Handle HTTP requests
- ❌ Perform business logic
- ❌ Access content data directly (receives via parameters)
- ❌ Make external API calls
- ❌ Filter or redact audit logs (all actions must be logged)

---

### 2.4 User Management Service

**Technology Stack:**
- **Language:** Python 3.11
- **ORM:** SQLAlchemy 2.0.23
- **Framework:** FastAPI (via API Gateway)
- **Dependencies:** `app/models/user.py`

**Key Libraries:**
- `sqlalchemy` - ORM
- `pydantic` - User schema validation

**Responsibilities:**
- User CRUD operations
- Role management (admin/user)
- User authentication (simplified, future: JWT)
- User authorization checks

**NOT Allowed To:**
- ❌ Store passwords in plain text (future: hashing required)
- ❌ Expose user credentials in responses
- ❌ Bypass audit logging for user operations
- ❌ Delete users with active content (soft delete only)
- ❌ Modify user roles without admin check
- ❌ Make external API calls
- ❌ Store authentication tokens in database (future: external auth service)

---

## 3. Internal vs External APIs

### 3.1 External APIs (Public-Facing)

**Base URL:** `/api/v1`

#### Content Endpoints
- `POST /api/v1/content/` - Create content
- `GET /api/v1/content/` - List content (with filters)
- `GET /api/v1/content/{id}` - Get content by ID
- `PATCH /api/v1/content/{id}` - Update content (draft only)
- `POST /api/v1/content/{id}/submit` - Submit for approval
- `POST /api/v1/content/{id}/approve` - Approve/reject (admin only)
- `DELETE /api/v1/content/{id}` - Delete content (draft only)

#### User Endpoints
- `POST /api/v1/users/` - Create user (admin only)
- `GET /api/v1/users/` - List users (admin only)
- `GET /api/v1/users/me` - Get current user

#### Audit Log Endpoints
- `GET /api/v1/audit-logs/` - List audit logs (admin only, filtered)
- `GET /api/v1/audit-logs/{id}` - Get audit log by ID (admin only)

#### System Endpoints
- `GET /` - Root endpoint (API info)
- `GET /health` - Health check
- `GET /docs` - OpenAPI documentation (Swagger UI)
- `GET /redoc` - ReDoc documentation

**Authentication:** Currently simplified (user_id query param). Future: JWT tokens.

**Rate Limiting:** Not implemented (future requirement)

---

### 3.2 Internal APIs (Service-to-Service)

**Note:** Currently monolithic, but interfaces are defined for future microservices split.

#### ContentService Internal Interface

**Methods (Python function calls):**
- `create_content(content_data: ContentCreate, user_id: int) -> Content`
- `get_content(content_id: int) -> Optional[Content]`
- `list_content(skip, limit, status, user_id) -> List[Content]`
- `update_content(content_id, content_data, user_id) -> Optional[Content]`
- `submit_for_approval(content_id, user_id) -> Optional[Content]`
- `approve_content(content_id, approval_data, approver_id) -> Optional[Content]`
- `delete_content(content_id, user_id) -> bool`

**Called By:** API Gateway Service (via routes)

**NOT Exposed As:** HTTP endpoints (internal only)

---

#### AuditService Internal Interface

**Methods (Python function calls):**
- `log_action(db, action, entity_type, entity_id, user_id, description, metadata) -> AuditLog`

**Called By:** 
- ContentService (after every content operation)
- UserService (future: after user operations)
- Any service performing auditable actions

**NOT Exposed As:** HTTP endpoints (internal only, write-only)

**Read Access:** Via API Gateway `/api/v1/audit-logs/` (admin only)

---

#### UserService Internal Interface

**Methods (Python function calls):**
- `get_user(user_id: int) -> Optional[User]`
- `create_user(user_data: UserCreate) -> User`
- `list_users() -> List[User]`

**Called By:** API Gateway Service (via routes and dependencies)

**NOT Exposed As:** Direct HTTP endpoints (routed through API Gateway)

---

## 4. Data Flow Between Services

### 4.1 Content Creation Flow

```
┌─────────────┐
│   Client    │
│  (External) │
└──────┬──────┘
       │ HTTP POST /api/v1/content/
       │ {title, body}
       ▼
┌─────────────────────────────────┐
│  API Gateway Service            │
│  (app/api/routes/content.py)   │
│  - Validates request            │
│  - Extracts user_id             │
│  - Validates schema             │
└──────┬──────────────────────────┘
       │
       │ Calls: ContentService.create_content()
       ▼
┌─────────────────────────────────┐
│  Content Management Service     │
│  (app/services/content_service) │
│  - Creates Content model       │
│  - Sets status=DRAFT            │
│  - Saves to database            │
└──────┬──────────────────────────┘
       │
       │ Calls: AuditService.log_action()
       ▼
┌─────────────────────────────────┐
│  Audit Logging Service          │
│  (app/services/audit_service)   │
│  - Creates AuditLog entry      │
│  - Links to content & user      │
│  - Saves to database            │
└──────┬──────────────────────────┘
       │
       │ Returns: AuditLog
       ▼
┌─────────────────────────────────┐
│  Content Management Service     │
│  - Returns: Content            │
└──────┬──────────────────────────┘
       │
       │ Returns: Content
       ▼
┌─────────────────────────────────┐
│  API Gateway Service            │
│  - Serializes to JSON           │
│  - Returns HTTP 201             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
│  (Response) │
└─────────────┘
```

**Database Transactions:**
- **LOCKED RULE:** Content creation and audit log creation occur in **single atomic transaction**
- Both records are saved together (ACID compliance)
- If audit logging fails, content creation is rolled back (transaction abort)
- This ensures compliance: no content exists without audit trail
- Implementation: Both `db.add()` calls before single `db.commit()`

---

### 4.2 Content Approval Flow

```
┌─────────────┐
│   Admin     │
│  (External) │
└──────┬──────┘
       │ HTTP POST /api/v1/content/{id}/approve
       │ {approved: true, comment: "..."}
       ▼
┌─────────────────────────────────┐
│  API Gateway Service            │
│  - Validates: is_admin == true  │
│  - Validates request schema     │
└──────┬──────────────────────────┘
       │
       │ Calls: ContentService.approve_content()
       ▼
┌─────────────────────────────────┐
│  Content Management Service      │
│  - Validates: status == PENDING │
│  - Updates status               │
│  - Sets approved_by_id          │
│  - Sets approved_at timestamp    │
│  - Commits to database          │
└──────┬──────────────────────────┘
       │
       │ Calls: AuditService.log_action()
       │        action="content.approved"
       ▼
┌─────────────────────────────────┐
│  Audit Logging Service          │
│  - Creates audit log            │
│  - Stores approval metadata     │
└──────┬──────────────────────────┘
       │
       │ Returns: Content
       ▼
┌─────────────────────────────────┐
│  API Gateway Service            │
│  - Returns HTTP 200             │
└─────────────────────────────────┘
```

**State Machine Enforcement:**
- ContentService validates state transitions
- Invalid transitions raise ValueError
- API Gateway converts to HTTP 400

---

### 4.3 Audit Log Retrieval Flow

```
┌─────────────┐
│   Admin     │
│  (External) │
└──────┬──────┘
       │ HTTP GET /api/v1/audit-logs/?entity_type=content
       ▼
┌─────────────────────────────────┐
│  API Gateway Service            │
│  (app/api/routes/audit_logs.py) │
│  - Validates: is_admin == true  │
│  - Extracts query parameters    │
└──────┬──────────────────────────┘
       │
       │ Direct database query (via SQLAlchemy)
       │ (No service layer - read-only operation)
       ▼
┌─────────────────────────────────┐
│  Database (SQLite)              │
│  - Queries audit_logs table    │
│  - Applies filters              │
│  - Returns results              │
└──────┬──────────────────────────┘
       │
       │ Returns: List[AuditLog]
       ▼
┌─────────────────────────────────┐
│  API Gateway Service            │
│  - Serializes to JSON           │
│  - Returns HTTP 200             │
└─────────────────────────────────┘
```

**Note:** Audit log reads bypass service layer (read-only, no business logic)

---

### 4.4 Service Dependency Graph

```
API Gateway Service
  ├─→ Content Management Service
  │     └─→ Audit Logging Service
  │
  ├─→ User Management Service
  │     └─→ Audit Logging Service (future)
  │
  └─→ Database (direct queries for audit log reads)

Audit Logging Service
  └─→ Database (write-only)

Content Management Service
  ├─→ Database (read/write)
  └─→ Audit Logging Service (write)

User Management Service
  └─→ Database (read/write)
```

**Rules:**
- Services can only call services **below** them in the dependency graph
- No circular dependencies allowed
- API Gateway is the only service that handles HTTP

---

## 5. Service Restrictions (What Each Service is NOT Allowed To Do)

### 5.1 API Gateway Service Restrictions

**❌ FORBIDDEN:**
1. **Business Logic:** Cannot implement content approval rules, state machine logic, or business validations
2. **Direct Database Access:** Cannot query models directly (must use services)
3. **Audit Logging:** Cannot create audit logs directly (must go through AuditService)
4. **State Management:** Cannot modify content status directly
5. **External API Calls:** Cannot call social media APIs, third-party services, or external webhooks
6. **Auto-Publishing:** Cannot automatically publish content without approval workflow
7. **Bypass Services:** Cannot skip service layer for any business operation
8. **Authentication Storage:** Cannot store passwords, tokens, or credentials in memory
9. **File System Operations:** Cannot read/write files (except logs)
10. **Background Jobs:** Cannot spawn background tasks or async workers

**✅ ALLOWED:**
- HTTP request/response handling
- Schema validation (Pydantic)
- Route registration
- Error handling and HTTP status codes
- Calling service methods
- Reading configuration
- Health checks

---

### 5.2 Content Management Service Restrictions

**❌ FORBIDDEN:**
1. **HTTP Handling:** Cannot handle HTTP requests, responses, or status codes
2. **Schema Validation:** Cannot validate Pydantic schemas (receives already-validated data)
3. **Audit Log Bypass:** Cannot skip audit logging for any content operation
4. **Invalid State Transitions:** Cannot allow content status changes that violate state machine
5. **Non-Draft Modifications:** Cannot update or delete content that is not in DRAFT status
6. **External API Calls:** Cannot call social media APIs, webhooks, or external services
7. **Auto-Publishing:** Cannot automatically publish content to external platforms
8. **File System Access:** Cannot read/write files (database only)
9. **User Authentication:** Cannot validate user credentials or tokens
10. **Direct HTTP Responses:** Cannot return HTTP responses (returns Python objects)
11. **Audit Log Modification:** Cannot update or delete existing audit logs
12. **Bypass Approval:** Cannot approve content without going through approval workflow

**✅ ALLOWED:**
- Content CRUD operations
- State machine enforcement
- Business rule validation
- Database operations (via SQLAlchemy)
- Calling AuditService.log_action()
- Timestamp management

---

### 5.3 Audit Logging Service Restrictions

**❌ FORBIDDEN:**
1. **Audit Log Modification:** Cannot update or delete existing audit log entries (immutable)
2. **Audit Log Filtering:** Cannot filter, redact, or hide audit logs (all actions must be logged)
3. **HTTP Handling:** Cannot handle HTTP requests or responses
4. **Business Logic:** Cannot perform content or user operations
5. **External API Calls:** Cannot make external service calls
6. **Timestamp Manipulation:** Cannot modify created_at timestamps
7. **Selective Logging:** Cannot skip logging for any action (must log all auditable operations)
8. **Data Access:** Cannot access content or user data directly (receives via parameters)
9. **Authentication:** Cannot validate users or permissions
10. **File System Access:** Cannot read/write files

**✅ ALLOWED:**
- Create new audit log entries
- Store action metadata (JSON)
- Link actions to entities and users
- Read audit logs (via database queries, but not exposed as service method)

---

### 5.4 User Management Service Restrictions

**❌ FORBIDDEN:**
1. **Password Storage:** Cannot store passwords in plain text (future: must hash)
2. **Credential Exposure:** Cannot return passwords or tokens in API responses
3. **User Deletion:** Cannot hard-delete users with active content (soft delete only)
4. **Role Modification:** Cannot change user roles without admin authorization check
5. **External API Calls:** Cannot call external authentication services (future: may integrate)
6. **Audit Log Bypass:** Cannot skip audit logging for user operations (future requirement)
7. **Direct HTTP Handling:** Cannot handle HTTP directly (routed through API Gateway)
8. **Content Access:** Cannot access or modify content directly
9. **Authentication Tokens:** Cannot store JWT tokens or session data in database (future: external service)

**✅ ALLOWED:**
- User CRUD operations
- Role management (with proper authorization)
- User queries and filtering
- Database operations (via SQLAlchemy)

---

## 6. Data Flow Rules

### 6.1 Request Flow Rules

1. **All external requests** MUST go through API Gateway Service
2. **All business operations** MUST go through appropriate service layer
3. **All auditable operations** MUST call AuditService
4. **No service** can bypass another service's responsibilities
5. **Database access** is only allowed through SQLAlchemy ORM

### 6.2 Response Flow Rules

1. **Services return Python objects**, not HTTP responses
2. **API Gateway** converts service responses to HTTP responses
3. **Error handling** is converted at API Gateway layer
4. **Serialization** happens at API Gateway using Pydantic schemas

### 6.3 Audit Logging Rules

1. **Every content operation** MUST create an audit log entry
2. **Audit logs are immutable** - no updates or deletes
3. **Audit logs are created synchronously** (blocking operation)
4. **Audit log failures** do not block content operations (non-critical)

---

## 7. Database Schema Rules

### 7.1 Content Table
- **Status field** is enum-constrained (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED)
- **created_by_id** is required (foreign key to users)
- **approved_by_id** is optional (set only on approval/rejection)
- **Timestamps** are auto-managed (created_at, updated_at, approved_at)

### 7.2 Audit Log Table
- **Immutable** - no UPDATE or DELETE operations allowed
- **Metadata field** is JSON (flexible structure)
- **Indexed** on entity_type, entity_id, action, created_at for query performance

### 7.3 User Table
- **is_admin** flag for role-based access
- **is_active** flag for soft deletion
- **No password field** (future: external auth service)

---

## 8. Security Constraints

### 8.1 Authentication (Current)
- **Simplified:** user_id query parameter (development only)
- **Future:** JWT tokens, OAuth2, external auth service

### 8.2 Authorization
- **Admin-only endpoints:** Content approval, user management, audit log viewing
- **Enforced at:** API Gateway layer (route-level checks)
- **Validated at:** Service layer (business rule checks)

### 8.3 Data Protection
- **No external API calls** to social media (prevents credential exposure)
- **No auto-publishing** (manual approval required)
- **Audit logs** cannot be modified (compliance)

### 8.4 Authentication Placeholder Clarification

**Current Implementation (Development):**
- User identity provided via `user_id` query parameter
- **Trust Boundary:** User identity is considered **trusted only after API dependency validation**
- API Gateway (`get_current_user` dependency) validates user exists and is active
- **Service Layer Rule:** Service layer **never trusts raw user_id** - always receives validated User object from API Gateway
- Service methods receive `user_id` as integer, but this comes from validated dependency

**Future JWT Migration:**
- JWT validation will happen in `app/api/dependencies.py`
- Service layer interface remains unchanged (still receives `user_id: int`)
- No service layer changes required for JWT migration
- Service layer remains authentication-agnostic

**Security Principle:**
- **Single Trust Point:** Only API Gateway validates authentication
- **Service Layer Assumption:** All user_id parameters are pre-validated
- **No Service-Level Auth:** Services do not perform authentication checks

---

## 9. Global Exception Handling Strategy

### 9.1 Exception Hierarchy

**Handled Exceptions (Return HTTP Status Codes):**
- **ValidationError (Pydantic):** → HTTP 422 (Unprocessable Entity)
- **ValueError (Business Rules):** → HTTP 400 (Bad Request)
- **HTTPException (FastAPI):** → As specified (404, 403, etc.)
- **IntegrityError (Database):** → HTTP 400 (Bad Request) with sanitized message

**Unhandled Exceptions (Global Handler):**
- **All other exceptions:** → HTTP 500 (Internal Server Error)
- **Generic response:** `{"detail": "Internal server error", "correlation_id": "<uuid>"}`
- **No stack traces** in production responses
- **Full error details** logged internally only

### 9.2 Global Exception Handler

**Implementation Location:** `app/main.py`

**Handler Pattern:**
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = str(uuid.uuid4())
    # Log full error with correlation_id
    logger.error(f"[{correlation_id}] Unhandled exception", exc_info=exc)
    # Return generic 500 response
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "correlation_id": correlation_id}
    )
```

**Error Categories:**

1. **Database Connection Failures:**
   - Caught by global handler
   - Returns HTTP 500 with correlation_id
   - Logged with full stack trace
   - **No partial data exposure**

2. **Audit Service Failures:**
   - **Current:** Causes transaction rollback (content + audit in same transaction)
   - **Future:** Could be async with retry queue
   - Logged with correlation_id

3. **Partial Failures:**
   - Transaction rollback ensures atomicity
   - No orphaned records
   - Correlation ID tracks full request lifecycle

4. **Unexpected Exceptions:**
   - All caught by global handler
   - Correlation ID for debugging
   - Internal logging only (no sensitive data in response)

**Logging Requirements:**
- All exceptions logged with correlation_id
- Include: timestamp, user_id, request path, exception type, stack trace
- **Never log:** Passwords, tokens, sensitive user data

---

## 10. Rate Limiting & Abuse Protection Strategy

### 10.1 Current Status
- **Rate Limiting:** Not implemented (v1.0.0)
- **Abuse Protection:** Not implemented (v1.0.0)

### 10.2 Future Implementation Plan

**Location:** API Gateway Service (`app/main.py` or middleware)

**Strategy:**
- **Per-User Rate Limiting:** Based on authenticated user_id
- **Per-IP Rate Limiting:** Fallback for unauthenticated endpoints
- **Endpoint-Specific Limits:** Different limits for different operations
  - Content creation: 100/hour per user
  - Content approval: 50/hour per admin
  - Audit log queries: 1000/hour per admin

**Implementation Approach:**
- **Non-Blocking Design:** Rate limiting checks before service layer
- **Storage:** Redis (in-memory, fast)
- **Algorithm:** Token bucket or sliding window
- **Response:** HTTP 429 (Too Many Requests) with `Retry-After` header

**Rate Limit Headers (Future):**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time when limit resets

**Abuse Protection:**
- **IP Blocking:** Temporary blocks for repeated violations
- **User Account Suspension:** For persistent abuse
- **Audit Logging:** All rate limit violations logged

**Non-Blocking Principle:**
- Rate limiting happens **before** service layer execution
- No database queries for rate limit checks (Redis only)
- Fast failure (no resource waste)

---

## 11. File & Media Strategy (Post-MVP)

**Deferred:** Media/File service (upload, storage, processing) is **post-MVP** per [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md). MVP remains text-only content.

### 11.1 Current Restrictions
- **ContentService:** ❌ Cannot access filesystem
- **API Gateway:** ❌ Cannot access filesystem (except logs)
- **No Media Storage:** Content is text-only (title + body)

### 11.2 Future Media Service Design

**Separate Service Architecture:**
- **Service Name:** Media Management Service
- **Location:** Separate service/module (not in ContentService)
- **Purpose:** Handle file uploads, storage, retrieval, processing

**Media Service Responsibilities:**
- File upload handling (multipart/form-data)
- File storage (object storage: S3, Azure Blob, or local filesystem)
- File retrieval (signed URLs for secure access)
- Image processing (resizing, thumbnails, watermarks)
- File validation (type, size, virus scanning)

**Integration with Content Service:**
- **No Direct Integration:** ContentService does not handle files
- **Reference Only:** Content stores media references (URLs or IDs)
- **Async Processing:** Media upload/processing is asynchronous
- **Webhook Pattern:** Media service notifies ContentService when processing complete

**Storage Strategy:**
- **Database:** Store metadata only (filename, size, type, storage_path)
- **Object Storage:** Actual files in S3/Azure Blob/local storage
- **Never in Database:** Binary files never stored in SQLite/PostgreSQL

**Content-Media Relationship:**
- Content can reference multiple media items
- Media items can be shared across content
- Media deletion requires approval (if referenced by approved content)

**Future Implementation Notes:**
- Media service will be separate Docker container
- Communication via REST API or message queue
- No impact on existing ContentService code
- ContentService remains filesystem-agnostic

---

## 12. Backup & Data Retention Policy

### 12.1 Backup Strategy

**Database Backups:**
- **Frequency:** Daily full backups, hourly incremental backups (production)
- **Retention:** 30 days of daily backups, 7 days of hourly backups
- **Storage:** Off-site backup storage (separate from primary database)
- **Testing:** Monthly restore testing to verify backup integrity

**Audit Log Backups:**
- **Special Handling:** Audit logs included in database backups
- **Additional Archival:** Quarterly archival to long-term storage
- **Compliance:** Retained per regulatory requirements (7 years minimum)

### 12.2 Data Retention Policy

**Content Data:**
- **Active Content:** Retained indefinitely (no automatic deletion)
- **Draft Content:** Retained for 1 year, then archived
- **Rejected Content:** Retained for 2 years, then soft-deleted (metadata only)
- **Approved Content:** Retained indefinitely (compliance requirement)

**Audit Logs:**
- **Retention Period:** **NEVER DELETE** (immutable compliance requirement)
- **Active Storage:** Last 2 years in primary database
- **Archival:** Older than 2 years moved to archival storage
- **Query Access:** Archived logs queryable via separate archival service
- **Deletion Policy:** **NEVER** - Audit logs are permanent records

**User Data:**
- **Active Users:** Retained while account is active
- **Inactive Users:** Soft-deleted after 2 years of inactivity
- **Deleted Users:** User record soft-deleted, content ownership preserved
- **GDPR Compliance:** User data deletion requests handled manually (future: automated)

**Soft Delete Pattern:**
- **Content:** `is_deleted` flag (not physically deleted)
- **Users:** `is_active = False` (not physically deleted)
- **Audit Logs:** **No soft delete** (truly immutable)

### 12.3 Archival Strategy

**Archival Trigger:**
- Content older than retention period
- Audit logs older than 2 years
- Automated archival jobs (scheduled)

**Archival Storage:**
- **Format:** Compressed database dumps or CSV exports
- **Location:** Long-term object storage (S3 Glacier, Azure Archive)
- **Access:** Read-only, queryable via archival service

**Restoration Process:**
- Archived data can be restored to staging environment
- Production restores require approval
- Restoration time: 24-48 hours for cold storage

---

## 13. Future Architecture Considerations

**MVP scope:** Current monolithic FastAPI is correct for MVP. Microservices split and Media/File service are **deferred to post-MVP** (see [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md)).

### 13.1 Microservices Split (Post-MVP only)
Not in MVP. If splitting later:
- **API Gateway** → Standalone FastAPI service
- **Content Service** → Separate service with REST API
- **Audit Service** → Separate service with REST API
- **User Service** → Separate service with REST API
- **Message Queue** → For async audit logging
- **Service Mesh** → For service-to-service communication

### 13.2 Database Migration
- **Current:** SQLite (development)
- **Production:** PostgreSQL (change DATABASE_URL)
- **No code changes required** (SQLAlchemy abstraction)

### 13.3 External Integrations
- **Meta/Facebook:** Implemented within monolith (OAuth, page tokens) per ROADMAP_AND_PRODUCT.md.
- **Media/File service:** Deferred to post-MVP (no file upload/storage in MVP).
- **Webhooks / Email:** Future; separate notification service when needed.

---

## 14. Architecture Lock Status

**This document is LOCKED.**

**To modify this architecture:**
1. Create architecture change request
2. Review impact on all services
3. Update this document with version control
4. Get approval from architecture review board

**Version History:**
- **v1.0.1** (2024) - Fixed transaction consistency, added exception handling, rate limiting, media strategy, backup policy
- **v1.0.0** (2024) - Initial locked architecture

---

## Appendix A: Service Communication Matrix

| From Service | To Service | Method | Purpose |
|-------------|------------|--------|---------|
| API Gateway | ContentService | Function call | Content operations |
| API Gateway | UserService | Function call | User operations |
| API Gateway | Database | Direct query | Audit log reads |
| ContentService | AuditService | Function call | Log content actions |
| UserService | AuditService | Function call | Log user actions (future) |
| AuditService | Database | Direct query | Write audit logs |

**Rules:**
- ✅ Function calls allowed (same process)
- ✅ Direct database queries for read-only operations
- ❌ HTTP calls between services (not needed in monolith)
- ❌ Message queues (not implemented)
- ❌ Event bus (not implemented)

---

## Appendix B: Technology Versions (Locked)

- **Python:** 3.11 (exact version required)
- **FastAPI:** 0.104.1
- **SQLAlchemy:** 2.0.23
- **Pydantic:** 2.5.0
- **Uvicorn:** 0.24.0

**Dependency updates require architecture review.**

---

**END OF ARCHITECTURE DOCUMENT**
