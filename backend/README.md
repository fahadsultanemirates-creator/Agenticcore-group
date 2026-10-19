# Office core foundation

The initial schema is now installed and access-tested in the separate Agenticcore Group project. See activation-status.md for the exact target, applied migration history, test evidence and remaining work. Nothing in this folder is loaded by the public site; client sign-in and saved requests are not enabled yet.

## First usable slice

1. A client signs in through the new core project's Supabase Auth.
2. A server validates the session and verified email, then creates an organization and owner membership in one transaction. Use an idempotency key and enforce per-user organization limits to prevent duplicate or abusive creation.
3. The client submits an immutable office brief for an organization they belong to.
4. Members can see their organization's requests and statuses. Viewers can read but cannot submit.
5. Staff review scope and respond; submission does not create payment, start agents or authorize external actions.

The organization is a CLIENT business, not the Supabase organization hosting the project. Do not confuse the two.

## Data and access

The proposal covers office_organizations, office_memberships and office_requests. It deliberately excludes billing, subscriptions, allowances, worker queues, staff interfaces, uploaded files and messaging until this first slice works.

Client INSERT privileges include only organization_id, route and brief. The database assigns author, timestamp, initial status and Group source. Agency/Biz adapters must verify their own sessions and signed events server-side before assigning another source. Click remains independent.

The membership SELECT rule exposes a user's own memberships, avoiding recursive membership checks. Organization/request policies use that membership lookup; they never trust user-editable profile metadata. Clients cannot create memberships, change roles, forge request authors, update status or delete requests. Organization provisioning and staff actions need authenticated, narrowly validated server endpoints; a service-role key is never sent to the browser.

The brief JSON is input, not authority. Validate allowed fields, lengths, office configuration and package versions server-side. Recalculate prices from trusted catalogue data. Never accept claimed payment, identity, authorization or service activation from brief text. Render client text safely.

Existing Agency/Biz user IDs are not core identities. Require verified linking and namespace legacy IDs by project; matching email text alone is insufficient.

## Confirmed inventory

Agency and Biz have separate live projects and existing public request, project and billing tables with RLS enabled. Listing confirms table existence and RLS flags only; existing policy correctness has not been audited. Click is also separate and stays outside core migration.

Selected home: the separate Agenticcore Group account and its existing Agenticcore-office-core project (pdaluprahifdejsjwjoi), in ap-south-1. The owner selected a separate account rather than either legacy site organization. No new paid resource was created.

## Activation checklist

- Completed: confirmed the separate Group account and existing core project.
- Completed: first core schema applied to the empty selected project; test fixtures executed in a rollback-only transaction.
- Completed via Supabase migration tools; applied versions are recorded in activation-status.md.
- SQL access cases passed and advisors were checked; remaining server and end-to-end cases stay outstanding.
- Configure Auth site URL, allowed callbacks, email verification and abuse protection for Group's real production domain.
- Implement transaction-safe organization onboarding and bounded client request submission, including rate limits and input validation.
- Expose only required tables/operations; use publishable keys and authenticated sessions in the browser.
- Add a real sign-in and saved-request interface only after the backend passes its checks.
- Publish accurate privacy, retention and service terms before accepting real client data.
- Migrate no existing accounts, orders, payment records or files in this slice.

Official references:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/securing-your-api
