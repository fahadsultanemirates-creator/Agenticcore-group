# Live office chat

## Runtime and credentials

The website sends authenticated POST requests to /api/office-chat, implemented as a Netlify Function. OPENAI_API_KEY remains in Netlify's Functions environment and is never read into the frontend or retrieved for development. The function uses the pinned OpenAI SDK and the Responses API, with store:false. The default model is gpt-5-mini with minimal reasoning and a bounded response. OPENAI_CHAT_MODEL can override it with a Responses/Structured-Outputs model that supports that reasoning setting.

A private OFFICE_CHAT_SERVER_TOKEN was generated for Netlify Functions. Only its SHA-256 hash is stored in the service-only office_chat_server_auth table. Neither credential belongs in Git. The developer tools deliberately do not retrieve the user's API key. GET /api/office-chat returns only a configured boolean; a successful authenticated reply is still required to verify the provider credential and account quota.

The internal Supabase office-chat-store Edge Function requires both this server credential and the client's Supabase bearer token. It validates the token through Auth, checks verified email, and derives the user identity itself. Gateway JWT verification is disabled because the function performs its own Auth validation; unauthenticated requests still fail. The Edge Function uses its built-in service credential for authorized database writes. Netlify receives no Supabase administrator key.

## Access and persistence

Conversations are private to the signed-in user within the selected business, with separate history per character. SELECT requires current membership. Forge history additionally requires a current package. Client INSERT, UPDATE, DELETE and reservation RPC access are denied, so a browser cannot forge stored assistant responses or bypass usage checks. The internal bridge independently checks membership and Forge entitlement again before finalization.

A service-only reservation function takes a global transaction lock for short quota/idempotency checks. It records an attempt before calling OpenAI. Defaults: 20 attempts per user per UTC day without a package, 100 with a package; 200 per business; 1,000 across the pilot site; minimum five seconds between attempts by a user. Failed attempts also count, limiting provider-outage retries. Limits are pilot application controls, not purchased package allowances or guaranteed spend budgets. Netlify also applies an IP rate limit.

A client-generated request UUID prevents replay of the same attempt. Repeated completed requests return their saved result without another model call; pending/failed attempts produce an explicit status. Provider failures leave a failed attempt, not fictional work. The frontend keeps unsent message text and suggests refreshing history after interrupted requests.

The model receives the latest eight completed exchanges with the selected character and bounded current business context (ten project records and five recent request summaries). The dashboard displays the latest 30 attempts. Context is retrieved from the authorized business by the server; clients cannot submit fabricated assistant history, provider instructions or business records.

## Office suggestions

Structured Outputs returns a reply and proposed route/department/work-level/build-tier/goal fields. The server validates all selection identifiers against shared catalogue data. The client explicitly chooses Review this office suggestion before changes enter the builder. Prices and allowances are calculated by the existing deterministic model. Saving the office still requires the existing proposal consent and creates a request, not service activation. No live execution, payments, messaging, browsing, document production or external actions are enabled by this release.

The chat screen discloses that messages and relevant context go to OpenAI and are saved privately in Supabase. Public assessment behavior remains unchanged.

## Deployment and verification

Database schema and internal storage function are installed in the Group Supabase project. Netlify's function and dashboard changes ship through the pull request. The production deploy must include OPENAI_API_KEY and OFFICE_CHAT_SERVER_TOKEN in Functions scope. No other user's websites or databases are changed.

Automated checks cover access denials, Forge checks, quota responses, replay behavior, validated output, persistence before response, provider-error sanitization, context changes and chat-to-builder review. Rollback-only SQL tests check isolation, denied client writes, forbidden RPC/key access, throttle, quota and idempotency. Supabase advisory review leaves the pre-existing Auth leaked-password-protection warning; no chat policy findings remain after the service-only policy is explicit.

Remaining after deployment: check GET configuration status, send an authenticated message to Maya/Amara, refresh to verify history, review an office suggestion and verify Forge remains locked without a package. Browser layout and real provider-response testing have not been completed in the development environment.
