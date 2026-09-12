# DrawDiagrams for ChatGPT — service foundation

This is a **separate, undeployed MCP service** for making diagram links from within ChatGPT. ChatGPT writes the Mermaid text; the service checks a signed-in DrawDiagrams account, applies the weekly allowance, and returns a link to the existing editor. There is no hosted AI model. The free static site, local templates, direct editor, and exports are unchanged.

## Allowance

- A user can make **three distinct diagram links per Monday–Sunday UTC week** with a free DrawDiagrams account. The fourth is refused until the following Monday 00:00 UTC.
- Identical title + source in a week gives the same result without using another slot, including after retries. Different users have separate allowances.
- A server-side `paid_entitlements` row with `active_until` later than the current Unix time allows unlimited diagram links. Tools cannot write entitlements. This repository **does not implement billing, checkout, or subscription enrollment**.
- Quota rows keep only issuer + subject, request fingerprint, timestamps, and whether the use consumed a free slot. The Mermaid source itself is not saved by the service. Share links carry diagram text in their URL fragment; anyone with a link can read it.
- This meter applies to the authenticated ChatGPT service, not to free local editing on the public site. It is an integration allowance, not a claim that a person cannot draw more than three diagrams elsewhere.

## Protocol and identity

The Worker exposes `POST /mcp` using MCP Streamable HTTP and `GET /.well-known/oauth-protected-resource`. It implements `get_diagram_allowance` and `create_diagram_link`. Each tool advertises `diagrams:use` OAuth scope. It verifies an OAuth JWT signature from the configured HTTPS JWKS, issuer, audience (`MCP_PUBLIC_URL`), expiration, and scope. The quota key comes from the verified issuer + subject, never from a tool argument, network address, or an unverified ChatGPT user label.

You must set up an OAuth 2.1 provider that supports authorization code + PKCE, publishes discovery/JWKS, and issues tokens with `aud` equal to `MCP_PUBLIC_URL`. ChatGPT does not automatically send a reusable ChatGPT account ID to arbitrary servers. Use your own account linking. Consult the [OpenAI plugin authentication guide](https://developers.openai.com/plugins/build/auth) to configure CIMD or DCR and test the OAuth linking flow.

## Local checks and deployment prerequisites

```bash
cd service
npm ci
npm test
npm run build  # TypeScript check and a Wrangler dry run; no deployment
```

To deploy, create a D1 database, copy `wrangler.example.jsonc` to the ignored `wrangler.jsonc`, and replace `database_id`, `MCP_PUBLIC_URL`, `OAUTH_ISSUER`, and `OAUTH_JWKS_URL` with real values. Keep `MCP_PUBLIC_URL` an HTTPS URL ending in `/mcp`, and make it the OAuth audience. Run `npx wrangler d1 migrations apply drawdiagrams-usage --remote --config wrangler.jsonc` **before** `npx wrangler deploy --config wrangler.jsonc`. Configure the identity provider to allow ChatGPT’s redirect URI, issue scope `diagrams:use`, and match the protected resource. Verify an end-to-end account link in ChatGPT developer mode before seeking public approval. The checked-in example uses placeholders and cannot authenticate real users.

The paid-entitlement table is ready for a separate, verified merchant billing integration. Do not let a client or MCP tool set `active_until`. When billing is implemented, derive the account ID from a trusted authenticated checkout session and update it only after a payment provider webhook passes signature verification; also handle renewal, cancellation, expiry, refund, and account deletion. The proposed offer is **USD $10/month**, with a separate public promotion offering $0 service access through November 2026. See the [merchant and sign-in setup guide](MERCHANT_SETUP.md) for the proposed terms, account creation, and why a Stripe coupon's expiration is insufficient. No merchant credentials, billing provider, checkout, or promotion redemption is connected yet.

## Public ChatGPT listing and commerce

As of September 2026, [OpenAI’s plugin guidelines](https://developers.openai.com/plugins/app-guidelines) prohibit selling digital services and subscriptions, including indirect freemium upsells inside a plugin. Existing paid-account access is allowed, but the plugin must not initiate a subscription or link directly to checkout. It must also offer a quality comparable to the website. The limit message in this service only reports when free uses reset. Public distribution requires [plugin submission and review](https://developers.openai.com/plugins/deploy/submission), a stable public HTTPS MCP URL, verified developer identity, and working test credentials. **This code is not a public ChatGPT plugin yet; do not advertise the paid tier in the ChatGPT experience.**
