# Documentation Index

**Core docs:** ARCHITECTURE, PROJECT_STATUS_SUMMARY, ROADMAP_AND_PRODUCT, IMPLEMENTATION_AND_REMAINING_DETAIL, GIT_SYNC_GUIDE.  
Stack: Python/FastAPI. Scaling/MVP scope: ROADMAP_AND_PRODUCT.md.

---

## 📚 Documents

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Locked architecture: services, APIs, data flow, rules |
| [PROJECT_STATUS_SUMMARY.md](./PROJECT_STATUS_SUMMARY.md) | Current status, completed, pending work |
| [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md) | Meta SaaS, token lifecycle, multi-tenancy, Viral Content Engine, MVP vs post-MVP, next focus |
| [IMPLEMENTATION_AND_REMAINING_DETAIL.txt](./IMPLEMENTATION_AND_REMAINING_DETAIL.txt) | Kya implement ho chuka hai, kya baki hai (complete detail) |
| [META_APP_REVIEW.md](./META_APP_REVIEW.md) | Meta App Review: permissions, token handling, scope minimization |
| [GIT_SYNC_GUIDE.md](./GIT_SYNC_GUIDE.md) | Kya Git me sync karna hai, kya ignore karna hai |

---

## 🗂️ Structure

```
docs/
├── README.md                           # This file
├── ARCHITECTURE.md
├── PROJECT_STATUS_SUMMARY.md
├── ROADMAP_AND_PRODUCT.md
├── IMPLEMENTATION_AND_REMAINING_DETAIL.txt
├── META_APP_REVIEW.md                  # Meta App Review (permissions, compliance)
└── GIT_SYNC_GUIDE.md
```

---

## Quick links

| Need | Document |
|------|----------|
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Status / pending | [PROJECT_STATUS_SUMMARY.md](./PROJECT_STATUS_SUMMARY.md) |
| Roadmap / MVP / Meta / VCE | [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md) |
| Done vs remaining (detail) | [IMPLEMENTATION_AND_REMAINING_DETAIL.txt](./IMPLEMENTATION_AND_REMAINING_DETAIL.txt) |
| Git sync | [GIT_SYNC_GUIDE.md](./GIT_SYNC_GUIDE.md) |

---

## Phase-wise process (mandatory)

Implementation will proceed **strictly phase-wise**.

**Authoritative tracking document (single source of truth):**  
**[IMPLEMENTATION_AND_REMAINING_DETAIL.txt](./IMPLEMENTATION_AND_REMAINING_DETAIL.txt)**  
This is the single source of truth for what is implemented vs remaining. **Every completed item must be updated here before moving forward.**

**Reference order (must follow):**

| Order | Document | Use |
|-------|----------|-----|
| 1 | [ROADMAP_AND_PRODUCT.md](./ROADMAP_AND_PRODUCT.md) | Product model, next focus, Meta SaaS, token lifecycle, multi-tenancy, VCE, automation rules. |
| 2 | [ARCHITECTURE.md](./ARCHITECTURE.md) | Services, APIs, data flow, DB schema, security — all implementation must comply. |
| 3 | [IMPLEMENTATION_AND_REMAINING_DETAIL.txt](./IMPLEMENTATION_AND_REMAINING_DETAIL.txt) | Checklist: what is done (PART 1), what is remaining (PART 2). Update this file when an item is completed. |
| 4 | [PROJECT_STATUS_SUMMARY.md](./PROJECT_STATUS_SUMMARY.md) | High-level status only; not the tracking source. |

**Cursor rules:** All rules in `.cursor/rules/*.mdc` must be **followed strictly** (Meta compliance, architecture, token security, code conduct).

---

**Last Updated:** February 2025. Phases 1–8 complete (OAuth, page tokens, scheduler, Meta compliance, VCE, share-psychology, pytest); tracking in IMPLEMENTATION_AND_REMAINING_DETAIL.txt.
