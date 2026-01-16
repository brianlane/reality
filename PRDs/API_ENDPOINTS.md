# Reality Matchmaking API Endpoints

**Base URL:** `https://realitymatchmaking.com/api`

---

## PUBLIC ROUTES

### Application Management

#### Create Application
```
POST /api/applications/create
```

**Description:** Create a new application (saves as DRAFT)

**Body:**
```json
{
  "userId": "user_abc123",
  "demographics": {
    "age": 28,
    "gender": "MALE",
    "location": "Phoenix, AZ",
    "occupation": "Software Engineer",
    "employer": "Tech Corp",
    "education": "Bachelor's Degree",
    "incomeRange": "$100,000-$150,000"
  },
  "questionnaire": {
    "religionImportance": 3,
    "politicalAlignment": "moderate",
    "familyImportance": 5,
    "careerAmbition": 4,
    // ... 80+ fields
  }
}
```

**Returns:**
```json
{
  "applicationId": "appl_xyz789",
  "status": "DRAFT"
}
```

---

#### Submit Application
```
POST /api/applications/submit
```

**Description:** Submit application (triggers payment flow)

**Body:**
```json
{
  "applicationId": "appl_xyz789"
}
```

**Returns:**
```json
{
  "paymentUrl": "https://checkout.stripe.com/pay/cs_...",
  "applicationId": "appl_xyz789"
}
```

---

#### Get Application Status
```
GET /api/applications/status/:id
```

**Description:** Get current application status

**Returns:**
```json
{
  "applicationId": "appl_xyz789",
  "status": "SCREENING_IN_PROGRESS",
  "screeningStatus": "IN_PROGRESS",
  "idenfyStatus": "PASSED",
  "checkrStatus": "IN_PROGRESS",
  "nextStep": "Background check in progress. You'll hear from us within 5-7 days.",
  "submittedAt": "2026-01-15T10:30:00Z"
}
```

---

#### Upload Profile Photo
```
POST /api/applications/upload-photo
```

**Description:** Upload profile photo to Supabase Storage

**Body:** `FormData` with image file

**Headers:**
```
Content-Type: multipart/form-data
```

**Returns:**
```json
{
  "photoUrl": "https://supabase.co/storage/v1/object/public/photos/user_abc123_1.jpg",
  "applicantId": "appl_xyz789"
}
```

---

### Payments

#### Create Checkout Session
```
POST /api/payments/create-checkout
```

**Description:** Create Stripe checkout session

**Body:**
```json
{
  "type": "APPLICATION_FEE" | "EVENT_FEE",
  "applicantId": "appl_xyz789",
  "eventId": "evt_abc123" // Only for EVENT_FEE
}
```

**Returns:**
```json
{
  "sessionUrl": "https://checkout.stripe.com/pay/cs_...",
  "sessionId": "cs_test_abc123"
}
```

---

#### Stripe Webhook
```
POST /api/webhooks/stripe
```

**Description:** Handle Stripe webhooks

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.failed`
- `checkout.session.completed`

**Headers:**
```
Stripe-Signature: t=...,v1=...
```

**Body:** Stripe event payload

**Internal Actions:**
- Update payment status in database
- Trigger background check workflows
- Send confirmation emails

---

## APPLICANT ROUTES (Protected - Clerk Auth)

### Dashboard

#### Get Dashboard Data
```
GET /api/applicant/dashboard
```

**Description:** Get applicant dashboard overview

**Returns:**
```json
{
  "application": {
    "id": "appl_xyz789",
    "status": "APPROVED",
    "submittedAt": "2026-01-15T10:30:00Z",
    "reviewedAt": "2026-01-18T14:20:00Z"
  },
  "upcomingEvents": [
    {
      "id": "evt_abc123",
      "name": "Phoenix Dating Experience - January",
      "date": "2026-02-01T19:00:00Z",
      "venue": "The Phoenician Resort",
      "invitationStatus": "ACCEPTED"
    }
  ],
  "matches": [
    {
      "id": "match_def456",
      "partnerId": "appl_xyz999",
      "partnerFirstName": "Sarah",
      "eventName": "Phoenix Dating Experience - December",
      "outcome": "FIRST_DATE_SCHEDULED",
      "createdAt": "2025-12-15T22:00:00Z"
    }
  ],
  "stats": {
    "eventsAttended": 1,
    "matchesReceived": 3,
    "datesCompleted": 1
  }
}
```

---

#### Get Events
```
GET /api/applicant/events
```

**Description:** Get all events applicant is invited to or attended

**Query Params:**
- `status` (optional): `UPCOMING` | `PAST`

**Returns:**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "name": "Phoenix Dating Experience - February",
      "date": "2026-02-01T19:00:00Z",
      "startTime": "2026-02-01T19:00:00Z",
      "endTime": "2026-02-01T22:30:00Z",
      "venue": "The Phoenician Resort",
      "venueAddress": "6000 E Camelback Rd, Scottsdale, AZ 85251",
      "capacity": 20,
      "invitationStatus": "ACCEPTED",
      "invitedAt": "2026-01-20T10:00:00Z"
    }
  ]
}
```

---

#### Get Matches
```
GET /api/applicant/matches
```

**Description:** Get all matches for applicant

**Query Params:**
- `outcome` (optional): Filter by outcome

**Returns:**
```json
{
  "matches": [
    {
      "id": "match_def456",
      "eventId": "evt_abc123",
      "eventName": "Phoenix Dating Experience - December",
      "partner": {
        "id": "appl_xyz999",
        "firstName": "Sarah",
        "age": 27,
        "occupation": "Marketing Manager",
        "photos": ["https://..."]
      },
      "type": "CURATED",
      "compatibilityScore": 87.5,
      "outcome": "FIRST_DATE_SCHEDULED",
      "contactExchanged": true,
      "createdAt": "2025-12-15T22:00:00Z"
    }
  ]
}
```

---

#### Update Match
```
POST /api/applicant/matches/:matchId/update
```

**Description:** Update match outcome or notes

**Body:**
```json
{
  "outcome": "SECOND_DATE",
  "notes": "Had a great time at dinner. Planning to see each other again next weekend."
}
```

**Returns:**
```json
{
  "match": {
    "id": "match_def456",
    "outcome": "SECOND_DATE",
    "updatedAt": "2026-01-16T09:15:00Z"
  }
}
```

---

## ADMIN ROUTES (Protected - Admin Role)

### Application Review

#### List Applications
```
GET /api/admin/applications
```

**Description:** List all applications with filters

**Query Params:**
- `status` (optional): Filter by ApplicationStatus
- `gender` (optional): Filter by gender
- `screeningStatus` (optional): Filter by screening status
- `page` (default: 1)
- `limit` (default: 20)
- `sortBy` (optional): `submittedAt` | `compatibilityScore`
- `sortOrder` (optional): `asc` | `desc`

**Returns:**
```json
{
  "applications": [
    {
      "id": "appl_xyz789",
      "firstName": "John",
      "lastName": "Doe",
      "age": 28,
      "gender": "MALE",
      "occupation": "Software Engineer",
      "applicationStatus": "SCREENING_IN_PROGRESS",
      "screeningStatus": "IN_PROGRESS",
      "compatibilityScore": null,
      "submittedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "pages": 8,
    "currentPage": 1,
    "perPage": 20
  },
  "stats": {
    "totalSubmitted": 156,
    "pending": 23,
    "approved": 98,
    "rejected": 15,
    "waitlist": 20
  }
}
```

---

#### Get Application Details
```
GET /api/admin/applications/:id
```

**Description:** Get detailed application with questionnaire

**Returns:**
```json
{
  "applicant": {
    "id": "appl_xyz789",
    "userId": "user_abc123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "age": 28,
    "gender": "MALE",
    "location": "Phoenix, AZ",
    "occupation": "Software Engineer",
    "employer": "Tech Corp",
    "education": "Bachelor's Degree",
    "incomeRange": "$100,000-$150,000",
    "incomeVerified": true,
    "applicationStatus": "SCREENING_IN_PROGRESS",
    "submittedAt": "2026-01-15T10:30:00Z",
    "photos": ["https://..."]
  },
  "questionnaire": {
    "religionImportance": 3,
    "politicalAlignment": "moderate",
    "familyImportance": 5,
    // ... all 80+ fields
    "aboutMe": "I'm a software engineer...",
    "idealPartner": "Someone who...",
    "responses": { /* full JSON */ }
  },
  "screening": {
    "screeningStatus": "IN_PROGRESS",
    "idenfyStatus": "PASSED",
    "idenfyVerificationId": "idenfy_abc123",
    "checkrStatus": "IN_PROGRESS",
    "checkrReportId": "checkr_xyz789",
    "backgroundCheckNotes": "Verification in progress"
  },
  "payments": [
    {
      "id": "pay_123",
      "type": "APPLICATION_FEE",
      "amount": 19900,
      "status": "SUCCEEDED",
      "createdAt": "2026-01-15T10:35:00Z"
    }
  ]
}
```

---

#### Approve Application
```
POST /api/admin/applications/:id/approve
```

**Description:** Approve application

**Body:**
```json
{
  "compatibilityScore": 85.5,
  "notes": "Great fit for upcoming events"
}
```

**Returns:**
```json
{
  "applicant": {
    "id": "appl_xyz789",
    "applicationStatus": "APPROVED",
    "reviewedAt": "2026-01-16T14:20:00Z",
    "compatibilityScore": 85.5
  }
}
```

**Side Effects:**
- Sends approval email to applicant
- Adds to eligible pool for event invitations
- Records admin action

---

#### Reject Application
```
POST /api/admin/applications/:id/reject
```

**Description:** Reject application

**Body:**
```json
{
  "reason": "Failed background check - criminal record"
}
```

**Returns:**
```json
{
  "applicant": {
    "id": "appl_xyz789",
    "applicationStatus": "REJECTED",
    "rejectionReason": "Failed background check",
    "reviewedAt": "2026-01-16T14:20:00Z"
  }
}
```

**Side Effects:**
- Sends rejection email (generic message, not specific reason)
- Records admin action

---

#### Move to Waitlist
```
POST /api/admin/applications/:id/waitlist
```

**Description:** Move application to waitlist

**Body:**
```json
{
  "reason": "Gender imbalance - too many male applicants this month"
}
```

**Returns:**
```json
{
  "applicant": {
    "id": "appl_xyz789",
    "applicationStatus": "WAITLIST",
    "reviewedAt": "2026-01-16T14:20:00Z"
  }
}
```

---

### Event Management

#### Create Event
```
POST /api/admin/events/create
```

**Description:** Create new event

**Body:**
```json
{
  "name": "Phoenix Dating Experience - February 2026",
  "date": "2026-02-01",
  "startTime": "2026-02-01T19:00:00Z",
  "endTime": "2026-02-01T22:30:00Z",
  "venue": "The Phoenician Resort",
  "venueAddress": "6000 E Camelback Rd, Scottsdale, AZ 85251",
  "capacity": 20,
  "costs": {
    "venue": 150000,      // $1,500 in cents
    "catering": 80000,    // $800
    "materials": 20000,   // $200
    "total": 250000       // $2,500
  },
  "expectedRevenue": 1498000, // 20 * $749 = $14,980
  "notes": "Valentine's themed event"
}
```

**Returns:**
```json
{
  "event": {
    "id": "evt_abc123",
    "name": "Phoenix Dating Experience - February 2026",
    "date": "2026-02-01T00:00:00Z",
    "status": "DRAFT",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

---

#### List Events
```
GET /api/admin/events
```

**Description:** List all events

**Query Params:**
- `status` (optional): Filter by EventStatus
- `fromDate` (optional): Filter events after date
- `toDate` (optional): Filter events before date

**Returns:**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "name": "Phoenix Dating Experience - February 2026",
      "date": "2026-02-01T00:00:00Z",
      "status": "CONFIRMED",
      "capacity": 20,
      "invitationsSent": 22,
      "confirmed": 20,
      "expectedRevenue": 1498000,
      "actualRevenue": 1498000,
      "totalCost": 250000,
      "projectedProfit": 1248000
    }
  ]
}
```

---

#### Get Event Details
```
GET /api/admin/events/:id
```

**Description:** Get event details with invitations and matches

**Returns:**
```json
{
  "event": {
    "id": "evt_abc123",
    "name": "Phoenix Dating Experience - February 2026",
    "date": "2026-02-01T00:00:00Z",
    "startTime": "2026-02-01T19:00:00Z",
    "endTime": "2026-02-01T22:30:00Z",
    "venue": "The Phoenician Resort",
    "venueAddress": "6000 E Camelback Rd, Scottsdale, AZ 85251",
    "capacity": 20,
    "status": "CONFIRMED",
    "expectedRevenue": 1498000,
    "actualRevenue": 1498000,
    "totalCost": 250000,
    "notes": "Valentine's themed event"
  },
  "invitations": [
    {
      "id": "inv_123",
      "applicantId": "appl_xyz789",
      "applicantName": "John Doe",
      "status": "ACCEPTED",
      "invitedAt": "2026-01-20T10:00:00Z",
      "respondedAt": "2026-01-20T15:30:00Z"
    }
  ],
  "matches": [
    {
      "id": "match_def456",
      "applicantId": "appl_xyz789",
      "partnerId": "appl_abc999",
      "type": "CURATED",
      "compatibilityScore": 87.5
    }
  ],
  "stats": {
    "invitationsSent": 22,
    "accepted": 20,
    "declined": 2,
    "pending": 0,
    "attended": 0,
    "noShows": 0,
    "genderBalance": {
      "male": 10,
      "female": 10
    }
  }
}
```

---

#### Invite Applicants to Event
```
POST /api/admin/events/:id/invite
```

**Description:** Send event invitations to selected applicants

**Body:**
```json
{
  "applicantIds": [
    "appl_xyz789",
    "appl_abc999",
    // ... 20 total (10 male, 10 female)
  ]
}
```

**Returns:**
```json
{
  "invitations": [
    {
      "id": "inv_123",
      "applicantId": "appl_xyz789",
      "eventId": "evt_abc123",
      "status": "PENDING",
      "invitedAt": "2026-01-20T10:00:00Z"
    }
  ],
  "stats": {
    "sent": 20,
    "male": 10,
    "female": 10
  }
}
```

**Side Effects:**
- Sends invitation emails with payment link
- Updates event status to INVITATIONS_SENT

---

#### Create Curated Matches
```
POST /api/admin/events/:id/matches
```

**Description:** Create pre-event curated matches based on compatibility

**Body:**
```json
{
  "matches": [
    {
      "applicantId": "appl_xyz789",
      "partnerId": "appl_abc999",
      "compatibilityScore": 87.5
    },
    {
      "applicantId": "appl_def456",
      "partnerId": "appl_ghi111",
      "compatibilityScore": 92.3
    }
    // ... multiple matches per participant
  ]
}
```

**Returns:**
```json
{
  "matches": [
    {
      "id": "match_def456",
      "applicantId": "appl_xyz789",
      "partnerId": "appl_abc999",
      "type": "CURATED",
      "compatibilityScore": 87.5,
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ],
  "stats": {
    "totalMatches": 45,
    "avgMatchesPerParticipant": 4.5
  }
}
```

---

#### Complete Event
```
POST /api/admin/events/:id/complete
```

**Description:** Mark event as completed and record final details

**Body:**
```json
{
  "actualRevenue": 1498000,
  "actualCost": 265000,
  "attendance": {
    "attended": 18,
    "noShows": 2
  },
  "notes": "Great turnout, 3 couples exchanged contact info during social hour"
}
```

**Returns:**
```json
{
  "event": {
    "id": "evt_abc123",
    "status": "COMPLETED",
    "actualRevenue": 1498000,
    "actualProfit": 1233000,
    "updatedAt": "2026-02-02T10:00:00Z"
  }
}
```

**Side Effects:**
- Sends post-event survey to all attendees
- Triggers match reveal emails

---

### Analytics

#### Get Overview Analytics
```
GET /api/admin/analytics/overview
```

**Description:** Get business metrics overview

**Query Params:**
- `fromDate` (optional): Start date for metrics
- `toDate` (optional): End date for metrics

**Returns:**
```json
{
  "applicants": {
    "total": 487,
    "pending": 23,
    "approved": 315,
    "rejected": 89,
    "waitlist": 60,
    "approvalRate": 64.7,
    "genderBalance": {
      "male": 52.3,
      "female": 45.2,
      "other": 2.5
    }
  },
  "compatibility": {
    "avgScore": 78.5,
    "distribution": {
      "90-100": 45,
      "80-89": 120,
      "70-79": 98,
      "60-69": 52
    }
  },
  "events": {
    "total": 12,
    "upcoming": 2,
    "completed": 10,
    "avgAttendance": 19.2,
    "avgNoShowRate": 4.0
  },
  "matches": {
    "total": 234,
    "byType": {
      "CURATED": 156,
      "MUTUAL_SPEED": 52,
      "SOCIAL_HOUR": 26
    },
    "outcomes": {
      "PENDING": 45,
      "FIRST_DATE_SCHEDULED": 67,
      "DATING": 34,
      "RELATIONSHIP": 12,
      "NO_CONNECTION": 76
    },
    "successRate": 48.3 // (dates + relationships) / total
  },
  "revenue": {
    "total": 186742,
    "byType": {
      "APPLICATION_FEE": 67130,
      "EVENT_FEE": 119612
    },
    "ytd": 186742,
    "avgPerEvent": 14968
  },
  "trends": {
    "applicationsPerWeek": [12, 15, 18, 23, 19],
    "matchSuccessRate": [45, 47, 52, 48, 50]
  }
}
```

---

#### Get Event Analytics
```
GET /api/admin/analytics/events/:id
```

**Description:** Get detailed event analytics

**Returns:**
```json
{
  "event": {
    "id": "evt_abc123",
    "name": "Phoenix Dating Experience - December",
    "date": "2025-12-15T19:00:00Z"
  },
  "attendance": {
    "capacity": 20,
    "invited": 22,
    "accepted": 20,
    "declined": 2,
    "attended": 18,
    "noShows": 2,
    "attendanceRate": 90.0
  },
  "matches": {
    "created": 45,
    "byType": {
      "CURATED": 20,
      "MUTUAL_SPEED": 15,
      "SOCIAL_HOUR": 10
    },
    "contactExchanged": 23,
    "contactExchangeRate": 51.1
  },
  "outcomes": {
    "firstDatesScheduled": 12,
    "relationships": 2,
    "noConnection": 18,
    "pending": 13
  },
  "financials": {
    "expectedRevenue": 1498000,
    "actualRevenue": 1348200,
    "totalCost": 250000,
    "profit": 1098200,
    "profitMargin": 81.5
  },
  "demographics": {
    "avgAge": 29.5,
    "ageDistribution": {
      "22-25": 3,
      "26-30": 9,
      "31-35": 6,
      "36+": 2
    },
    "occupations": [
      {"occupation": "Software Engineer", "count": 4},
      {"occupation": "Marketing Manager", "count": 3}
    ]
  }
}
```

---

#### Get Match Analytics
```
GET /api/admin/analytics/matches
```

**Description:** Get matching performance metrics

**Query Params:**
- `fromDate` (optional)
- `toDate` (optional)

**Returns:**
```json
{
  "overall": {
    "totalMatches": 234,
    "avgMatchesPerEvent": 19.5,
    "avgMatchesPerParticipant": 3.9
  },
  "byType": {
    "CURATED": {
      "count": 156,
      "successRate": 52.6,
      "avgCompatibilityScore": 84.3
    },
    "MUTUAL_SPEED": {
      "count": 52,
      "successRate": 67.3,
      "avgCompatibilityScore": null
    },
    "SOCIAL_HOUR": {
      "count": 26,
      "successRate": 34.6,
      "avgCompatibilityScore": null
    }
  },
  "outcomes": {
    "distribution": {
      "PENDING": 45,
      "FIRST_DATE_SCHEDULED": 67,
      "FIRST_DATE_COMPLETED": 34,
      "DATING": 23,
      "RELATIONSHIP": 12,
      "NO_CONNECTION": 53
    },
    "conversionFunnel": {
      "matches": 234,
      "firstDateScheduled": 67,
      "secondDate": 45,
      "relationship": 12
    }
  },
  "timing": {
    "avgDaysToFirstDate": 8.5,
    "avgDaysToRelationship": 67.3
  },
  "compatibility": {
    "scoreBuckets": {
      "90-100": {"count": 34, "successRate": 73.5},
      "80-89": {"count": 67, "successRate": 58.2},
      "70-79": {"count": 45, "successRate": 42.2},
      "60-69": {"count": 10, "successRate": 20.0}
    },
    "correlation": 0.78 // Score vs. success correlation
  }
}
```

---

## WEBHOOK ENDPOINTS

### Background Checks

#### iDenfy Verification Webhook
```
POST /api/webhooks/idenfy
```

**Description:** Receive identity verification results from iDenfy

**Headers:**
```
X-Idenfy-Signature: ...
```

**Body:**
```json
{
  "scanRef": "idenfy_abc123",
  "clientId": "appl_xyz789",
  "status": "APPROVED" | "DENIED",
  "data": {
    "docFirstName": "John",
    "docLastName": "Doe",
    "docDob": "1998-05-15",
    // ... other fields
  }
}
```

**Internal Actions:**
- Update Applicant.idenfyStatus
- If both iDenfy and Checkr pass → notify admin for manual review
- If failed → auto-reject application

---

#### Checkr Report Webhook
```
POST /api/webhooks/checkr
```

**Description:** Receive background check results from Checkr

**Headers:**
```
X-Checkr-Signature: ...
```

**Body:**
```json
{
  "id": "checkr_xyz789",
  "object": "report",
  "candidate_id": "appl_xyz789",
  "status": "complete" | "consider" | "suspended",
  "result": "clear" | "consider",
  "package": "standard_criminal_financial"
}
```

**Internal Actions:**
- Update Applicant.checkrStatus based on result
- If both iDenfy and Checkr pass → notify admin
- Store only pass/fail status, NOT detailed report data

---

## ERROR RESPONSES

All endpoints return standard error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid application data",
    "details": [
      {
        "field": "age",
        "message": "Age must be between 22 and 36"
      }
    ]
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

---

## RATE LIMITS

- Public endpoints: 100 requests/hour per IP
- Authenticated endpoints: 1000 requests/hour per user
- Admin endpoints: Unlimited
- Webhook endpoints: No limit (verified by signature)

---

## AUTHENTICATION

- **Applicant Routes:** Clerk session token in `Authorization: Bearer <token>`
- **Admin Routes:** Clerk session + role check (`UserRole.ADMIN`)
- **Webhook Routes:** Signature verification (iDenfy, Checkr, Stripe)
