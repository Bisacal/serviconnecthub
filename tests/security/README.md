# Account-status regression checks

Offline checks (no credentials or mutations):

```sh
python3 -m unittest discover -s tests/security -p 'test_*.py' -v
```

`controlled_account_status_checks.py` is a manual, opt-in integration harness, not an automatically executed test. It changes ONLY the configured dedicated test account between active, suspended, deactivated, and its original status. Never configure real users as test subjects. Obtain an approved reversible testing plan and authorized provider/admin sessions first.

Required configuration: `SERVICONNECT_CONTROLLED_STATUS_TEST=explicitly-approved`, `STATUS_TEST_WORKDIR`, `STATUS_TEST_USER_ID`, `STATUS_TEST_PROVIDER_ID`, `STATUS_TEST_ADMIN_ID`, plus existing backend URL/publishable-key environment variables. Authorized session files are read from the protected local authentication cache; they must never be copied into this repository or logged.

Precreate isolated disposable fixtures through authorized database tools and supply their IDs in `fixtures.json`: `other_user`, `other_provider`, `conversation`, `notice`, `delete_notice`, `other_notice`, `request`, `booking`, `review_request`, `suspended_review_request`, `deactivated_review_request`. No fixture may reference an unrelated real user's private data. The configured test provider must start active and unpublished, with no existing client-profile row.

The harness retains the same provider token, snapshots original profile values, and uses finally to restore status/values and remove files and provider-created rows. It checks affected rows and reads records back; HTTP 200 with zero affected rows is treated as denied, not successful modification.

**Mandatory manual final cleanup:** Some fixtures (immutable messages/conversations, requests/bookings, synthetic provider, trigger-generated notifications) cannot be deleted through participant RLS. Use the authorized database tools to delete only exact tracked disposable IDs, including cascading synthetic subscriptions. Compare snapshot, tracked IDs, and test-tagged notification bodies before cleanup. Verify that all fixture counts and file counts are zero afterward. Do not widen policies just to simplify cleanup.

Synthetic non-login identities support provider-side and review-eligibility tests, but are not authenticated client sessions. Client request/booking creation and destructive deletion of existing personal/provider profiles remain untested by this harness.