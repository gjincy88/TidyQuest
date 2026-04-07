# TidyQuest v0.5.0-beta.3 Release Notes

> **Date:** 2026-04-07

Bug fix release addressing dashboard label inconsistencies.

---

## Bug Fixes

- **#88**: Dashboard titles "Coins status" and "Reward requests" now use consistent Title Case ("Coins Status", "Reward Requests") matching all other dashboard section titles
- **#86**: Customise menu now shows "Leaderboard" instead of "This Week" for the leaderboard section — the label no longer changes with the selected time period

---

## Upgrade from beta.2

1. Pull the new Docker image: `docker pull mellowfox/tidyquest:0.5.0-beta.3`
2. Restart the container
3. No database migrations required

---

# TidyQuest v0.5.0-beta.2 Release Notes

> **Date:** 2026-04-01

Bug fix release addressing 10 community-reported issues plus security dependency updates.

---

## Bug Fixes

- **#67**: Countdown timer no longer shows "_h 60m" — `Math.ceil` replaced with `Math.floor` for remaining minutes (via PR #80 by @stonkage)
- **#68**: Template task names now display human-friendly translated names instead of raw identifiers
- **#69**: Template task labels now have proper minimum tap target size (44px) on mobile
- **#70**: Customise home screen modal now uses an X close button instead of Cancel (via PR #80 by @stonkage)
- **#71**: Task add form row now has minimum height to prevent layout shift (via PR #80 by @stonkage)
- **#72**: Adding a task with an empty title now shows a red error message instead of silently failing
- **#73**: Task edit form now auto-focuses the name field and prevents saving with empty title
- **#75**: "Overdue" label no longer appears while health is still above 0% — aligned with server-side health calculation
- **#78**: Hamburger menu icon now visible in dark/night theme (via PR #80 by @stonkage)
- **#79**: Username login is now case-insensitive — "John" and "john" match the same account

## New Features

- **#65**: Goal completion now works — goals are automatically marked as completed when earned coins reach the target. Dashboard shows a "Completed!" badge on achieved goals.

---

## Security

- **path-to-regexp** 0.1.12 → 0.1.13 (fixes CVE-2026-4867, via PR #81)
- **picomatch** 4.0.3 → 4.0.4 (fixes CVE-2026-33671 & CVE-2026-33672, via PR #77)

---

## Database Migrations

Two new columns added to `user_goals` table: `status` (default: 'active') and `completedAt`. Migrations run automatically on startup.

---

## Upgrade from beta.1

1. Pull the new Docker image: `docker pull mellowfox/tidyquest:0.5.0-beta.2`
2. Restart the container
3. Database migrations run automatically

---

## Community

Thank you to **@stonkage** for PR #80 fixing 4 CSS/UI bugs, and to **@gjincy88** for detailed bug reports!

Join our [Discord](https://discord.gg/ucXmKM6y) to discuss features and report issues.
