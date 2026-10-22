# Remaining client workflow verification

## Current prerequisite blocker

Read-only checks confirm that this preview connects to the production backend, with no separate development backend available and zero published providers. Request and booking creation require a published provider. Publishing a synthetic test provider here would expose fictional data to public visitors, contrary to the launch requirements. A code draft alone is not evidence of backend isolation.

No accounts have been created, no records or account statuses changed, and no workflow has been reported as passing.

## Required setup

- Provide a separate test backend/environment with the current schema and account-status guards, without real customer or provider data. Confirm its separation before any writes. This is a prerequisite, not an approval to modify or replace the existing production connection.
- Create dedicated non-admin client, provider, and unrelated-client identities there. Use the supported test-account approval flow when available. A pre-confirmed passwordless test session is not a registration or password-login test.
- Test ordinary registration and login only with a controlled email inbox and confirmation access; otherwise mark those steps NOT TESTED rather than weakening confirmation settings.

## Reversible test scope

1. Verify dedicated identities are active and lack administrator privileges; record exact fixture IDs and original statuses.
2. Create an explicitly labelled disposable provider, publish it only inside the isolated backend, add an active scheduled service and future availability.
3. Submit a service request through the client UI. Read the stored request through both client and provider UI/session paths; verify an unrelated client and anonymous visitor cannot read or modify it.
4. Submit a booking through the client UI. Verify participant access, unrelated-user read/update/delete denial, forged client IDs, invalid slots, and duplicate/conflicting booking rejection with read-back evidence.
5. Complete the actual test request using the provider's permitted pending → accepted → in_progress → completed transitions. Submit a new client's first review through the UI, then verify persisted rating/review ownership, duplicate rejection, incomplete-request rejection, and unrelated-client rejection. Reviews currently depend on completed service requests, not completed bookings alone.
6. Under this approved plan, change ONLY the newly created dedicated client from active to suspended to deactivated while retaining its token. Attempt request/booking/review insertion and representative own-record updates and deletions. Read back records to distinguish denial from a successful response affecting zero rows. Restore its original active status in a finally step. Do not change the existing dedicated provider or any real account's status.
7. Remove only exact tracked disposable records and generated notifications. Remove test files if any are created. Verify absence through privileged read-only queries and report any test auth identities that cannot safely be removed through supported account-management tools.

## Current results

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| Identify request prerequisites | Inspection only | Live policy read confirms published provider, authenticated client ownership, pending initial status, matching active service when selected. |
| Identify booking prerequisites | Inspection only | Live function/policy read confirms publication, availability, date and conflict checks. |
| Identify review prerequisites | Inspection only | Code and policies require a completed owned service request and enforce one review per request. A completed booking alone is not sufficient. |
| Confirm isolated test environment | FAIL — prerequisite unavailable | Hosted backend metadata reports production only, no development environment. |
| Confirm eligible provider fixture | NOT TESTED | No fixture created. Live read found zero published providers. |
| Dedicated client identity/no administrator privileges | NOT TESTED | No new identity created before establishing safe isolation. |
| Client registration and password login | NOT TESTED | Requires dedicated identity and controlled confirmation access; no settings changed. |
| Client-origin request creation and participant read-back | NOT TESTED | Blocked on isolated published-provider fixture and authorized sessions. |
| Client-origin booking creation and participant read-back | NOT TESTED | Same blocker. |
| Unauthorized request/booking access or modification | NOT TESTED | Policies inspected; no new client-session probe performed. |
| New-client review submission | NOT TESTED | Requires a genuine test request completed via permitted provider transitions. |
| Unauthorized, premature and duplicate review rejection | NOT TESTED | Eligibility and uniqueness inspected, but not exercised with a new client. |
| Client suspended/deactivated retained-session writes | NOT TESTED | Requires dedicated client and approval of this reversible plan. No status changes performed. |
| Cleanup | No cleanup necessary this turn | No test account, fixture, notification or file was created. Nothing was changed in production. |

**Problems discovered:** the required test environment is unavailable; no application defect has been established by live workflow testing in this turn.

**Fixes made:** none to application code, database schema, permissions, authentication settings or payments. Only the verification plan and task checklist were updated.

**Outstanding:** every client workflow/live access test listed above, plus registration/confirmation/password login and optional client account-status checks. Existing-provider/personal-profile deletion remains outside this test scope.

## Deliverable after prerequisites are available

A results table with PASS, FAIL, or NOT TESTED for every executed or outstanding check; evidence classified as live UI/backend testing, policy/code inspection, or not tested; problems and any narrowly scoped fixes; status restoration and cleanup counts.

No redesign, production fixture publication, payment configuration, production customer/provider edits, or permission changes. If an unexpected failure requires a schema or permission correction, report it before making significant changes.

## Technical evidence already inspected

- Backend metadata: production only, development environment absent.
- Database: zero published provider rows.
- Request/booking INSERT RLS: authenticated client ownership, pending status, published provider, and no self-provider interaction.
- Booking validation: active matching service, future/current date, configured availability, duplicate and confirmed-slot conflict checks.
- Review eligibility: completed owned matching service request; one review per request; provider read-only access.
- Account status: restrictive write policies require `private.account_is_active()`.

These are inspection findings, not live workflow PASS results.