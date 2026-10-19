# Client workspace release

## Implemented

Public site adds a Client login link and an explicit brief-to-workspace handoff. workspace.html offers email/password registration, login, password recovery, business setup, request submission and dashboards for projects, milestones, deliverables and updates.

Dashboard data comes from the Group project, not example data. Staff-controlled records have no client write permissions. My Office does not invent subscriptions, invoices, live agents or connected channels. This release does not provide the staff/admin editing interface.

## Applied services

- Supabase migration 20261019145414: client_workspace_foundation (source: backend/workspace-schema.sql).
- Edge Function office-onboard verifies the user with Auth /user, requires confirmed email, ignores client-supplied identity and uses its runtime service-role credential to call provision_office.
- The service-only SECURITY INVOKER RPC uses a per-user transaction lock and returns an existing owned organization on retries. Client roles cannot execute it.
- Projects, milestones, deliverables and office updates are member-readable only. Composite project/organization foreign keys prevent attaching another organization's project children.
- Browser configuration includes only the public project URL and publishable key; no privileged key is present in dist.
- Function gateway JWT verification is disabled because the handler explicitly validates the bearer token against Supabase Auth before any privileged operation, supporting modern publishable keys. It does not trust JWT text alone.

## Required Auth configuration before email testing

In the separate Group Supabase project, open Authentication > URL Configuration:
- Site URL: https://agenticcore-group.netlify.app
- Additional redirect URL: https://agenticcore-group.netlify.app/workspace.html

When the custom domain is connected, add its exact workspace URL and update the Site URL. Do not add broad redirect wildcards. Keep email confirmation enabled. Configure a production email sender/SMTP for customer registrations; the built-in sender is restricted and is not a production delivery setup. These Auth dashboard settings have not been changed by the connector.

Use the live Netlify production URL for onboarding tests. Preview origins are intentionally not allowed by office-onboard. Do not disable origin checks to make arbitrary previews work.

## Storage and consent

Auth tokens are held in sessionStorage for this browser tab. No remember-me option is provided. Signing out clears local auth state even if the network logout fails. This does not make unrelated devices sign out or instantly revoke already issued JWTs.

The marketing assessment remains local until Take to my workspace is chosen. That explicitly places a draft in this tab's sessionStorage. The client then reviews and consents to save a request after sign-in. Pending drafts are removed after successful submission. No files or credentials are uploaded. Do not put secrets or sensitive customer data in a brief.

Production data retention/deletion and privacy/support contacts still need a complete business policy before a general customer launch.

## Validation performed

- Live rollback SQL: provisioning retry returns the same office; client roles cannot call provisioning; project/milestone/delivery/update reads are isolated; clients cannot change project status; mismatched project/organization child records fail.
- Existing core access checks passed previously.
- Local API mock tests: session handling, bounded request payloads, no client-controlled author/status/source fields, sign-out clearing, safe file links, status counts and asset references.
- Local endpoint tests: disallowed origin, missing/invalid bearer, unverified email, server-derived user ID and no privileged credential returned.
- Security advisors: no findings. Performance advisors: only unused-index informational notices for a new workspace.
- Existing 384 builder cases and onboarding checks still pass.

Not yet verified: real browser rendering, delivered confirmation/recovery emails, or a real user's complete email-confirmation-to-dashboard journey. These require the Auth settings and email delivery above. No test emails were sent and no real user credentials were requested.

## Acceptance after merge

1. Configure Auth URLs and the email sender.
2. Register and confirm a test account using an inbox you control.
3. Create the business workspace; retry/reload and confirm no duplicate office is made.
4. Take a generated brief into the workspace, review it and save the request.
5. Reload and sign in again to confirm that the request is persisted.
6. Use a second independent test account to confirm the first business cannot be seen.
7. Test password recovery and sign-out.
8. Staff project entry and client approval/message workflows are subsequent features; do not claim the agent office is active based on this release.
