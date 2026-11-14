# OCI deployment checklist

This directory documents the production target only. It intentionally does not deploy or expose a sandbox with invented cloud credentials.

## Baseline architecture

1. **Public edge:** OCI flexible Load Balancer with TLS from a trusted certificate, OCI Web Application Firewall, and a backend-only route to the API. Restrict unneeded ports and countries only where legally/operationally appropriate.
2. **Application:** backend containers on private OCI Compute instances or OKE, across at least two fault domains for production. Do not expose SSH or database ports publicly; use OCI Bastion and least-privilege dynamic groups.
3. **Database:** replace local SQLite with a managed Oracle database before multi-instance deployment. Use an encrypted private subnet, migrations, strong credentials, and tested point-in-time recovery. Keep integer minor units and atomic ledger/idempotency semantics.
4. **Secrets:** database credentials, sports-provider credentials and signing material belong in OCI Vault, never app.json, the mobile bundle, source control, or CI logs.
5. **Mobile:** Android communicates over HTTPS only. Release builds must not enable cleartext traffic. Treat mobile clients as untrusted and keep all wallet/odds decisions on the backend.
6. **Operations:** OCI Logging and Monitoring, central security alarms, immutable audit export, vulnerability scanning, rate limiting, tested backup restoration, incident response, and staged rollouts.
7. **Assurance:** automated API/integration tests, Android end-to-end tests, threat modeling, and independent penetration testing before production. No architecture provides a 100% no-bug/no-hack guarantee.

## Production data required later

- Football fixtures, live scores, independently generated/sourced odds and authoritative official result feed with commercial terms
- Authenticated admin/risk operations with MFA and audit trails
- Match suspension, bet settlement, cancellations, corrections and reconciliation
- Account recovery and real identity controls only after legal/compliance approval

## Explicitly blocked until authorized

No real deposits, withdrawals, bonuses with cash value, merchant/payment credentials, or real-money settlement should be added to this sandbox. Review Moroccan requirements with qualified counsel and obtain the required authorization or licensed partnership first.
