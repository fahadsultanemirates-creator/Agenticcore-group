# Dashboard office builder and client-facing team

## Delivered behavior

The signed-in My office section uses OfficeModel and OwnedOfficePackages, the same price and allowance definitions as the public builders. Managed support uses departments and Essential/Growth/Extended capacity over 28 days; owned builds use the four existing starting tiers and milestone payments. Clients can describe first tasks and choose owned-office name and character preferences.

An explicit review-and-consent save writes an immutable office_requests row through the existing authenticated API. brief.kind is office_configuration, brief.configuration is a versioned structured snapshot, and brief.text records the proposed scope and prices. Status remains server-controlled. This is a proposal, not service activation or a billing record. The site recalculates current proposed figures when saved choices are reopened; old submitted text remains unchanged. Previously submitted plain-text requests continue to work.

No database migration, new permissions or client-visible secret is required. Existing organization membership and request-insert RLS remain authoritative. Viewers may explore but cannot submit. Draft inputs and chat are in memory only; they reset on business change or sign-out. Chat messages are not saved separately. Selecting “Use my messages as an office brief” copies up to 4,000 characters into the draft; explicit proposal consent is still required to submit it.

## Character responsibilities

| Character | Client-facing purpose |
| --- | --- |
| Maya | Default dashboard contact, priorities, request and project navigation |
| Amara | Office configuration, business context and starting requirements |
| Forge | Explain the ecosystem and the two office routes |
| Atlas | Technology scope, existing-system care and framework-build distinctions |
| Nova | Creative outputs and brand requirements |
| Leo | Marketing allowances, channels and placement definitions |
| Iris | Administration, operations and customer desk scope |
| Ledger | Package estimate explanation and bookkeeping preparation |
| Sage | Research and meeting-brief scope |
| Orion | Explain quality checks, revisions and acceptance |

Talk to your team is a full dashboard section, with character selection, a conversation log and direct builder/project/request actions. Public character profile dialogs link to workspace.html?assistant=<id>. Maya remains the default after sign-in unless a valid character link was selected.

## Current chat capability

This release is a **guided assistant**, clearly labelled in the interface. It uses scoped introductions, rule-based department suggestions, price explanations and counts from the business's loaded records. It does not have a live language-model connection, perform research, execute work or claim to review completed work. Keywords only suggest departments; they never silently replace the client's selection. The user must accept suggestions, choose a route, review the proposal and explicitly save it. A conversation does not authorize spending or publishing.

## Next live-assistant implementation

Add an authenticated server endpoint and a chosen model provider after server-side credentials are configured. Use the user's verified identity and office membership for each context fetch. Persist conversations and handoffs with organization-level access rules; keep Maya as the continuing coordinator and give specialists only the necessary business context. Expose narrow tools for reading recorded progress and preparing a proposal. Deterministic office calculations remain authoritative. Saving a proposal, creating a task and taking an external action must remain distinct steps, with explicit client review for consequential actions. Track actual tool outcomes before reporting completion; never let model text create fictional project activity.

## Validation

npm run check covers the existing 384 public-builder cases and 381 nonempty managed dashboard selections, all four owned builds, summary serialization, request-save payloads, duplicate-save protection, read-only access, business-context reset, all ten character options and accepted chat-to-builder suggestions. The new UI checks execute the production handlers against an in-memory DOM and mocked API, without live customer writes. Existing authentication and onboarding checks remain part of the command.

Real mobile/desktop layout QA and a signed-in save/reload check remain required after the PR is deployed. No public or live-AI functionality should be advertised beyond the guided behavior described here.

## Forge package access

Forge remains visible in the public team introduction, but has no public direct-chat link. His dashboard contact is locked until the current business has an active office_package_access record. A direct URL selecting Forge falls back to Maya when access is missing, expired or cannot be loaded. Neither signup, office proposals nor project status grants package access.

The package-access table is installed in the Group core. Clients have SELECT only, and its RLS exposes only their own business's enabled record inside its start/end period. Only trusted billing or administrative services can record purchase access; no real businesses were granted access by this change. Payment integration is still pending. The frontend checks business identity and expiry, including before a guided Forge reply. These controls govern the current guided interface; a future live-chat endpoint must independently check the same server-side entitlement on every request, including expiry and revocation, rather than trusting the frontend.

Rollback-only database tests passed for organization isolation, client grant/update rejection, anonymous denial and expired, future or revoked packages. All fixtures were rolled back. Frontend tests cover unpaid direct links, active access, wrong-business records and expiration. Browser visual testing remains outstanding.
