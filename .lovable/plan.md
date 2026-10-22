# Targeted account-status protections and controlled verification

## Scope
Preserve SERVICONNECT's design, existing workflows, ownership checks, participant privacy, and administrator permissions. Do not change real users, payments, commissions, or unrelated security findings.

## Narrowly scoped protections
1. Add restrictive write policies for the four existing private file buckets: avatars, portfolio, request attachments, and verification documents. Apply to upload, replacement/move, and deletion; leave existing read and folder permissions unchanged.
2. Add restrictive status policies for notification updates/deletion and portfolio creation.
3. Complete missing insert/update/delete guards across user-editable tables and administrator-editable tables, without granting any new operation.
4. Guard both conversation read-status and conversation-creation functions before writes. Retain participant and legitimate-relationship checks and read-only access.
5. Preserve existing active-user client-profile deletion permission. Inspection found no incoming foreign keys to client profiles, so deleting a disposable client-profile row does not delete an authentication account or its bookings, requests, or reviews. Do not delete existing personal/provider profiles.

### Changes to existing definitions
- Replace the account-status helper's missing-profile fallback from allowed to denied. Signup already creates profiles through the protected signup trigger; an account without a profile must not bypass suspension safeguards by deleting and recreating it.
- Replace only the bodies of the two write-capable conversation functions to add the same status check. Their signatures, grants, participant checks, and relationship rules stay unchanged.
- Keep existing policies; add restrictive policies that require both existing authorization and an active actor. An active administrator retains existing account-management access; a suspended administrator does not gain a bypass.

## Reversible live test plan — approval authorizes these status changes only
- Use only **bwejuabisala@yahoo.com**, the dedicated active, unpublished Provider-only test account. Do not use the administrator account as the suspended subject.
- Obtain authorized sessions for this provider and the requesting administrator. Keep the original provider token throughout; call the backend directly so frontend sign-out cannot mask a gap.
- Create explicitly tagged disposable portfolio, service, availability, client-profile, notification, conversation, and harmless file fixtures. Snapshot original test-account values first. Do not publish the test provider or alter existing user records.
- Test active permissions; use the administrator's existing account-management permission to change only the test account to suspended, then deactivated; repeat writes and verify affected rows/readback, not just HTTP success.
- Probe other-user and anonymous access only against tagged disposable private fixtures. Do not read or modify unrelated real users' data.
- Restore the test account to its original active status in a cleanup/finally step, restore original values, delete only tagged fixtures/files, and verify cleanup. Do not revoke or change administrator roles.
- Test provider-side request/booking transitions and client review eligibility using disposable interaction rows where supported. Client-origin creation/review submission needs an authorized dedicated client session; if no suitable dedicated client exists, report NOT TESTED rather than use a real client or invent authorization.
- Never test deletion of existing personal/provider profiles. Use only a newly created disposable client-profile row belonging to the test account; report remaining deletion paths as policy-inspected, not live-tested.

## Verification and reporting
Run automated policy coverage regressions, the security linter, and signed-in browser checks for administrator and restored provider access. Report each check PASS, FAIL, or NOT TESTED; separate policy inspection from live evidence and explain remaining linter warnings without claiming complete security.

## Technical details
Use additive database migrations, existing restrictive RLS, private status helpers, and native file authorization. Keep database regression tests in the repository. No new paid services or privileged browser credentials.