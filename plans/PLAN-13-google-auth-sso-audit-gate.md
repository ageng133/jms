# PLAN-13: Google Auth SSO Integration & Mandatory Audit Gate

## 1. Executive Summary
This document outlines the architecture, implementation, and security invariants for **Google Single Sign-On (SSO)** and the **Mandatory Pre-Submission Audit Gate** across the Journal Management System (JMS).

Under this model:
1. **Zero-Bypass Security Rule**: Users **must** be authenticated via Google SSO before they can submit manuscripts, presign upload tickets to Box.com cloud storage, or trigger/inspect automated pre-submission formatting audits.
2. **Dual-Mode Google SSO**: Supports real **Google Identity Services (GSI)** using signed Google ID tokens (`credential`), alongside university-grounded 1-click academic profiles (Author: Dr. Alexander Wright, Managing Editor: Prof. Sarah Connor) and custom Google Workspace email authentication.
3. **Pure Light-Mode Auth Gates**: When an unauthenticated visitor attempts to navigate to any protected submission or audit view (`/submissions/new`, `/submissions/[id]/audit`, `/submissions`, `/admin`), they are presented with an elegant light-mode **Auth Gate Card** (`AuthGateCard.tsx`) explaining why authentication is mandatory and providing a 1-click Google Sign-In prompt.

---

## 2. Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Author / Reviewer
    participant Frontend as Next.js 15 Client
    participant AuthContext as AuthProvider (React)
    participant Gateway as Go API Gateway (:8080)
    participant Box as Box Storage Service
    participant Gemini as Google Gemini AI Auditor

    User->>Frontend: Access /submissions/new or /submissions/:id/audit
    Frontend->>AuthContext: Verify active session (token + user)
    alt User is Unauthenticated
        AuthContext-->>Frontend: Token is null
        Frontend-->>User: Render AuthGateCard ("Google Sign-In Required")
        User->>Frontend: Clicks "Sign in with Google"
        Frontend->>Gateway: POST /api/v1/auth/google (Google token / UTS SSO)
        Gateway-->>Frontend: 200 OK + JWT Bearer token + User profile
        Frontend->>AuthContext: Store session in localStorage + dispatch jms:auth-changed
    end

    Note over Frontend,Gateway: Authenticated Session Active

    User->>Frontend: Submit draft & template files
    Frontend->>Gateway: POST /api/v1/manuscripts (Authorization: Bearer <jwt>)
    Gateway-->>Frontend: 201 Created (Manuscript ID)
    Frontend->>Gateway: POST /api/v1/manuscripts/:id/files/presign (Bearer <jwt>)
    Gateway-->>Frontend: 200 OK (Box Upload URL)
    Frontend->>Box: PUT file bytes directly
    Frontend->>Gateway: POST /api/v1/manuscripts/:id/files/confirm (Bearer <jwt>)
    Gateway->>Gemini: Trigger asynchronous formatting audit
    Gateway-->>Frontend: 202 Accepted (Audit ID)
    Frontend->>Gateway: GET /api/v1/audits/:audit_id (Bearer <jwt>)
    Gateway-->>Frontend: 200 OK (Report with layout, double-blind & citation checks)
    Frontend-->>User: Render Comparative Audit Dashboard
```

---

## 3. Implementation Details

### A. Backend Control Plane (`backend/gateway`)
1. **Google ID Token Decoding & Fallback (`auth_usecase.go`)**:
   - `GoogleLoginDTO` accepts `credential` (from Google Identity Services GSI), `id_token`, and direct payload fields (`email`, `full_name`, `role`, `affiliation`).
   - If a JWT is supplied, `parseGoogleIDToken()` unpacks base64url claims (`email`, `name`, `sub`, `hd`) without requiring external network dependencies.
   - User account is looked up in PostgreSQL; if absent, a new user is dynamically provisioned with `OAUTH2_GOOGLE_MANAGED` password flag.
   - Signs and returns a standard HMAC-SHA256 JWT valid for 72 hours.
2. **Strict Route Protection (`router.go`)**:
   - `/manuscripts`, `/manuscripts/:id/files/presign`, `/manuscripts/:id/files/confirm`, and `/audits/:id` are guarded by `middleware.AuthMiddleware()`.
   - Any request lacking `Authorization: Bearer <token>` immediately receives HTTP 401 Unauthorized:
     ```json
     {
       "success": false,
       "error": {
         "code": "UNAUTHORIZED",
         "message": "Authorization header is required. Please sign in or pass 'Authorization: Bearer <jwt>'"
       }
     }
     ```

### B. Frontend Client Plane (`frontend/src`)
1. **Elimination of Silent Dummy Auto-Login (`lib/api.ts`)**:
   - Removed legacy `ensureAuthToken()` auto-login logic that previously faked Dr. Alexander Wright credentials for anonymous visitors.
   - `fetchWithAuth()` strictly checks for `getStoredToken()`. If absent, it throws `"Authentication required. Please sign in with Google to continue."` and dispatches `jms:auth-required`.
   - On HTTP 401 response, `logout()` is executed and `jms:auth-required` triggers the Google SSO modal.
2. **Unified Authentication State (`context/AuthContext.tsx`)**:
   - Reactive React Context providing `user`, `token`, `isAuthenticated`, `signInWithGoogle()`, `signOut()`, and `openGoogleModal()`.
   - Automatically synchronizes across browser tabs and layout elements via `storage` and `jms:auth-changed` events.
3. **Reusable Google SSO Modal (`components/GoogleAuthModal.tsx`)**:
   - High-fidelity Google 4-color SVG logo.
   - Real Google Identity Services (GSI) script integration when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is defined.
   - UTS Academic SSO quick-login tabs (Author vs Managing Editor).
   - Custom Google Workspace email input supporting custom researchers.
4. **Light-Mode Auth Gate Cards (`components/AuthGateCard.tsx`)**:
   - Embedded into `/submissions/new`, `/submissions/[id]/audit`, `/submissions`, and `/admin`.
   - Informs visitors why sign-in is necessary (confidentiality, Gemini AI processing, Box storage linkage) and provides a prominent call-to-action.

---

## 4. Verification & Testing Matrix

| Test Case | Method | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| **TC-1: Anonymous Audit Request** | `curl -X GET /api/v1/audits/00000000-0000-0000-0000-000000000000` | HTTP 401 Unauthorized (`Authorization header is required`) | PASS |
| **TC-2: Anonymous Manuscript Submission** | `curl -X POST /api/v1/manuscripts` without token | HTTP 401 Unauthorized | PASS |
| **TC-3: Google SSO Direct Login** | `POST /api/v1/auth/google` with `{ email, full_name, role }` | HTTP 200 OK, JWT returned, User created | PASS |
| **TC-4: Google ID Token Parsing** | Unit test `TestLoginWithGoogle_WithIDToken` | Claims extracted from base64url payload | PASS |
| **TC-5: Frontend /submissions/new Guard** | Visit `/submissions/new` without token | AuthGateCard displayed, forms disabled | PASS |
| **TC-6: Frontend /audit Guard** | Visit `/submissions/:id/audit` without token | AuthGateCard displayed, no polling | PASS |
| **TC-7: TypeScript & Next.js Build** | `tsc --noEmit` and `pnpm build` | 0 errors across all 7 routes | PASS |
