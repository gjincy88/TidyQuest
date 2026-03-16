# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

---

## 🛡️ Security Best Practices

### Before Deploying to Production

#### 1. **Set a Strong JWT Secret**

**⚠️ CRITICAL**: The JWT secret is used to sign authentication tokens. A weak or default secret compromises all user sessions.

```bash
# Generate a secure random secret
openssl rand -base64 32
```

**In docker-compose.yml:**
```yaml
environment:
  - JWT_SECRET=<your-generated-secret>
```

**Never commit secrets to version control.**

---

#### 2. **Set Your Timezone**

TidyQuest uses the `TZ` environment variable for day/week boundaries and notification scheduling. Without it, everything defaults to UTC.

```yaml
environment:
  - TZ=Europe/Paris
```

---

#### 3. **Use HTTPS with a Reverse Proxy**

TidyQuest should **never** be exposed directly to the internet over HTTP.

**Recommended setup:**
- Use Caddy, Nginx, or Traefik as a reverse proxy
- Obtain a valid TLS certificate (Let's Encrypt)
- Forward port 443 → TidyQuest container port 3000

**Example with Caddy:**
```
tidyquest.yourdomain.com {
    reverse_proxy localhost:3020
}
```

---

#### 4. **Notification Token Protection**

Telegram bot tokens and ntfy access tokens are stored **unencrypted** in the SQLite database.

**Mitigation:**
- Restrict file system access to the `./data/` directory
- Use proper file permissions: `chmod 600 data/tidyquest.db`
- Never expose the database file publicly
- Regularly back up and encrypt database backups

---

#### 5. **Database Backups**

**Location**: `./data/tidyquest.db`

```bash
# Manual backup
cp data/tidyquest.db backups/tidyquest-$(date +%Y%m%d).db

# Automated daily backup (crontab)
0 3 * * * cd /path/to/tidyquest && cp data/tidyquest.db backups/tidyquest-$(date +\%Y\%m\%d).db
```

**Note**: Data export (Settings → Export) never includes password hashes.

---

#### 6. **User Avatar Uploads**

**Current validation:**
- File extension whitelist: `.jpg`, `.jpeg`, `.png`, `.webp` only
- MIME type check: only `image/*` allowed
- File size limit: 2MB
- Old avatars are automatically deleted when replaced

---

#### 7. **Network Exposure**

**Default setup (Docker Compose):**
- Port `3020:3000` is exposed on all interfaces (`0.0.0.0`)

**For local-only access**, bind to localhost:
```yaml
ports:
  - "127.0.0.1:3020:3000"
```

---

#### 8. **Rate Limiting**

Login and registration endpoints are rate-limited (20 attempts per 15 minutes per IP) to prevent brute-force attacks.

---

#### 9. **Admin Password Recovery**

If you lose admin access, set the `ADMIN_RESET_PASSWORD` environment variable and restart. The first admin's password will be reset. The variable is cleared from memory immediately after use.

```yaml
environment:
  - ADMIN_RESET_PASSWORD=new-secure-password
```

**Remove the variable after recovery** — it's a one-shot mechanism.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in TidyQuest, please:

1. **Do NOT open a public GitHub issue**
2. Email the maintainer directly (see GitHub profile)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if applicable)

**Response time**: We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.

---

## 📋 Security Checklist

- [ ] `JWT_SECRET` set via environment variable (not default)
- [ ] `TZ` set to your local timezone
- [ ] HTTPS reverse proxy configured
- [ ] Database file permissions restricted (`chmod 600`)
- [ ] Regular backup strategy in place
- [ ] Firewall rules configured (only allow necessary ports)
- [ ] Docker image updated to latest version
- [ ] Notification tokens kept secret (Telegram / ntfy)
- [ ] `.env` file in `.gitignore` (verified not committed)

---

## 🔐 Authentication & Session Management

- **Algorithm**: JWT (JSON Web Tokens)
- **Token expiry**: 30 days
- **Password hashing**: bcrypt (10 rounds)
- **Authorization**: Role-based (admin, member, child)
- **Docker**: Container runs as non-root user (`node`) by default

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [SQLite Security Considerations](https://www.sqlite.org/security.html)

---

**Last updated**: 2026-03-16
