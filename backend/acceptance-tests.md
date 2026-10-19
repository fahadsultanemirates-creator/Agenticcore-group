# Required database acceptance cases

Run in an isolated project with two distinct verified test users, organizations A/B, an A viewer and a non-member. Seed organizations/memberships through a test administrator. Execute client cases as actual anon/authenticated roles with matching JWT claims, not as the database owner. Use pgTAP or equivalent SQL assertions; roll back test fixtures.

| Actor / action | Required result |
| --- | --- |
| Signed-out user reads any core table | Denied |
| A member reads organizations | A only |
| A member reads memberships | Their own membership rows only |
| A member reads requests | A only; B hidden |
| A member submits to A | Success; author=self, source=group, status=submitted |
| A member submits to B | Denied |
| Non-member submits to A | Denied |
| A viewer submits to A | Denied |
| Client supplies created_by, status, source_site, id or created_at on INSERT | Denied by column grants |
| Client changes organization/author/brief/status after submission | Denied |
| Client deletes request or grants themselves membership/admin | Denied |
| Invalid route, non-object brief or brief over 64 KiB | Rejected |
| Member is removed, then attempts reads/submission with an otherwise valid JWT | No access to removed organization |
| Server provisioning fails between organization and membership creation | Transaction leaves neither orphan record |
| Same onboarding idempotency key is retried | Same organization returned; no duplicate membership |
| Frontend submits fake price/payment/permission values in brief JSON | No entitlement, payment or external action granted |
| Agency user ID is presented as a core user without verified linking | Rejected |

After SQL cases pass, run Supabase security advisors and verify that no privileged keys, broad grants, unintended functions or public storage objects are exposed. Test the sign-in/request flow using separate browser sessions before launch.

Current status: SQL access cases were executed successfully in the separate Group project using backend/tests/core-access.sql. Server provisioning, idempotency, frontend validation and verified account linking remain unimplemented and untested. See activation-status.md.
