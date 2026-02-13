# Meta App Review – Permissions & Compliance

This document describes how the app uses Facebook Login and Graph API for **Meta App Review** and compliance.  
**Stack:** Single Meta App (one App ID + App Secret for the entire SaaS). No user-supplied App credentials.

---

## 1. Permissions Requested (Scope Minimization)

We request only the permissions needed for **page listing** and **scheduled posting**:

| Permission | Use in product |
|------------|-----------------|
| `pages_show_list` | Let the user see a list of Facebook Pages they manage so they can choose which page(s) to connect. |
| `pages_read_engagement` | Read page info and (future) engagement data for posting recommendations. |
| `pages_manage_posts` | Publish posts to the user’s Page when they schedule content (user-initiated only). |

We do **not** request: `publish_to_groups`, `ads_management`, `read_insights` (unless added later with clear use case), or any permission not listed above.

---

## 2. How We Use the Permissions

- **User connects account:** User clicks “Connect Facebook” in our app → redirect to Facebook Login (OAuth) → user grants the permissions above → we receive a user access token.
- **Page list:** We call `GET /me/accounts` with the user access token to show the user which Pages they manage. We store page access tokens **encrypted at rest** (one per page) to post on their behalf only when they have scheduled a post.
- **Posting:** Posts are created **only when the user has explicitly scheduled a post** in our app (date/time and page chosen by the user). We do not auto-post or decide posting frequency; we only execute the user’s schedule. Safety limits (e.g. cooldown, max posts per day per page) are enforced to avoid spam.

---

## 3. Token Handling (Security)

- **Storage:** All access tokens (user and page) are encrypted at rest using a server-side key (`TOKEN_ENCRYPTION_KEY`). Tokens are never logged or returned in API responses.
- **Single Meta App:** We use one App ID and App Secret (from environment variables). Users do not provide their own App ID/Secret.
- **OAuth only:** Users grant access only via the official Facebook Login flow; we do not collect or use Facebook passwords.

---

## 4. User Control & Transparency

- Users choose which Page(s) to connect and which content to schedule.
- Users set posting preferences (e.g. cooldown, max posts per day). Our “recommendations” (e.g. suggested time windows) are **advisory only**; the user decides when and what to post.
- Users can disconnect (revoke) access via Facebook settings; we do not retain tokens after they are invalidated.

---

## 5. References

- [Facebook Login – Permissions](https://developers.facebook.com/docs/facebook-login/permissions/)
- [Graph API – Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/)
- [App Review](https://developers.facebook.com/docs/app-review/)

---

**Last updated:** February 2025
