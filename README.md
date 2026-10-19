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
