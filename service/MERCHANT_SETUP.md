# Merchant and sign-in setup for the ChatGPT service

The separate ChatGPT MCP service is not deployed and does not accept payments yet. The browser editor remains free. This document records the proposed commercial offer and the steps needed before anyone can subscribe.

## Proposed offer

- Three distinct diagram links per signed-in account per Monday–Sunday UTC week remain free.
- An optional subscription would give unlimited ChatGPT-created diagram links for **USD $10 per month**. The monthly billing interval is an assumption to confirm before publishing checkout.
- A public promotional code, provisionally `DRAWFREE2026`, can give an authenticated account unlimited service access for **$0 until 2026-12-01 00:00 UTC** (through November 30). The redemption window closes at that instant. Limit redemption to one per verified service account; do not treat knowledge of a public code as proof of identity.
- The promotion does **not** silently start a paid subscription or charge a card on December 1. After the free period, the account returns to its three-link weekly allowance unless its owner explicitly subscribes. If automatic conversion is desired instead, obtain clear consent to the price, first-charge date, and cancellation terms during checkout, and implement and test that distinct flow before launch.

These are product decisions, **not active behavior**. There is no promo redemption endpoint, checkout, payment webhook, or merchant account connected to this repository.

## Create a Stripe merchant account

1. The business owner opens [Stripe registration](https://dashboard.stripe.com/register), chooses the correct business country, supplies their own email/name, verifies the email address, and enables two-factor authentication. Do not share login credentials with contributors. Stripe provides a sandbox for testing before live activation.
2. In [Stripe account onboarding](https://dashboard.stripe.com/account/onboarding), the owner supplies the legal business/individual details, business website and description, requested identity verification, payout bank details, and public support/statement information. Stripe determines the exact requirements for the selected country. Only the owner can provide these details and accept Stripe's terms.
3. In **test mode**, create a product named `DrawDiagrams ChatGPT service`, with a **recurring USD $10.00 monthly price**. Retain its test `price_...` ID; create its live counterpart only after Stripe approves live payments. Set up [Stripe's customer portal](https://docs.stripe.com/no-code/customer-portal) so customers can manage and cancel paid subscriptions.
4. Use Stripe-hosted Checkout on a **separate DrawDiagrams website**, behind authenticated account linking. Display the $10/month total, renewal interval, cancellation terms, and first payment date before checkout. Never initiate checkout or promote upgrades inside the public ChatGPT plugin. Store API keys and the webhook signing secret only as Worker secrets, never in git or browser code.
5. Before live checkout, implement and test signed webhook processing for successful subscriptions, renewals, payment failures, cancellation, refunds, and duplicate/out-of-order events. Connect the verified Stripe customer/subscription to the same stable service account used by the OAuth issuer + subject. Grant or revoke unlimited access from verified server-side state, not a success URL, a tool argument, or a browser request.

See [Stripe account setup](https://docs.stripe.com/get-started/account/set-up), [SaaS subscriptions](https://docs.stripe.com/get-started/use-cases/saas-subscriptions), and [Stripe coupons](https://docs.stripe.com/billing/subscriptions/coupons).

## Why a Stripe coupon alone does not implement the November deadline

A Stripe coupon has a discount **duration** (once, repeating, forever) and an optional **redemption deadline**. Expiring a 100%-off `forever` coupon on November 30 blocks new customers but leaves existing subscribers discounted forever. A `once` coupon discounts only the first invoice, and `repeating` discounts for a fixed number of months starting at each person's redemption, not until one shared calendar date. Do not configure a `forever` coupon for this offer.

Implement the public code as a **server-side DrawDiagrams promotion** with an absolute UTC cutoff, tied to the authenticated account. Redemption grants a separate promotional entitlement through the cutoff and does not create a Stripe subscription. The quota check must recognize either an unexpired promotional entitlement or an active paid subscription. Expire promotional access automatically at the cutoff, preserve the weekly free allowance, and show the offer terms on the website before redemption. Rate-limit redemption attempts, log only what is necessary, and test the UTC boundary. A Stripe promotion code could separately be used for a different offer, such as one free month, after its distinct terms are agreed.

## Sign-in from ChatGPT

ChatGPT acts as an **OAuth client** for MCP connections. Configure a DrawDiagrams OAuth 2.1 identity provider or compatible hosted provider with authorization-code + PKCE, appropriate registration (CIMD/DCR or a configured client), discovery/JWKS, and access tokens with the Worker URL as audience. A person signs into or creates their DrawDiagrams account as ChatGPT links the service; ChatGPT does not automatically disclose a reusable ChatGPT account ID to this Worker. Use that verified account for weekly quotas, promo redemption, and subscription mapping. Follow [OpenAI's MCP authentication guide](https://developers.openai.com/plugins/build/auth).

If a future public, self-service **Sign in with ChatGPT** developer program supports this use case, evaluate it separately; no such identity-provider integration is wired into this repository. Stripe merchant registration itself requires the merchant owner's own credentials and identity verification.

## Launch boundary

OpenAI's [plugin commerce guidelines](https://developers.openai.com/plugins/app-guidelines) currently restrict sales of digital services/subscriptions inside public plugins, including freemium upgrade promotion. They permit access through a pre-existing paid account but prohibit in-plugin checkout links and subscription pitches. Before launch, review the latest rules and submit the plugin for review. The separate website can describe pricing and host checkout; the ChatGPT MCP tool should only report account allowance and relevant access status.
