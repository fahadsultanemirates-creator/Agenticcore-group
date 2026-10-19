# Shared office framework

Status: proposed architecture. No databases, accounts or production services migrated.

## Decision

Target: one shared office framework and one central Supabase project for Group, Agency, Biz and future general business sites. Click retains its existing independent framework and Supabase project because its prepaid quick-task execution works differently. Group can link to Click without moving Click execution into the shared core.

Retain existing Agency and Biz databases, logins, payment records and files during the transition. Move their shared-office operations into the central project in phases; any later consolidation of legacy records requires a tested migration. This target does not authorize an immediate database cutover.

A proposed central Supabase project stores organizations, memberships, office plans, allowances, tasks, assignments, approvals, run history, usage and reporting preferences. Each record belongs to an organization; connected work also carries a site identifier. Enforce membership-based row access and least-privilege grants. Keep provider credentials server-side.

## Ownership

| System | Authoritative records |
| --- | --- |
| Group core | Office subscriptions, allowances, coordination, approvals and reporting |
| Agency | Individual projects, two-payment milestones and original customer records |
| Biz | Individual business-task orders, two-payment milestones and original customer records |
| Click (independent) | Its existing framework, prepaid orders, wallet and delivery records; outside shared-core migration |

The originating site remains the authority for its payment confirmations. Core stores verified event references, without inventing a second financial ledger. Browser success screens cannot prove payment.

## Event contract

1. Site backend validates user and order, then sends a signed event containing event ID, site ID, external order ID, authorized organization mapping and minimal task data.
2. Core verifies sender, timestamp, replay protection and event permissions. Duplicate event IDs cannot create duplicate tasks or charges.
3. Coordinator checks scope, allowance and approvals, then assigns a specialist workflow.
4. Workers record real tool outcomes, bounded retries and failed jobs requiring operator attention.
5. Signed status events return to the originating site. Reports count confirmed results only.

Use an outbox, retries and reconciliation to avoid losing accepted work during outages. Version contracts and record an audit trail. No site receives unrestricted access to another client.

## Identity and messaging

Namespace existing user IDs by site/project. Never link accounts solely by matching email text. Require verified account linking and organization membership. Single sign-on is a separate phase.

Existing Telegram bots can remain entry points into the same core. Verify chat identities and organization membership, preserve site context, and apply the same approvals as website tasks. WhatsApp and email use adapters with server-side credentials, preferences and delivery receipts.

## Rollout

1. Finalize Group allowances and onboarding.
2. Review all live project schemas, hosting costs and account access; designate or provision the core in the correct organization.
3. Prove one internal workflow: request, assignment, review, approved delivery and factual report.
4. Connect Agency using test events; test access isolation, duplicates, outages and reconciliation.
5. Connect Biz and future general business sites; consolidate shared operations in the central project. Assess verified shared login and legacy-data migration separately. Click remains independent.

Moving existing auth, storage or orders requires a separate inventory, backups, account mapping, rehearsal, cutover and recovery plan. Estate and Token remain outside this phase.

## Access observed

All three connected accounts were checked. Agency, Biz and Click projects are now visible and reported ACTIVE_HEALTHY. Agency and Biz are in different Supabase organizations; the future core organization remains to be selected. Project listing confirms access, not schema or security validation. No new paid project has been provisioned and no production data has been changed.
