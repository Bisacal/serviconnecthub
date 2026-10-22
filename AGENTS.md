<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Payment rows (payments, refunds, provider_subscriptions, featured_listings, payment_events) are written only by server code with the service role after provider webhook signature verification; browsers get read-only RLS access — never trust client-reported payment status.
- No card data is stored; only provider references (transaction_reference, provider ids).
- Authenticated database and file writes require an existing active actor profile through restrictive RLS; security-definer conversation writes check status internally because they bypass RLS. Keep existing ownership/participant authorization and never add status-based permission grants.
- Account-status integration tests run only with explicit controlled-test opt-in and dedicated test identities; retain sessions, restore original status in finally, and delete only tracked disposable fixtures to avoid changing real users.
