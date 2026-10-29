# Agenticcore-group
AgenticCore Group HQ and education website (agenticcore.group)

## Website source

This branch imports the Group concept website developed on 19 October 2026.
The static website is in `dist/`; this directory is intentionally versioned.
It needs no application dependencies, build framework or API keys.

### Check and deploy

- Run `npm run check` with Node 22 or newer.
- Netlify configuration uses `npm run check` and publishes `dist/`.
- Connect the intended repository and production branch in Netlify before expecting automatic deploys. Adding this configuration does not establish that connection.
- Keep provider credentials server-side when live integrations are introduced.

### Implemented in this concept

Team profiles, department examples, a campaign workflow demonstration, a managed-office configurator, a company-owned build selector, and downloadable browser-local briefs.

Prices, allowances, billing and capability descriptions are proposals. There is no live payment, messaging, job execution, submission or AI onboarding backend. The nightly report uses clearly labelled illustrative data. No user assessment is transmitted by this code.

### Source and publishing

The original private Sites draft remains intact. This import is the proposed GitHub source for future development, not an automatic synchronization between Sites and Netlify. Choose and maintain one source workflow before subsequent releases. Platform-specific Sites identity and credentials are intentionally excluded from this repository.

The office illustration and character board are generated concept artwork. Forge's final identity should be matched to the original approved reference before final brand production.

## Operating specification

See `docs/office-delivery-spec.md` for the two service routes, proposed build milestones, handover and maintenance boundaries, and implementation gates.

## Service checkout

`checkout.html` selects managed departments or a framework, calculates annual and AC Token discounts, creates a signed-in business order and records a transaction hash for manual verification. Orders and proofs are isolated by Supabase RLS. Database insert triggers recalculate totals; clients cannot set totals or payment status. `backend/checkout-schema.sql` is the applied schema reference. Custom frameworks enter scope review before payment. No automatic wallet charge, on-chain verification, renewal or package entitlement is granted. AC Token quantities are agreed manually; do not equate token units with USD.

Staff approve custom scope by changing an order to `awaiting_payment` through trusted administration, and verify funds before setting `paid`. Later installments are coordinated with the team; checkout currently records the initial installment or full invoice. Customer transaction hashes are claims, never proof of receipt.

## Shared framework bridge

Group queues new orders, submitted payment claims and work requests in a private outbox. The existing .click bot reads that outbox using a separately provisioned server credential. Group file deliveries are uploaded to a private `office-deliveries` bucket, published atomically, and downloaded only after a current membership check. Bot publication does not alter payment status.

Incremental applied schema references: `backend/framework-bridge.sql`, `backend/framework-payments.sql`, `backend/framework-deliveries.sql`. Bridge credentials are not in source. The fixed service-payment conversion is $0.0000006 per AC until 29 April 2027. New invoice reference fractions prevent ambiguous matching. The .click scanner checks Group invoices separately from .click wallet top-ups; previously created Group orders without reference amounts still need manual verification. No token-contract sale price is changed by this code.
