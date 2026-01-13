# 🔌 API Documentation - Authentication Endpoints

**Version:** 1.0.0  
**Base URL:** `https://api.fieldview.live`  
**Last Updated:** January 11, 2026

---

## 📋 Table of Contents

1. [Password Reset API](#password-reset-api)
2. [Viewer Refresh API](#viewer-refresh-api)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Error Responses](#error-responses)
6. [Schema Definitions](#schema-definitions)

---

## 🔐 Password Reset API

### Request Password Reset

Initiate a password reset for an owner user or admin account.

**Endpoint:** `POST /api/auth/password-reset/request`

**Request Body:**
```json
{
  "email": "user@example.com",
  "userType": "owner_user"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address (valid format) |
| `userType` | string | Yes | Either `"owner_user"` or `"admin_account"` |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account exists with that email, you will receive a password reset link."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Rate Limit:** 3 requests per hour per email

**Example:**
```bash
curl -X POST https://api.fieldview.live/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "userType": "owner_user"
  }'
```

---

### Verify Password Reset Token

Verify that a password reset token is valid and not expired.

**Endpoint:** `POST /api/auth/password-reset/verify`

**Request Body:**
```json
{
  "token": "64-character-hex-string"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Reset token from email (64 hex chars) |

**Success Response:** `200 OK`
```json
{
  "valid": true,
  "email": "user@example.com",
  "userType": "owner_user"
}
```

**Error Response:** `200 OK` (with valid: false)
```json
{
  "valid": false,
  "message": "Password reset link has expired or is invalid.",
  "error": "TOKEN_EXPIRED"
}
```

**Possible Error Codes:**
- `TOKEN_EXPIRED` - Token has expired (> 15 minutes for owner, > 10 minutes for admin)
- `TOKEN_ALREADY_USED` - Token has already been used
- `TOKEN_INVALID` - Token not found or malformed

**Example:**
```bash
curl -X POST https://api.fieldview.live/api/auth/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6..."
  }'
```

---

### Confirm Password Reset

Complete the password reset process with a new password.

**Endpoint:** `POST /api/auth/password-reset/confirm`

**Request Body:**
```json
{
  "token": "64-character-hex-string",
  "newPassword": "NewSecurePassword123!"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Reset token from email |
| `newPassword` | string | Yes | New password (see requirements below) |

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*(),.?":{}|<>)

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password has been reset successfully.",
  "userId": "user-uuid"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid token or password doesn't meet requirements
- `500 Internal Server Error` - Server error

**Side Effects:**
- Password is updated
- Token is marked as used
- All user sessions are invalidated
- `lastPasswordResetAt` is updated
- `passwordResetCount` is incremented
- For admins with MFA: `mfaResetRequired` is set to `true`

**Example:**
```bash
curl -X POST https://api.fieldview.live/api/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "newPassword": "MyNewPassword123!"
  }'
```

---

## 🎬 Viewer Refresh API

### Request Viewer Access Refresh

Request a new access token for a viewer whose access has expired.

**Endpoint:** `POST /api/auth/viewer-refresh/request`

**Request Body:**
```json
{
  "email": "viewer@example.com",
  "directStreamId": "stream-uuid",
  "gameId": "game-uuid",
  "redirectUrl": "/direct/tchs/soccer-game"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Viewer's email address |
| `directStreamId` | string | No | Direct stream UUID (optional) |
| `gameId` | string | No | Game UUID (optional) |
| `redirectUrl` | string | No | URL to redirect after verification |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account exists with that email, you will receive an access link."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `404 Not Found` - Stream not found (if directStreamId provided)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Rate Limit:** 3 requests per hour per email + stream/game combination

**Example:**
```bash
curl -X POST https://api.fieldview.live/api/auth/viewer-refresh/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "viewer@example.com",
    "directStreamId": "abc-123",
    "redirectUrl": "/direct/tchs/soccer-game"
  }'
```

---

### Verify Viewer Access Token

Verify a viewer refresh token and restore access.

**Endpoint:** `POST /api/auth/viewer-refresh/verify`

**Request Body:**
```json
{
  "token": "64-character-hex-string"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Refresh token from email (64 hex chars) |

**Success Response:** `200 OK`
```json
{
  "valid": true,
  "viewerIdentityId": "viewer-uuid",
  "email": "viewer@example.com",
  "redirectUrl": "/direct/tchs/soccer-game"
}
```

**Error Response:** `200 OK` (with valid: false)
```json
{
  "valid": false,
  "message": "Access link has expired or is invalid.",
  "error": "TOKEN_EXPIRED"
}
```

**Possible Error Codes:**
- `TOKEN_EXPIRED` - Token has expired (> 15 minutes)
- `TOKEN_ALREADY_USED` - Token has already been used
- `TOKEN_INVALID` - Token not found or malformed

**Side Effects:**
- Token is marked as used
- Viewer access is restored
- New viewer JWT is generated (if applicable)

**Example:**
```bash
curl -X POST https://api.fieldview.live/api/auth/viewer-refresh/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6..."
  }'
```

---

## 🔑 Authentication

### Public Endpoints

All authentication endpoints are **public** and do not require authentication:
- `/api/auth/password-reset/*`
- `/api/auth/viewer-refresh/*`

### Protected Endpoints

Other API endpoints may require authentication via JWT tokens:

**Authorization Header:**
```
Authorization: Bearer <jwt-token>
```

**Token Types:**
- **Owner/Admin:** Long-lived JWT (7 days)
- **Viewer:** Short-lived JWT (session-based)

---

## ⏱️ Rate Limiting

### Rate Limit Configuration

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| Password Reset Request | 3 requests | 1 hour | Per email + userType |
| Viewer Refresh Request | 3 requests | 1 hour | Per email + stream/game |

### Rate Limit Headers

```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1673456789
```

### Rate Limit Exceeded Response

**Status:** `429 Too Many Requests`

```json
{
  "error": "Too many password reset requests. Please try again later.",
  "retryAfter": 3600
}
```

**Retry Strategy:**
1. Check `retryAfter` value (seconds)
2. Wait specified duration
3. Retry request

---

## ❌ Error Responses

### Standard Error Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `TOKEN_EXPIRED` | 400 | Token has expired |
| `TOKEN_INVALID` | 400 | Token not found or malformed |
| `TOKEN_ALREADY_USED` | 400 | Token has been used |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `STREAM_NOT_FOUND` | 404 | Stream not found |
| `INTERNAL_ERROR` | 500 | Server error |

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `400` | Bad Request (validation error) |
| `404` | Not Found |
| `429` | Too Many Requests (rate limit) |
| `500` | Internal Server Error |

---

## 📦 Schema Definitions

### Password Reset Request Schema

```typescript
{
  email: string;          // Valid email format
  userType: "owner_user" | "admin_account";
}
```

### Password Reset Confirm Schema

```typescript
{
  token: string;          // 64-character hex string
  newPassword: string;    // Meets password requirements
}
```

### Viewer Refresh Request Schema

```typescript
{
  email: string;                    // Valid email format
  directStreamId?: string | null;   // UUID (optional)
  gameId?: string | null;           // UUID (optional)
  redirectUrl?: string | null;      // Relative URL (optional)
}
```

### Token Verify Schema

```typescript
{
  token: string;          // 64-character hex string
}
```

---

## 🧪 Testing

### Postman Collection

Import the Postman collection from:
```
/docs/postman/authentication-api.json
```

### Example Test Flows

**Password Reset Flow:**
```bash
# 1. Request reset
curl -X POST https://api.fieldview.live/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userType":"owner_user"}'

# 2. Verify token (from email)
curl -X POST https://api.fieldview.live/api/auth/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123..."}'

# 3. Confirm reset
curl -X POST https://api.fieldview.live/api/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123...","newPassword":"NewPass123!"}'
```

---

## 📚 Additional Resources

- [User Guide](./USER_GUIDE_AUTHENTICATION.md)
- [Security Checklist](../SECURITY_CHECKLIST.md)
- [Error Recovery Guide](../ERROR_RECOVERY_GUIDE.md)
- [Production Readiness](../PRODUCTION_READINESS_GUIDE.md)

---

**For API support, contact:** api-support@fieldview.live

