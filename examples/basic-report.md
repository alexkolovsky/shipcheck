# ShipCheck Report

**Target:** https://example.com/  
**Score:** 73/100

## Summary

| Severity | Count |
| -------- | ----: |
| Errors   |     0 |
| Warnings |     5 |
| Info     |     7 |
| Passed   |     6 |

## Issues

### SEO

#### ⚠️ Meta description is missing

Search engines may generate a snippet themselves without one.

- **Suggestion:** Add a concise meta description of about 50–160 characters.

#### ℹ️ No canonical link found

- **Suggestion:** Add <link rel="canonical"> to avoid duplicate-content ambiguity.

#### ℹ️ Open Graph tags are incomplete

- **Evidence:** missing: og:title, og:description, og:image
- **Suggestion:** Add og:title, og:description, and og:image for rich link previews.

#### ℹ️ Twitter Card metadata is missing

- **Suggestion:** Add <meta name="twitter:card"> for better previews on X/Twitter.

#### ℹ️ No robots.txt found

- **Suggestion:** Add a robots.txt to guide crawlers (even a permissive one is fine).

#### ℹ️ No sitemap.xml found

- **Suggestion:** Publish a sitemap.xml so crawlers can discover your pages.

### Security

#### ⚠️ Missing Strict-Transport-Security header

- **Suggestion:** Add Strict-Transport-Security to enforce HTTPS on future visits.

#### ⚠️ Missing Content-Security-Policy header

- **Suggestion:** Add a Content-Security-Policy to reduce XSS and injection risk.

#### ⚠️ Missing X-Content-Type-Options: nosniff

- **Suggestion:** Add X-Content-Type-Options: nosniff to prevent MIME sniffing.

#### ℹ️ Missing Referrer-Policy header

- **Suggestion:** Add a Referrer-Policy (e.g. strict-origin-when-cross-origin).

#### ℹ️ Missing Permissions-Policy header

- **Suggestion:** Add a Permissions-Policy to restrict powerful browser features.

#### ⚠️ Missing clickjacking protection (X-Frame-Options / frame-ancestors)

- **Suggestion:** Add X-Frame-Options: DENY or a CSP frame-ancestors directive.
