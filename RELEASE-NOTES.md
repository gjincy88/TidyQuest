# TidyQuest v0.5.0 Release Notes

> **Date:** 2026-03-24

This release includes 5 new features (largely from community PRs by @stonkage), quality-of-life improvements, and CI fixes.

---

## New Features

### On-Demand Tasks (#17) — via PR #64 by @stonkage
- Tasks can now be marked as **On Demand** — no fixed schedule, completeable multiple times per day
- Optional **Show in Dashboard** toggle for on-demand tasks
- Calendar view excludes on-demand tasks (they have no schedule)

### Dashboard Restructure — via PR #64 by @stonkage
- Dashboard split into sections: **Ready to Complete**, **On Demand**, **Scheduled**, **Completed Today**
- **Card customization**: admin can show/hide any of 11 dashboard cards via the ⚙ button
- **Expand/collapse**: long task lists truncated at 7 items with "Show N more" button

### Points Badge (#33) — via PR #56 by @stonkage
- Points badge in page header next to coins and streak
- Click to cycle through periods: All Time → Week → Month → Year
- Points calculated from sum of approved task completion coins

### Avatar Login Screen (#32)
- Login page now shows user avatars — tap your avatar to log in
- Great for kids who find typing usernames difficult
- Classic username/password input still available as fallback
- New public endpoint `GET /api/auth/avatars` (no sensitive data exposed)

### Task Filter by Assignee (#24)
- **All / Mine** toggle on the dashboard's Today's Quests card
- "Mine" shows only tasks assigned to you + unassigned tasks
- Filter preference persisted in localStorage

### Pre-defined Tasks in Existing Rooms (#59)
- Admin can now add template tasks to any existing room via **Templates** button
- Shows same pre-defined tasks as room creation wizard
- Tasks already in the room are automatically excluded from the list

### Larger Leaderboard Avatars (#60) — via PR #64 by @stonkage
- Podium avatars sized by rank: 1st place 80px, 2nd 64px, 3rd 56px
- Ranked list avatars increased from 44px to 56px

---

## Bug Fixes

- **#58**: Calendar "due in days" now uses `Math.floor` instead of `Math.ceil` — tasks due today correctly show as "today" (via PR #64)
- **CI**: Fixed test workflow failing with "Cannot open database because the directory does not exist" — `createDatabase()` now creates the data directory automatically

---

## Dependencies

- **flatted** upgraded from 3.3.3 to 3.4.2 (fixes CWE-1321 prototype pollution)

---

## Breaking Changes

None. This release is backward-compatible with v0.4.x data. Two new columns (`onDemand`, `showInDashboard`) are added automatically with safe defaults.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** (production) | Secret key for JWT token signing |
| `NODE_ENV` | Recommended | Set to `production` for production deployments |
| `TZ` | Recommended | Timezone for day/week boundaries (e.g. `Europe/Zurich`) |
| `ADMIN_RESET_PASSWORD` | No | One-shot admin password recovery |

---

## Upgrade from v0.4.x

1. Pull the new Docker image: `docker pull mellowfox/tidyquest:0.5.0`
2. Restart the container
3. Database migrations run automatically

---

## Community

Thank you to **@stonkage** for 3 merged PRs covering on-demand tasks, dashboard restructure, points badge, and larger avatars!

Join our [Discord](https://discord.gg/ucXmKM6y) to discuss features and report issues.
