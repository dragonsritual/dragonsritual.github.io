# Dragon Platform Governance Foundation — PASS 04
Engineering baseline, not legal advice. Before public accounts, uploads, paid stands, transferable credits, or advertising launch, obtain qualified counsel for the jurisdictions Dragon serves.

## Product constitution
1. Public browsing and designated local-first tools can be used without registration.
2. Registration adds identity, continuity, publishing, collaboration and community participation.
3. Paid operator space buys commercial infrastructure/scale, not basic participation.
4. Paid advertising buys attention and is always clearly disclosed.
5. Creative contents are not silently collected from anonymous/local tool sessions.

## Security gates before public UGC
- Server-side authorization and row-level security; never trust role/account IDs supplied by a browser.
- Least privilege service keys; secrets never shipped to client bundles.
- Rate limits for auth, posting, messaging, uploads and campaign creation.
- CSRF protections where cookie-authenticated writes exist; strict origin policy.
- Upload allowlists, size limits, MIME/signature validation, quarantine/malware scanning, randomized storage names, no executable uploads.
- Audit events for moderation, permissions, billing and destructive admin actions.
- MFA for staff/admin; session revocation; password reset abuse controls.
- Backups plus restore drills; dependency/security update process; incident-response runbook.

## Privacy/data
- Maintain a data inventory: purpose, retention, processor, access and deletion path.
- Anonymous analytics should be aggregate/minimized. Do not ingest contents of locally edited creative files unless the user explicitly uploads/saves/publishes them.
- Build account export/deletion and retention controls before scale.
- Treat precise location, device telemetry and private communications as higher-risk data.

## Community / UGC / IP
- Terms must require uploaders to have necessary rights and grant Dragon only the license needed to host/display/distribute content.
- Create report, moderation, repeat-abuse and appeal processes.
- Establish a copyright complaint/takedown workflow and evaluate U.S. DMCA safe-harbor/designated-agent requirements with counsel before relying on them.
- Preserve provenance/permission records for collaborations, radio tracks, commissioned work and licensed media.
- Do not imply Dragon owns user work merely because it was created with a Dragon tool.

## Advertising
- Ads/sponsored content must be readily identifiable and disclosures clear/prominent near the ad.
- Separate editorial ranking from paid inventory in the data model.
- Store campaign owner, creative, destination, dates, targeting/context, spend, approval state and audit trail.

## Children / age
- Decide intended audience before launch. If Dragon is directed to children under 13 or has actual knowledge it collects personal information from a child under 13, COPPA obligations can apply in the U.S.

## Credits / money
- PASS 04 models credits as non-cash, non-withdrawable platform promotional credits only.
- Do not enable cash redemption, user-to-user monetary transfer, investment language or stored-value promises without payments/regulatory/legal review.

## Devices / firmware
- Only explicitly supported hardware/manufacturer workflows.
- Never bypass firmware signatures, safety controls, geofencing, authorization or manufacturer safeguards.
- Separate read-only diagnostics from consequential device writes; require explicit confirmation for firmware/config changes.

## Accessibility
- Build semantic navigation, keyboard operation, visible focus, reduced motion and readable contrast into the rail/tools rather than retrofitting later.
