al# Referral preview experiment

This isolated server reproduces the relevant referral-preview flow without changing production code:

```text
GET /v1/tpapi/ctfes/redirect?campaignId=...&target=...
  -> 302 /en/registration/step1?campaignId=...
  -> server-rendered Open Graph metadata and image
```

It also serves `robots.txt` with a switchable rule so the only experiment variable is whether the referral path is disallowed.

## Run locally

From this directory:

```bash
npm start
```

Use these URLs:

```text
http://localhost:4173/robots.txt
http://localhost:4173/v1/tpapi/ctfes/redirect?campaignId=local123&target=http%3A%2F%2Flocalhost%3A4173%2Fen%2Fregistration%2Fstep1
http://localhost:4173/en/registration/step1?campaignId=local123
```

Inspect the redirect without following it:

```bash
curl --max-redirs 0 -A 'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatextest.php)' -D - -o /dev/null 'http://localhost:4173/v1/tpapi/ctfes/redirect?campaignId=local123&target=http%3A%2F%2Flocalhost%3A4173%2Fen%2Fregistration%2Fstep1'
```

The server logs method, path, and user agent for every request.

## Test the robots hypothesis publicly

Expose this demo through an approved public tunnel. Do not expose the production account app or credentials. Then run two separate experiments using different public tunnel URLs:

```bash
ROBOTS_MODE=block npm start
ROBOTS_MODE=allow npm start
```

Submit each public URL to Meta Sharing Debugger. Use a new URL or query value for each run because Meta caches previews. Compare:

1. Whether Meta fetches `/robots.txt`.
2. Whether Meta requests `/v1/tpapi/ctfes/redirect`.
3. Whether the debugger reports a robots restriction or an HTTP `403`.
4. Whether the final registration page shows the OG title, description, and image.

A `robots.txt` disallow should affect crawler permission, but it should not itself create an HTTP `403`. If both modes produce the same result, the cause is likely redirect handling or the tunnel/edge rather than the robots rule.

The redirect deliberately accepts only registration paths on the same host. This prevents the experiment from becoming an open redirect.
