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

## Deliverable

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