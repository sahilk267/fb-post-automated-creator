# Scheduled posts setup (Celery + Redis)

## Option A: All in Docker (recommended on Windows)

No need to install Redis or run Celery on the host. The repo’s `docker-compose.yml` includes `redis` and `celery` services.

### 1. Start API + Redis + Celery

```powershell
cd E:\FB_Page_Post_Creator
docker-compose up --build -d
```

This starts the API, Redis, and the Celery worker. The API and Celery use the same DB (`./data`) and the same Redis.

### 2. Add schedule columns (first time only)

After the first `docker-compose up`, the DB file is created. Then run the migration **inside** the api container (image must include `scripts`; we mount `./scripts` so it’s up to date):

```powershell
docker-compose run --rm api python -m scripts.add_schedule_columns
```

If you see “No module named scripts.add_schedule_columns”, rebuild and try again:

```powershell
docker-compose build --no-cache api
docker-compose run --rm api python -m scripts.add_schedule_columns
```

### 3. Verify schema (optional)

```powershell
docker-compose run --rm api python -m scripts.check_db_schema
```

You should see `content table: OK` and the list of tables. If any columns are missing, run step 2 again.

### 4. Use the app

Create content with “Schedule for” + “Publish to page”, submit for approval, approve → the Celery worker will run the task at the scheduled time.

---

## Option B: Run API + Celery on the host (Redis still needed)

### 1. Add schedule columns (if DB already exists)

**Local DB file** (e.g. `content_platform.db` in project root):

```powershell
cd E:\FB_Page_Post_Creator
python -m scripts.add_schedule_columns
```

If you use Docker for the API and the DB is only in `./data`, create it first (e.g. run the API once), then run the migration **in Docker** (see Option A step 2).

### 2. Start Redis

**Windows:** Redis is not installed by default. Use one of:

- **Docker:** `docker run -d -p 6379:6379 redis:7-alpine` (then use `CELERY_BROKER_URL=redis://localhost:6379/0`).
- **WSL:** Install Redis in WSL and run `redis-server`.
- **Memurai** (Redis-compatible): https://www.memurai.com/

**macOS / Linux:** `redis-server` or `brew services start redis` / `sudo systemctl start redis`.

### 3. Start the Celery worker

From project root, same Python env as the API:

```powershell
celery -A app.scheduler worker -l info
```

### 4. .env

```env
CELERY_BROKER_URL=redis://localhost:6379/0
```

---

## Database schema check (no duplication)

To verify the DB matches the models without making changes:

```powershell
python -m scripts.check_db_schema
```

This checks that the `content` table has all columns expected by `app.models.content.Content`. If any are missing, run `add_schedule_columns` (or apply Manual SQL below). Source of truth for schema: **app/models/** and this migration script.

---

## Manual SQL (if migration script is not used)

If the `content` table already exists and you prefer to add columns by hand (SQLite), add **all** of these (order does not matter; skip any that already exist):

```sql
ALTER TABLE content ADD COLUMN schedule_at DATETIME;
ALTER TABLE content ADD COLUMN schedule_meta_page_id INTEGER REFERENCES meta_pages(id);
ALTER TABLE content ADD COLUMN fb_page_id VARCHAR(64);
ALTER TABLE content ADD COLUMN fb_post_id VARCHAR(128);
ALTER TABLE content ADD COLUMN fb_status VARCHAR(32);
```

If `REFERENCES meta_pages(id)` fails, use:

```sql
ALTER TABLE content ADD COLUMN schedule_meta_page_id INTEGER;
```

Then create the index (optional but recommended):  
`CREATE INDEX ix_content_fb_page_id ON content (fb_page_id);`

---

## 5. End-to-end flow

1. **Start API** (e.g. `uvicorn app.main:app --reload` or `docker-compose up`).
2. **Start Redis** (see step 2).
3. **Start Celery worker** (see step 3).
4. In the UI:
   - **New content** → set **Schedule for** (date/time) and **Publish to page**.
   - Create the content (draft).
   - Submit for approval.
   - Admin **approves** → backend creates a `ScheduledPost` and enqueues a Celery task with `eta` = schedule time.
5. At the scheduled time, the **Celery worker** runs `publish_to_facebook_task`, posts to the page, and updates status to **Posted** or **Failed**.
6. **Dashboard** → “Scheduled posts” shows each item with status: **Scheduled**, **Processing**, **Posted**, or **Failed**.

---

## Troubleshooting

- **“Connection refused” to Redis**  
  Start Redis (`redis-server`) and ensure `CELERY_BROKER_URL` matches (host/port).

- **Task not running at schedule time**  
  Ensure the Celery worker is running and connected to the same broker. Check worker logs.

- **“Content must be APPROVED”**  
  Schedule is created only when content is approved. Create content with “Schedule for” + page, then submit and approve.

- **Columns already exist**  
  `add_schedule_columns` is idempotent; safe to run again.
