# ARM Health - API Documentation

## Overview

ARM Health provides REST APIs for medical authorization automation. All endpoints require authentication via Supabase.

**Base URL:** `https://your-domain.com/api`

---

## Authentication

All API requests require a valid Supabase session token passed as a cookie or in the `Authorization` header.

```bash
Authorization: Bearer <supabase_access_token>
```

---

## Endpoints

### Pre-Authorization

#### `POST /api/preauth`

Generate a Letter of Medical Necessity.

**Request Body:**
```json
{
  "extractedText": "Clinical notes content...",
  "specialty": "Orthopedics",
  "clinicType": "Outpatient",
  "cptCodes": ["99213", "29881"],
  "icdCodes": ["M23.41"],
  "payer": "Blue Cross",
  "patientRaw": {
    "name": "John Doe",
    "dob": "1980-01-01"
  },
  "providerRaw": {
    "npi": "1234567890",
    "clinicName": "ABC Clinic"
  }
}
```

**Response:**
```json
{
  "result": "Generated Letter of Medical Necessity...",
  "approval_likelihood": 85,
  "clinical_score": 85,
  "overall_status": "approved",
  "score_band": "likely_approval",
  "checklist": [...],
  "missing_info": [],
  "denial_risk_factors": []
}
```

**Error Responses:**
| Code | Description |
|------|-------------|
| 400 | Missing required fields |
| 401 | Authentication required |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

### Appeals

#### `POST /api/appeal`

Generate an appeal letter for a denied claim.

**Request Body:**
```json
{
  "denialReason": "Not medically necessary",
  "extractedText": "Supporting clinical documentation...",
  "cptCodes": ["29881"],
  "icdCodes": ["M23.41"],
  "patientRaw": { "name": "John Doe" },
  "providerRaw": { "npi": "1234567890" }
}
```

**Response:**
```json
{
  "result": "Generated Appeal Letter...",
  "approval_likelihood": 70,
  "appeal_summary": {
    "denial_reason_addressed": true,
    "evidence_strength": "strong",
    "appeal_recommended": true
  }
}
```

---

### PDF Parsing

#### `POST /api/parse-pdf`

Extract text from uploaded PDF files.

**Request:** `multipart/form-data`
```
file: <PDF file>
```

**Response:**
```json
{
  "text": "Extracted text content...",
  "pageCount": 3
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/preauth` | 10 requests/min |
| `/api/appeal` | 10 requests/min |
| All other endpoints | 60 requests/min |

When rate limited, the API returns:
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

Headers:
- `Retry-After`: Seconds until rate limit resets
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Seconds until window resets

---

## Error Handling

All errors follow this format:
```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error |

---

## Privacy & Security

- All clinical text is redacted (PHI removed) before AI processing
- No patient data is stored in the database
- Requests are not logged with sensitive content
- HTTPS required (HSTS enforced)

---

*ARM Health API v1.0*
