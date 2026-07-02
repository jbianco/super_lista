# Security Analysis

## 1. Qualitative Risk Assessment

| ID | Risk | Severity | Likelihood | Impact | Mitigation Status |
|----|------|----------|------------|--------|-------------------|
| R01 | Plaintext credential storage in localStorage | **Critical** | High | Attacker with browser access reads all store credentials | **Mitigated** (credentials moved to in-memory React state, `sl_creds` removed) |
| R02 | Credentials transmitted over HTTP | **High** | Medium | MITM attacker intercepts login credentials | **Partially mitigated** (credentials never persisted, sent only on cart action) |
| R03 | No authentication/authorization on API | **High** | Medium | Anyone can call backend endpoints | **Partially mitigated** (JWT auth implemented, endpoints use `get_optional_user`) |
| R04 | CORS allows localhost:5173 only | **Medium** | Low | Limits cross-origin attacks | **Mitigated** (CORS configurable via `CORS_ORIGINS` env var) |
| R05 | SQLite database exposed on filesystem | **Medium** | Low | Local attacker reads superlista.db | **Not mitigated** |
| R06 | No input sanitization on API queries | **Medium** | Low | Potential injection via query parameter | **Mitigated** (query sanitization: alphanumeric + Spanish chars, max 100 chars) |
| R07 | localStorage data readable by any script on the domain | **High** | Medium | XSS attack leaks all user data | **Mitigated** (CSP enforced via `<meta>` tag, no sensitive data in localStorage) |
| R08 | No HTTPS in development | **Low** | High | MITM in dev | Accepted (dev only) |
| R09 | Playwright automation stores no credentials | **Low** | Low | Credentials passed in memory only | **Mitigated** |
| R10 | No rate limiting on API endpoints | **Medium** | Low | API abuse / DoS | **Mitigated** (slowapi: 60/min global, 10/min register, 20/min login) |
| R11 | No audit trail of API requests | **Low** | Low | Cannot detect abuse patterns | **Mitigated** (HTTP middleware logs METHOD /path STATUS DURATIONms) |

---

## 2. Library Versions & Security Posture

### Frontend

| Library | Version | Known CVEs | Notes |
|---------|---------|-----------|-------|
| react | 19.2.6 | None current | Active maintenance, regular security patches |
| react-dom | 19.2.6 | None current | Same as react |
| axios | 1.16.1 | None current | CSRF protection via XSRF-TOKEN header available but not configured |
| lucide-react | 1.16.0 | None | Pure SVG icons, no network requests |
| typescript | 6.0.2 | N/A | Compile-time only, no runtime impact |
| vite | 8.0.12 | None current | Dev server has known warnings (exposed source maps in dev) |
| eslint | 10.3.0 | N/A | Linting only, no runtime |

### Backend

| Library | Version | Known CVEs | Notes |
|---------|---------|-----------|-------|
| fastapi | 0.136+ | None current | Automatic input validation, OpenAPI docs |
| uvicorn | 0.34+ | None current | ASGI server, no known RCE |
| sqlmodel | 0.0.22+ | Depends on SQLAlchemy | Uses parameterized queries — no SQL injection risk |
| httpx | 0.28+ | None current | HTTP client, no server exposure |
| beautifulsoup4 | 4.14+ | None current | HTML parser only |
| playwright | 1.59+ | None current | Browser automation, no known RCE |
| python-jose | 3.5+ | None current | JWT library, not yet in use |
| passlib[bcrypt] | 1.7.4+ | None current (bcrypt) | Password hashing, not yet in use |
| python-multipart | 0.0.28+ | None current | Form parsing |
| pydantic-settings | 2.14+ | None current | Settings management |
| pytest | 8.3+ | N/A | Testing only |

---

## 3. Vulnerability Analysis by Component

### 3.1 localStorage (Frontend)

```
Key: sl_creds
Data: { "Carrefour": { "email": "user@x.com", "password": "mypass", "auth_method": "password" } }
Risk: PLAINTEXT PASSWORD STORAGE
```

**Attack Scenarios:**
1. **XSS**: An attacker injects a script tag → `JSON.parse(localStorage.getItem('sl_creds'))` → exfiltrates credentials
2. **Physical access**: Anyone with access to the machine can open DevTools → Application → Local Storage → reads all credentials
3. **Same-origin script injection**: Any browser extension with `storage` permission can read all localStorage data
4. **Malicious npm dependency**: A compromised dependency with access to the DOM reads localStorage

**Recommendations:**
- Never store passwords in localStorage. Use a server-side session + JWT instead.
- For store credentials specifically, offer OAuth redirect flow instead of collecting passwords directly.
- If local storage is required, encrypt the data before storing (using Web Crypto API with a derived key).
- Add `X-Content-Type-Options: nosniff` and `Content-Security-Policy` headers.

### 3.2 API Transport (Frontend ↔ Backend)

```
Protocol: HTTP (dev) / Not configured for HTTPS (prod)
Data in transit: Credentials, shopping lists, cache queries
```

**Attack Scenarios:**
1. **MITM (dev)**: Developer's machine on public Wi-Fi → attacker intercepts `POST /api/cart` containing plaintext credentials
2. **DNS spoofing**: Attacker redirects `localhost:8000` to a malicious server

**Recommendations:**
- Use HTTPS in production (LetsEncrypt + reverse proxy like Caddy/Nginx).
- Add HSTS headers.
- Never expose the API directly to the internet without a reverse proxy.

### 3.3 API Authentication

```
Current state: NO AUTHENTICATION
Any client with network access to the FastAPI server can call all endpoints.
```

**Attack Scenarios:**
1. **Unauthorized cache poisoning**: External caller sends requests to `/api/budget` → triggers VTEX API calls and populates cache with attacker-chosen data
2. **Resource exhaustion**: Repeated calls to `/api/savings-plan` with large item lists trigger parallel VTEX API calls (up to 4 stores × 20 queries × 20 products = 1600 API calls per request)

**Recommendations:**
- Implement API key authentication for all endpoints.
- Add rate limiting per IP address.
- Add request size limits (max items per request).

### 3.4 SQLite Database

```
File: backend/superlista.db
Data: Product cache, User models (unused), StoreCredentials (unused)
Permissions: Default filesystem permissions
```

**Attack Scenarios:**
1. **Local file read**: Attacker with filesystem access reads `superlista.db` → accesses cached product data
2. **SQL injection**: Although SQLModel uses parameterized queries, any future raw SQL would be vulnerable

**Recommendations:**
- Restrict file permissions on `superlista.db` (`chmod 600`).
- Move credentials table to a separate encrypted database.
- Never use raw SQL — always use SQLModel/SQLAlchemy parameterized queries.

### 3.5 VTEX API Calls

```
External calls to supermarket catalog APIs.
Query is passed as a URL path segment.
```

**Attack Scenarios:**
1. **Path traversal via query**: Malicious query like `../../../etc/passwd` could theoretically be passed to the VTEX API. However, VTEX handles encoding and the query is URL-encoded by `httpx`.

**Recommendations:**
- Sanitize query parameter: remove path traversal characters (`..`, `/`).
- Add query length limits.
- Validate response from VTEX API before processing.

### 3.6 CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Risk Level: LOW** in current state (only localhost:5173 allowed).  
**Risk Level: HIGH** if `allow_origins=["*"]` is used in production, as any website could make API calls from the user's browser.

**Recommendations:**
- Keep strict origin whitelist.
- Never use `allow_origins=["*"]` in production.
- Use environment variables to configure allowed origins per environment.

---

## 4. Data Flow Security Analysis

```
User Input (browser)
  │
  ▼
localStorage (sl_creds, sl_lists)
  │  ▲ No encryption. XSS = total compromise.
  │  │
  │  └─── persistOnChange ───┘
  │
  ▼
axios POST /api/budget
  │  ▲ No auth token. Anyone can call.
  │  │
  │  └─── HTTP (dev) / Potential HTTPS (prod) ───┘
  │
  ▼
FastAPI BudgetService
  │
  ├──→ scrapper vtex.py → httpx → VTEX API (external HTTPS)
  │     │  ▲ No API key for VTEX (public endpoint)
  │     │
  │     └─── SQLite cache (superlista.db) ───┘
  │
  └──→ returns JSON to frontend
        │
        ▼
      React renders comparison table
```

### Security Boundaries

| Boundary | Secure? | Notes |
|----------|---------|-------|
| Browser → localStorage | **No** | Plaintext, no CSP, XSS-vulnerable |
| Browser → Backend (transport) | **No** | HTTP in dev, no HTTPS configured for prod |
| Backend → FastAPI handlers | **No** | No authentication, no rate limiting |
| FastAPI → SQLite | **Yes** | Parameterized queries via SQLModel |
| FastAPI → VTEX API | **Yes** | HTTPS, no auth needed (public API) |
| Frontend render | **No** | No XSS protection (dangerous `dangerouslySetInnerHTML` not used) |

---

## 5. Secure Development Recommendations

### Immediate (High Priority)

1. **Encrypt credentials in localStorage**
   - Use Web Crypto API with a key derived from a user-provided master password
   - Or remove password storage entirely — use OAuth redirect for each store

2. **Add Content Security Policy (CSP)**
   - Add `<meta http-equiv="Content-Security-Policy">` to `index.html`
   - Restrict script sources, block inline scripts

3. **Add API authentication**
   - Simple API key for server-side endpoints
   - Rate limiting middleware

4. **HTTPS in production**
   - Configure reverse proxy with TLS
   - HSTS headers

### Short-term (Medium Priority)

5. **Use `passlib[bcrypt]` and `python-jose` for auth**
   - Implement user registration/login endpoints
   - Hash passwords with bcrypt before storing
   - Issue JWT tokens for API authentication
   - Never send raw passwords to the frontend

6. **Sanitize all user inputs**
   - Validate query length (< 100 chars)
   - Strip path traversal characters
   - Add request validation limits

7. **Secure SQLite file**
   - `chmod 600 superlista.db`
   - Store in a non-web-accessible directory
   - Consider SQLCipher for encryption

### Long-term (Low Priority)

8. **Implement OAuth for supermarket credentials**
   - Redirect users to supermarket OAuth login
   - Store refresh tokens server-side (encrypted)
   - Never expose tokens to frontend JavaScript

9. **Add audit logging**
   - Log all API requests (anonymized)
   - Monitor for unusual patterns (rate spikes)

10. **Penetration testing**
    - Regular automated security scanning
    - Manual penetration testing before production release

---

## 6. Current Security Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Authentication | **6/10** | JWT auth implemented, register/login/me endpoints, `get_optional_user` on all routes |
| Credential Storage | **7/10** | Moved from localStorage to server DB; in-memory only on frontend |
| Transport Security | **3/10** | HTTPS available but not enforced |
| XSS Protection | **7/10** | CSP enforced via `<meta>` tag, query sanitization |
| CSRF Protection | **2/10** | No CSRF tokens |
| SQL Injection | **9/10** | Parameterized queries via SQLModel |
| Dependency Security | **8/10** | Modern libraries, no known CVEs, minimal attack surface |
| Access Control | **4/10** | JWT auth available, endpoints work both authed and unauthed |
| Rate Limiting | **7/10** | slowapi: 60/min global, 10/min register, 20/min login |
| Audit Trail | **6/10** | HTTP middleware logs all requests (method, path, status, duration) |

**Overall Score: 5.9/10**

The project has improved significantly from 2.3/10. Key improvements: CSP + input sanitization, rate limiting, JWT authentication, removal of credential persistence in localStorage, audit logging, and configurable CORS. Remaining gaps: HTTPS enforcement, CSRF protection, database encryption, and OAuth for supermarket credentials.
