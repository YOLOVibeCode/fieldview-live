# Coach Workflow API Reference

Quick reference for the new coach/team manager endpoints.

---

## Owner Event Management

### Create Event
```http
POST /api/owners/me/orgs/:orgShortName/channels/:teamSlug/events
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "organizationId": "uuid",
  "channelId": "uuid",
  "startsAt": "2025-02-01T14:30:00Z",
  "urlKey": "optional-custom-key",  // Auto-generated if omitted
  "streamType": "mux_playback",     // Optional, inherits from channel
  "muxPlaybackId": "playback-id",   // Optional
  "accessMode": "public_free",       // Optional, inherits from channel
  "priceCents": 500                 // Optional, for pay_per_view
}
```

**Response**: `201 Created`
```json
{
  "id": "event-uuid",
  "canonicalPath": "/stormfc/2010/202502011430",
  "urlKey": "202502011430",
  "state": "scheduled",
  "startsAt": "2025-02-01T14:30:00Z"
}
```

### Update Event
```http
PATCH /api/owners/me/events/:eventId
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "startsAt": "2025-02-01T15:00:00Z",
  "state": "live",
  "muxPlaybackId": "new-playback-id"
}
```

### Go Live (Trigger Notifications)
```http
POST /api/owners/me/events/:eventId/go-live
Authorization: Bearer <owner_token>
```

**Response**: `200 OK`
```json
{
  "id": "event-uuid",
  "state": "live",
  "wentLiveAt": "2025-02-01T14:30:00Z"
}
```

**Side Effects**: Sends SMS/email notifications to all subscribers

### Get Event
```http
GET /api/owners/me/events/:eventId
Authorization: Bearer <owner_token>
```

### List Events
```http
GET /api/owners/me/orgs/:orgShortName/events?state=live&page=1&limit=20
Authorization: Bearer <owner_token>
```

---

## Organization Membership Management

### Add Member
```http
POST /api/owners/me/orgs/:orgShortName/members
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "email": "coach@example.com",
  "role": "coach"  // "org_admin" | "team_manager" | "coach"
}
```

### List Members
```http
GET /api/owners/me/orgs/:orgShortName/members
Authorization: Bearer <owner_token>
```

**Response**: `200 OK`
```json
{
  "members": [
    {
      "id": "membership-uuid",
      "ownerUserId": "user-uuid",
      "organizationId": "org-uuid",
      "role": "coach",
      "ownerUser": {
        "email": "coach@example.com"
      }
    }
  ],
  "total": 1
}
```

### Update Member Role
```http
PATCH /api/owners/me/members/:membershipId
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "role": "team_manager"
}
```

### Remove Member
```http
DELETE /api/owners/me/members/:membershipId
Authorization: Bearer <owner_token>
```

---

## Public Subscriptions

### Subscribe to Team/Event
```http
POST /api/public/subscriptions
Content-Type: application/json

{
  "email": "viewer@example.com",
  "phoneE164": "+1234567890",      // Optional
  "organizationId": "org-uuid",    // Required
  "channelId": "channel-uuid",     // Optional, for team subscription
  "eventId": "event-uuid",         // Optional, for event subscription
  "preference": "both"             // "email" | "sms" | "both"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "viewerId": "viewer-uuid",
  "message": "Subscribed successfully"
}
```

### Unsubscribe
```http
POST /api/public/unsubscribe
Content-Type: application/json

{
  "email": "viewer@example.com"
}
```

---

## Admin Payout Visibility

### List Purchases with Payout Breakdown
```http
GET /api/admin/purchases?recipientType=organization&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response**: `200 OK`
```json
{
  "purchases": [
    {
      "id": "purchase-uuid",
      "amountCents": 1000,
      "platformFeeCents": 100,
      "processorFeeCents": 30,
      "ownerNetCents": 870,
      "recipientType": "organization",
      "recipientOrganization": {
        "shortName": "STORMFC",
        "name": "Storm Football Club"
      },
      "status": "paid",
      "paidAt": "2025-01-30T14:30:00Z"
    }
  ],
  "total": 1
}
```

### Get Purchase Detail
```http
GET /api/admin/purchases/:purchaseId
Authorization: Bearer <admin_token>
```

**Response**: `200 OK`
```json
{
  "id": "purchase-uuid",
  "gross": 1000,
  "platformFee": 100,
  "processorFee": 30,
  "netToRecipient": 870,
  "recipientType": "organization",
  "recipientIdentity": {
    "type": "organization",
    "shortName": "STORMFC",
    "name": "Storm Football Club"
  },
  "viewer": {
    "email": "viewer@example.com"
  },
  "game": {
    "title": "Game Title"
  }
}
```

---

## Link Format Presets

### Preset A: `/{org}/{ageYear}`
Example: `/stormfc/2010`

### Preset B: `/{org}/{ageYear}/{urlKey}`
Example: `/stormfc/2010/202502011430`

### Preset C: `/{org}/{teamSlug}/{urlKey}` (Default)
Example: `/stormfc/2010/202502011430`

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "code": "too_small",
          "path": ["startsAt"],
          "message": "Start time is required"
        }
      ]
    }
  }
}
```

**Status Codes**:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate membership, etc.)
- `500` - Internal Server Error

---

## Authentication

All owner endpoints require:
```http
Authorization: Bearer <owner_token>
```

Admin endpoints require:
```http
Authorization: Bearer <admin_token>
```

Public endpoints require no authentication.

---

## Rate Limiting

- Owner endpoints: 60 requests/minute
- Public endpoints: 20 requests/minute
- Admin endpoints: 100 requests/minute

