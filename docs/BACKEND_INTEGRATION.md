# Richmirabel — Backend Integration Guide & Service Contracts

This document provides complete technical documentation and API specifications for integrating a real backend service with the **Richmirabel** frontend application.

---

## 1. Frontend Architecture & Routing Overview

The Richmirabel application is built with React, Vite, Tailwind CSS, and TanStack Router. It features two primary workspaces:

### Student Workspace (`/studio/*`)
- **Dashboard (`/studio`)**: Candidate overview, subject selection, examination readiness meter, quick launch into CBT and Past Questions.
- **Subject & Topic Explorer (`/studio/subject/$id`, `/studio/topic/$id`)**: Modular syllabus navigation, teacher-approved notes, KaTeX formula support, and interactive diagrams.
- **Practice & CBT Engine (`/studio/practice/$id`, `/studio/cbt`, `/studio/cbt/waec/$paperId`)**: Timed examination simulator for JAMB UTME and WAEC SSCE with full objective and theory question sets.
- **Progress & Performance (`/studio/progress`, `/studio/review/$attemptId`)**: Topical score tracking, historical attempt reviews, and strengths/weaknesses breakdown.
- **Account & Security (`/studio/account`, `/studio/security`, `/studio/help`)**: Candidate profile management, active session security, and support directory.

### Admin Workspace (`/admin/*`)
- **Overview (`/admin`)**: Platform operational metrics, candidate signups, content volume, and system alerts.
- **Subjects & Content (`/admin/subjects`, `/admin/notes`)**: Syllabus topic management, OCR note ingestion pipeline, and question review status.
- **Past Questions & CBT Generator (`/admin/past-questions`, `/admin/cbt-generator`)**: Examination paper publishing, question bank verification, and paper layout generation.
- **Students Management (`/admin/students`)**: Candidate roster, enrollment filters, manual access grants, and account status toggles.
- **Subscriptions & Pricing (`/admin/subscriptions`)**: Subscription plan configuration, term access rules, and subscriber entitlement ledger.
- **Payments & Revenue (`/admin/payments`)**: Financial control ledger, transaction audits, gross/net revenue calculations, and refund processing.
- **Settings (`/admin/settings/*`)**: 7-category platform configuration centre (General, Academic, AI Processing, Notifications, Admin Security, Integrations, Developer Tools).

---

## 2. Authentication Requirements

The frontend provides clean authentication interfaces in `src/services/auth/auth.service.ts` ready to connect to any backend identity provider (e.g., Node.js/Express JWT, OAuth 2.0).

### Authentication Endpoints

#### Register Candidate
- **Endpoint**: `POST /api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "name": "Ada Okonkwo",
    "email": "ada@example.com",
    "password": "SecurePassword123!",
    "provider": "email"
  }
  ```
- **Response Data (`AuthResponse`)**:
  ```json
  {
    "user": {
      "id": "std_98241",
      "name": "Ada Okonkwo",
      "email": "ada@example.com",
      "role": "student",
      "onboardingComplete": false,
      "createdAt": "2026-11-06T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "expiresAt": "2026-12-06T10:00:00.000Z"
  }
  ```

#### Login Candidate
- **Endpoint**: `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "ada@example.com",
    "password": "SecurePassword123!"
  }
  ```

#### Google OAuth Login
- **Endpoint**: `POST /api/v1/auth/google`
- **Header**: `Authorization: Bearer <google_id_token>`
- **Response**: `AuthResponse`

#### Password Reset Request
- **Endpoint**: `POST /api/v1/auth/password/reset-request`
- **Request Body**: `{ "email": "ada@example.com" }`

---

## 3. Frontend Service Architecture

All server communications are decoupled from UI components into the service abstraction layer located in `src/services/`:

```text
src/services/
├── api/
│   ├── client.ts        # Axios/Fetch API client with auth token headers
│   ├── config.ts        # Base URL and global request timeout settings
│   └── errors.ts        # Typed ApiError & ServiceUnavailableError classes
├── auth/
│   ├── auth.service.ts  # Identity, session, and password reset methods
│   └── auth.types.ts    # Authentication request/response interfaces
├── students/
│   ├── students.service.ts # Profile & examination preference contracts
│   └── students.types.ts   # Student profile contracts
├── subjects/
│   ├── subjects.service.ts # Subject catalog & topic fetch contracts
│   └── subjects.types.ts   # Subject catalog interfaces
├── lessons/
│   ├── lessons.service.ts  # Topic notes & lesson completion contracts
│   └── lessons.types.ts    # Lesson record types
├── cbt/
│   ├── cbt.service.ts      # CBT exam generation & attempt submission
│   └── cbt.types.ts        # Exam session contracts
├── payments/
│   ├── payments.service.ts # Transaction ledger, checkout, & refund contracts
│   └── payments.types.ts   # Financial transaction interfaces
└── admin/
    ├── admin.service.ts    # Platform dashboard & management contracts
    └── admin.types.ts      # Administrative overview interfaces
```

---

## 4. Primary Data Contracts & Relationships

### Student Profile (`StudentProfile`)
```typescript
interface StudentProfile {
  id: string;
  name: string;
  email: string;
  pathway: "sciences" | "arts" | "commercial" | null;
  exams: ("jamb" | "waec")[];
  jambSubjects: string[];
  selectedSubjects: string[];
  examMonth: string | null;
  trialStart: number | null;
  subscribed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Academic Question (`Question`)
```typescript
interface Question {
  id: string;
  prompt: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  answer?: "A" | "B" | "C" | "D";
  explain?: string;
  answerKeyStatus?: "shipped" | "demo" | "missing";
  reviewStatus?: "AI Solved" | "Needs Review" | "Teacher Reviewed";
}
```

### Payment Transaction (`PaymentTransaction`)
```typescript
interface PaymentTransaction {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  amount: number;
  reference: string;
  gateway: "Paystack" | "Flutterwave" | "Bank Transfer" | "Manual Grant";
  status: "Successful" | "Pending" | "Failed" | "Refunded";
  createdAt: string;
  refundInfo?: {
    refundedAt: string;
    refundAmount: number;
    reason: string;
    processedBy: string;
  };
}
```

---

## 5. Payments & Financial Revenue Flow

1. **Initiation**: The frontend calls `paymentsService.initiatePayment({ planId, amount, gateway })`. The backend creates a pending transaction reference and returns the gateway authorization URL.
2. **Verification**: Upon redirection, the frontend passes the reference to `paymentsService.verifyPayment({ reference })`. The backend validates the payment status via webhook/gateway API and updates candidate entitlement.
3. **Entitlement Rules**:
   - Only confirmed `Successful` payments grant term access.
   - Refunds deduct from `Net Revenue` (`Gross Revenue` - `Refunds`) without deleting original transaction records.
   - Manual access grants do not generate payment records.

---

## 6. Environment Configuration

Define the backend API URL in `.env`:

```env
VITE_API_BASE_URL=https://api.richmirabel.com/v1
```

---

## 7. Backend Integration Checklist

- [ ] Implement CORS headers allowing the frontend origin.
- [ ] Implement JWT token authentication (`Authorization: Bearer <token>`).
- [ ] Implement candidates API (`GET /api/v1/students/profile`, `PUT /api/v1/students/profile`).
- [ ] Implement subjects and question bank API (`GET /api/v1/subjects`, `GET /api/v1/lessons/topics/:id`).
- [ ] Implement CBT submission and attempt scoring API (`POST /api/v1/cbt/submit`).
- [ ] Implement payment webhook receivers for Paystack / Flutterwave.
- [ ] Implement administrative overview endpoints for candidate roster and financial ledger.
