from app.api.routes import content, users, audit_logs, auth_facebook, meta_pages, scheduled_posts, cron, vce, auth, media

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(auth_facebook.router, prefix="/auth/facebook", tags=["auth"])
api_router.include_router(meta_pages.router, prefix="/meta/pages", tags=["meta-pages"])
api_router.include_router(scheduled_posts.router, prefix="/scheduled-posts", tags=["scheduled-posts"])
api_router.include_router(cron.router, prefix="/cron", tags=["cron"])
api_router.include_router(vce.router, prefix="/vce", tags=["vce"])

