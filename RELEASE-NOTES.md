# TidyQuest v0.4.0 Release Notes

> **Date:** 2026-03-16

This release includes 10 new features, a complete UI redesign, security hardening, and community bug fixes.

---

## New Features

### Design System Redesign
- Unified CSS design system with consistent card styles, buttons, and spacing
- Responsive dashboard masonry layout (CSS columns)
- Improved mobile and tablet experience
- New warm color palette with CSS custom properties

### Per-User Vacation Mode
- Admins can now toggle vacation mode **per member** (not just globally)
- Each member has their own **return date**
- All vacation settings consolidated in a single Settings section
- Vacation freezes streak decay and task health on a per-user basis

### Strict Mode (Task Approval)
- New admin toggle: tasks require **admin approval** before completion counts
- Pending completions shown in Settings for admin review (approve/reject)
- Coins and streaks only awarded after approval

### Couple Mode (Gamification Toggle)
- Admins can **disable gamification** entirely (coins, streaks, leaderboard)
- Ideal for couples who want task tracking without competition
- Dashboard, rewards, and leaderboard sections hidden when disabled

### Unified Notification Settings
- Notifications section redesigned with a **master toggle** and hierarchical layout
- When enabled: notification time picker, notification type checkboxes (task due, reward requests, achievements)
- **Telegram** and **ntfy** are now sub-toggles under the master toggle
- Each provider expands its own configuration fields and Save/Test buttons
- Validation: at least one provider must be enabled when notifications are on
- Notification types are always visible regardless of gamification mode

### ntfy Notifications
- Added **ntfy** as a notification provider alongside Telegram
- Configure via Settings with server URL and topic
- Same notification types: daily due tasks, reward requests, achievements

### Admin Password Recovery
- New `ADMIN_RESET_PASSWORD` environment variable
- Set it, restart the container, and the first admin's password is reset
- One-shot mechanism: env var is cleared from memory after use

### Task Delete Confirmation
- Confirmation dialog before deleting a task (prevents accidental deletions)

### Admin Edit Predefined Rewards
- Admins can now customize coin costs of preset rewards

### Version Display
- Software version now shown in Settings page (General card)

### Integration Tests & CI
- API integration test suite using Vitest + Supertest
- GitHub Actions CI workflow runs tests on push and pull requests

### Docker Security
- Container now runs as non-root user (`node`) by default
- Entrypoint script auto-fixes volume permissions on first run

---

## Security Fixes

- **Multer** upgraded to 2.1.1 (fixes 3 high-severity DoS vulnerabilities)
- **Data export** no longer includes password hashes
- **Data import** never accepts password hashes from imported data; current admin credentials are always preserved
- **Rate limiting** on `/login` and `/register` endpoints (5 attempts / 15 min)
- **JWT secret** uses a random fallback in dev instead of a hardcoded string
- **ADMIN_RESET_PASSWORD** cleared from `process.env` immediately after use
- **Avatar uploads** restricted to `.jpg`, `.jpeg`, `.png`, `.webp` extensions only
- **Strict mode** pending validations guard now correctly checks `strictModeEnabled` (was `gamificationEnabled`)
- **Admin complete-task** loop wrapped in try/catch to prevent partial failures

---

## Bug Fixes

- **#25**: Avatar upload now shows error feedback with proper i18n messages
- **#28**: Task assignment label correctly says "Assign task" instead of "Assign room"
- **#34**: Dates use browser locale for formatting (DD/MM/YYYY or MM/DD/YYYY based on user's OS)
- **#36**: Deleting a task now refreshes dashboard data (no more stale values)
- **#23**: Task completion now enforces frequency cooldown — tasks can no longer be completed again before they are due (server-side 409 + client-side button disabled with countdown timer showing hours/minutes remaining)
- **#42**: Renaming a task now correctly clears the `translationKey`, so the custom name is displayed instead of the old translation
- **#43**: Week and day boundaries now use local timezone (via `TZ` env var) instead of UTC — fixes week resetting at wrong time for non-UTC users
- **#31**: All 44+ hardcoded hex colors across 13 component files replaced with CSS custom properties — night theme now has proper contrast throughout (status badges, health badges, icons, forms, history, rewards)
- **#37**: Old avatar files are deleted from disk when uploading a new one
- **Docker**: Fixed `SQLITE_CANTOPEN` / `SQLITE_READONLY` crash on first run with volume mounts

---

## Breaking Changes

None. This release is backward-compatible with v0.3.0 data.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** (production) | Secret key for JWT token signing. If not set, a random secret is generated at startup (tokens won't survive restarts) |
| `NODE_ENV` | Recommended | Set to `production` for production deployments |
| `TZ` | Recommended | Timezone for day/week boundary calculations (e.g. `Europe/Zurich`). Defaults to UTC if not set |
| `ADMIN_RESET_PASSWORD` | No | One-shot admin password recovery (cleared after use) |

---

## Known Limitations

- The `vacationEndDate` per-user is stored but not yet used for auto-disabling vacation

---

## Upgrade from v0.3.0

1. Pull the latest `main` branch
2. Set `JWT_SECRET` environment variable for persistent sessions
3. Set `TZ` environment variable to your local timezone (e.g. `-e TZ=Europe/Zurich`)
4. Rebuild and restart the container
5. Database migrations run automatically (new columns added idempotently)
6. No manual data migration required

---

## Testing Checklist

- [ ] Dashboard renders correctly with gamification enabled/disabled
- [ ] Per-user vacation toggles work independently
- [ ] Per-user return dates save correctly
- [ ] Strict mode approval flow works end-to-end
- [ ] ntfy notifications deliver correctly
- [ ] Task delete confirmation appears before deletion
- [ ] Admin password recovery via env var works
- [ ] Preset reward coin editing saves correctly
- [ ] Design is responsive on mobile/tablet/desktop
- [ ] Data export does not contain password hashes
- [ ] Rate limiting blocks after 5 failed login attempts
- [ ] Avatar upload shows error on oversized files
- [ ] Date format matches browser/OS locale
- [ ] Tasks with health > 0 show next-due date instead of Done button
- [ ] Completing a not-yet-due task via API returns 409
- [ ] Night theme has readable contrast on all pages (login, history, rewards, rooms, settings)
