# Core database activation — 19 October 2026

## Live target

- Connected account: Agenticcore Group.
- Supabase organization: dogmapevglpexxvboltx.
- Project: Agenticcore-office-core, ref pdaluprahifdejsjwjoi.
- Region: ap-south-1 (the existing project selected by the owner).
- Existing Agency, Biz and Click projects were not modified.

## Applied database history

| Version | Migration |
| --- | --- |
| 20261019144645 | office_core_foundation |
| 20261019144921 | office_request_author_index |

The first migration applies the reviewed core-schema.proposal.sql definition. The second adds an index on office_requests(created_by). The database migration history is authoritative. The CLI could not be installed in this session because its network approval was cancelled; no local migration-history files have been fabricated.

## Verified

Executed backend/tests/core-access.sql against the Group project in one rollback-only transaction. It passed for signed-out access denial, organization/membership/request isolation, allowed owner submission with safe defaults, cross-organization submission denial, forged status denial, denied updates/deletes/membership escalation, invalid route and JSON size/type rejection, viewer read-only access, outsider denial and removed-membership access revocation.

Post-test query confirmed zero organizations, zero memberships and zero requests. All sample records were rolled back.

Security advisor: no findings. Performance advisor: missing author index fixed; only unused-index informational notices remain because these indexes have not served real workloads. Retain the indexes for the intended request history and foreign-key operations.
Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

Existing site checks pass for 384 office configurations and the onboarding scenarios.

## Still not active

No frontend Auth connection, organization provisioning endpoint, saved-request interface, email delivery, uploads, billing or agent execution is enabled. The public assessment still downloads locally and sends no customer data.

Before accepting submissions, implement verified-session onboarding with transactional organization/membership creation, idempotency and abuse limits; validate server input; configure Auth callbacks and production domain; then test real sign-in and saved requests with independent sessions.

The remaining server/idempotency and end-to-end acceptance cases in acceptance-tests.md are not yet executed. These SQL checks are not evidence that those unimplemented services work.
