# Roadmap & Product Definition

**Purpose:** Product model, Meta compliance, token lifecycle, multi-tenancy, Viral Content Engine, and MVP vs post-MVP.  
**Architecture:** Technical architecture remains in [ARCHITECTURE.md](./ARCHITECTURE.md). Current monolithic FastAPI is **correct for MVP** and is not split.

---

## 1. Meta-Compliant SaaS Model

- **Single Meta App** — One App ID + App Secret for the entire SaaS (no per-user App credentials).
- **OAuth-based user consent only** — Users grant permissions via Meta OAuth; no user-supplied App ID/Secret.
- **Page-level access tokens** — Per user, per page; obtained after user consent and stored securely.
- **App Review scope minimization** — Request only the permissions needed for posting and page management; document use for Meta App Review.

---

## 2. Token Lifecycle Management

- **Short-lived → long-lived user tokens** — Exchange short-lived user access token for long-lived (60 days); refresh before expiry where supported.
- **Page access token generation & storage** — For each page the user manages: obtain and store page access token; **encryption at rest** for all stored tokens (user and page tokens); associate with tenant/user and page.
- **Expiry handling** — Track token expiry; when expired or invalid, trigger re-auth flow (redirect to Meta OAuth) and do not use stale tokens.
- **Re-auth flow** — Clear or flag invalid token; prompt user to reconnect (OAuth); audit log token refresh/re-auth events.

---

## 3. Multi-Tenancy

- **Tenant = Account (MVP); User = Operator** — In MVP, one tenant per account (effectively one user per account); the user is the operator. Future: organization as tenant with multiple users/operators.
- **User → multiple pages** — One user can connect multiple Facebook pages; each page has its own page access token and optional settings.
- **Tenant isolation** — Content, pages, and tokens scoped by tenant (user_id in MVP); no cross-tenant data access.
- **Future: team support** — Later: org-level tenant, roles, shared pages; MVP stays user-scoped.

---

## 4. Viral Content Engine (Core Module)

Treated as a **core module** of the product (not optional):

- **Category rotation** — Rotate content categories (e.g. by day/period) so feed variety and relevance are maintained.
- **Hook-based templates** — Templates built around hooks (opening line, CTA) to improve engagement.
- **Share-psychology logic** — Content and timing tuned for shareability (e.g. emotion, utility, clarity).
- **Posting time intelligence** — User-defined preferred times/slots per page; system can suggest optimal times but **user controls frequency and schedule**.

---

## 5. Automation & Scheduling (User-Controlled)

**Principle:** The system must **NOT** force posting frequency or time. The platform provides **data-driven recommendations only**; final decision remains with the user. This keeps the platform Meta-safe and aligns with digital marketing best practices (e.g. Buffer/Hootsuite).

- **User-configurable posting preferences (per page)** — Each page has its own schedule (times, days, frequency). User sets when and how often to post; system does not impose a fixed schedule.
- **Scheduler as executor only when user enables/schedules** — The scheduler runs server-side and **executes a post only when the user has explicitly enabled or scheduled it**. It does not decide frequency, times, or whether to post on its own.
- **System enforces safety limits only** — Cooldowns (min interval between posts), max caps (e.g. max posts per day/page), and platform-safe defaults. User chooses within these limits.
- **Cron/automation runs server-side only** — Scheduled tasks on the backend; no client-side or browser-based execution.

---

## 5a. Posting Recommendation Engine

Data-driven **advisory** layer; all suggestions are **recommendations only**; final decision remains with the user.

- **Best time windows** — Suggest optimal posting time windows based on page history and engagement (e.g. when audience is most active). User may accept, ignore, or adjust.
- **Category × time matching** — Suggest pairings such as “motivation in mornings, truth/deep content in evenings” (or similar category–time patterns). Advisory only.
- **Safe frequency ranges per page maturity** — Suggest frequency ranges (e.g. 1–3 posts/day) based on page maturity/audience size; user sets actual frequency within safety limits.
- **All suggestions advisory** — No automatic application of recommendations; user explicitly chooses schedule and whether to use suggested slots. Keeps platform Meta-safe and aligned with digital marketing best practices.

---

## 6. MVP vs Post-MVP

### In scope for MVP

- Content Automation Platform core (content, approval workflow, audit logging, API) — **already implemented**.
- Facebook OAuth integration (single Meta App, user consent only).
- Token lifecycle (short-lived → long-lived, page tokens, expiry, re-auth).
- Multi-tenancy (tenant = user, user → multiple pages, tenant isolation).
- Viral Content Engine (category rotation, hook templates, share-psychology, posting time intelligence).
- **User-configurable automated posting** — Per-page preferences; scheduler executes **only when user enables/schedules** a post; system enforces safety limits only. **Posting Recommendation Engine** provides data-driven suggestions (time windows, category×time, frequency ranges); all advisory, user decides. See §5 and §5a.
- Meta review–ready compliance (scopes, docs, token handling).
- Monolithic FastAPI application (no microservices split).

### Deferred to post-MVP

- **Media/File service** — File upload, storage, media processing; not in MVP.
- **Microservices split** — Monolith remains for MVP; split only when justified by scale or product needs.

---

## 7. Next Focus (Priority Order)

1. **Facebook OAuth integration** — Single Meta App, OAuth flow, user consent only.
2. **Page token management** — Page access token generation, secure storage, association to user/page.
3. **User-configurable posting & scheduler** — Per-page preferences; scheduler executes only when user enables/schedules; safety limits only. **Posting Recommendation Engine** (advisory: time windows, category×time, frequency ranges). Integration with Viral Content Engine and approved content.
4. **Meta review–ready compliance** — Minimal scopes, documentation, token lifecycle, and re-auth behavior.

After these, continue with: Viral Content Engine refinement, audit logging for token/oauth events, and cron/automation hardening.

---

## 8. References

- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) — services, APIs, data flow, rules.
- **Stack:** Python/FastAPI; scaling add-ons (rate limit, cache, queue) when needed — same monolith.
- **Status & pending:** [PROJECT_STATUS_SUMMARY.md](./PROJECT_STATUS_SUMMARY.md).
- **Implemented vs remaining:** [IMPLEMENTATION_AND_REMAINING_DETAIL.txt](./IMPLEMENTATION_AND_REMAINING_DETAIL.txt).
