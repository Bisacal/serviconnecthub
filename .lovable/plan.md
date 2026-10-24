# Two narrowly scoped production safeguard repairs

## Approval boundary

This plan proposes one new migration replacing exactly two installed private trigger functions. It does not apply any database changes now. Approval covers only the SQL below and non-production automated verification; it does not authorize accounts, real-record writes, production forged-write tests, frontend publication, authentication changes, payment changes, or unrelated repairs.

The earlier isolated-client workflow plan remains a separate outstanding task. These repairs alone will not establish that the production pilot is ready.

## Confirmed root causes — current production definition inspection

### 1. Service requests

- The enabled `guard_request_update` BEFORE UPDATE trigger on `public.service_requests` calls `private.guard_request_update()`.
- That function is owned by `postgres`, is `SECURITY DEFINER`, and begins with `IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;`.
- Inside this function `current_user` is the function owner, not the signed-in client/provider role. The early return therefore bypasses the intended checks.
- Its older body also allows broader transitions and omits the closed-request and accepted-request editing restrictions.
- The stronger `public.guard_request_update()` exists but is not attached to the installed trigger. Merely editing that public function would not repair the actual execution path.

### 2. Provider badges and ratings

- The enabled `protect_provider_fields` BEFORE INSERT OR UPDATE trigger on `public.provider_profiles` calls `private.protect_provider_fields()`.
- That function is also owned by `postgres` and `SECURITY DEFINER`, but its protection runs only when `current_user IN ('authenticated','anon')` and the actor is not an administrator.
- Its definer execution context prevents that branch from running for ordinary provider writes.
- The protected values are `is_verified`, `rating_average`, and `review_count`. `average_rating` is a stored generated column derived from `rating_average`, not a separately writable total.

These are verified definition/trigger defects, not performed exploits. No request, provider profile, badge, or rating was changed during inspection.

## Existing authorization and execution privileges

- Request UPDATE policies allow the owning client or owning provider; administrators have a read policy, not a separate request-update grant through RLS. Restrictive active-account checks remain in place.
- Provider INSERT/UPDATE policies permit the owner; an existing administrator policy permits management. Restrictive active-account checks remain in place.
- Authenticated users have column UPDATE privileges for the affected values. Therefore the trigger protections must work; the UI is not an authorization boundary.
- Both affected private functions currently have default PUBLIC EXECUTE privileges. This proposal changes no grants or ACLs. They return `trigger` and cannot be used as ordinary standalone SQL functions. No new public endpoint is added.
- Authenticated callers have USAGE on `private` and EXECUTE on the existing `private.has_role` helper. Its privileged role lookup is unchanged.
- The separate enabled verification-status guard uses `auth.uid()` and the protected role helper, not the faulty executing-role check. It is untouched.
- The separate enabled `private.refresh_provider_rating()` runs as `postgres` with definer rights and recomputes totals after review INSERT/UPDATE/DELETE. It is untouched.
- Review insertion already requires an owned, completed matching request and one review per request. Both rules are untouched.

## Proposed changes

1. Replace the body of the **installed private request function** with the intended stricter logic, and change it to `SECURITY INVOKER`.
2. Change the **installed provider-field function** to `SECURITY INVOKER`, preserving its existing protected fields and administrator exception.
3. Keep the existing enabled triggers attached to those same functions. No trigger replacement is necessary: replacing their definitions in place repairs the actual installed call path.
4. Preserve function ownership, signatures, ACLs, existing search paths, RLS policies, table grants, review helpers, verification-status guard, and rating-refresh function.

### Exact proposed migration SQL — not applied

```sql
CREATE OR REPLACE FUNCTION private.guard_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public, private
AS $function$
DECLARE
  is_client BOOLEAN := auth.uid() = OLD.client_id;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.client_id := OLD.client_id;
  NEW.provider_id := OLD.provider_id;
  NEW.created_at := OLD.created_at;

  IF OLD.status IN ('declined', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'This request is closed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF is_client THEN
      IF NEW.status <> 'cancelled'
         OR OLD.status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Clients can only cancel pending or accepted requests';
      END IF;
    ELSE
      IF NOT (
        (OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined'))
        OR (OLD.status = 'accepted' AND NEW.status = 'in_progress')
        OR (OLD.status = 'in_progress' AND NEW.status = 'completed')
      ) THEN
        RAISE EXCEPTION 'Invalid status change';
      END IF;
    END IF;
  END IF;

  IF NOT is_client OR OLD.status <> 'pending' THEN
    NEW.title := OLD.title;
    NEW.details := OLD.details;
    NEW.location := OLD.location;
    NEW.preferred_date := OLD.preferred_date;
    NEW.preferred_time := OLD.preferred_time;
    NEW.budget := OLD.budget;
    NEW.service_id := OLD.service_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.protect_provider_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public, private
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_verified := false;
      NEW.rating_average := 0;
      NEW.review_count := 0;
    ELSE
      NEW.is_verified := OLD.is_verified;
      NEW.rating_average := OLD.rating_average;
      NEW.review_count := OLD.review_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
```

The explicit request-ID preservation prevents participants from changing the identity of the request. The other request restrictions mirror the intended stronger public definition; that unattached public function is not changed.

## Why this resolves the execution-context problem

An invoker trigger executes in the context of the statement that invoked it, rather than switching to its own owner. Ordinary authenticated client/provider writes therefore enter the protection branches. Returning corrected `NEW` values requires no privileged table update inside either function.

Privileged database/server operations retain their existing behavior; this is not a new permission grant. In particular, the nested provider UPDATE issued by the existing definer rating-refresh function still runs in its trusted owner context. The invoker provider-field guard therefore does not overwrite legitimately recalculated rating totals.

Keeping the provider guard as definer and merely switching it to `auth.uid()` would risk suppressing legitimate nested rating recalculation initiated by a non-admin reviewer. Invoker execution preserves the distinction between a direct provider write and the existing privileged recalculation path without adding a trigger-depth bypass.

## Legitimate operations preserved

| Actor/action | Intended result after repair |
| --- | --- |
| Client edits its pending request | Allowed under existing ownership RLS; identity remains unchanged |
| Client cancels pending or accepted request | Allowed |
| Client marks its own request completed | Rejected; cannot manufacture completion to qualify for a review |
| Provider accepts or declines pending request | Allowed |
| Provider moves accepted → in_progress → completed | Allowed in order |
| Provider skips stages or changes client request details | Invalid transition rejected; client-controlled details preserved |
| Participant edits a declined/completed/cancelled request | Rejected |
| Provider edits ordinary profile/publication fields | Allowed under unchanged RLS and verification-status guard |
| Provider submits protected badge/rating values | Existing protected values retained; inserts initialized to false/zero |
| Active administrator approves/rejects verification | Existing role exception allows badge changes; separate status guard still applies |
| Review insertion/edit/deletion or moderation refreshes ratings | Existing privileged recalculation path remains effective |
| Unrelated user or inactive actor writes | Existing ownership/status RLS still controls access; no new grant |

This protects completion from client manipulation; it does not prove a service actually occurred or prevent a legitimate provider from dishonestly declaring completion through permitted stages. No repair to factual service verification is proposed.

## Verification plan and honest result labels

### Already performed — read-only

| Check | Result | Evidence type |
| --- | --- | --- |
| Exact installed function bodies, owner and security modes | VERIFIED; both defects confirmed | Live database definition inspection |
| Enabled trigger attachments | VERIFIED | Live database definition inspection |
| Relevant RLS, role-helper execution, schema usage and column privileges | VERIFIED | Live policy/privilege inspection |
| Generated rating alias and nested rating-refresh path | VERIFIED by inspection | Live definitions and source inspection |
| UI status transitions and admin verification updates | VERIFIED by inspection | Code inspection |
| Repaired behavior | NOT TESTED | No repairs applied |
| New client/provider end-to-end workflows | NOT TESTED | No accounts or production writes |

### After approval

1. Re-read definitions and relevant permissions immediately before applying; stop and ask if they differ materially from this inspected baseline. Apply only the two replacements above as one new migration, never replay old migrations.
2. Add focused regression tests next to existing security tests for allowed transitions, client completion rejection, immutable fields, closed-request rejection, provider badge/rating preservation, administrator verification, and nested rating recalculation.
3. Exercise the **actual SQL** against a disposable local PostgreSQL database, if available, with synthetic roles/data that have no production connection. Verify permitted and rejected transitions and the nested definer → invoker rating update. Report this as isolated database execution, not production UI testing. Static SQL checks alone are not proof of behavior; if this isolated harness cannot be supplied, report behavioral verification NOT TESTED.
4. Read back both installed definitions and security modes, unchanged trigger bindings/enabled state, owners, ACLs, RLS, generated alias, verification guard, review eligibility and rating-refresh definitions. Verify the new migration journal entry and run the existing offline security regression suite and read-only linter.
5. Do not test by modifying genuine production users or creating accounts/fixtures there. Production client creation, participant read-back, actual review submission, retained-session status writes, and live admin approval remain NOT TESTED under this approval scope.
6. Report changes, static results, isolated execution results, production definition checks, limitations and any additional findings separately. No cleanup of production records is needed because none will be created or changed.

## Additional issues and limits

The private request function lacks stronger rules independently of the execution-context bug; the proposed replacement addresses that within the requested scope. The generated rating alias is already protected by database generation. No unrelated repair is proposed. Current production data is not retrospectively corrected or audited for past manipulation by this migration.

Approval does not authorize a production pilot. A fresh readiness decision must consider the results and remaining untested workflows.