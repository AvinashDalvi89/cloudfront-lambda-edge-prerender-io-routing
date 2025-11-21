# CloudFront Lambda@Edge Prerender.io Routing

This repository contains a single Lambda@Edge handler (`prerender-origin-routing.js`) that implements two related behaviors for integrating prerender.io with CloudFront:

- Viewer-request: detect crawlers / bots and add special headers to route the request to prerender.io.
- Origin-request: when those headers are present, forward the request to the prerender.io service.

**Files**

- `prerender-origin-routing.js`: Lambda handler containing both viewer-request and origin-request logic.

**How it works**

- Viewer-request flow:
  - The function inspects the incoming request's `User-Agent` and `Host` headers.
  - If the `User-Agent` matches a long list of known crawlers or the request contains `_escaped_fragment_`, and the URI doesn't look like a static asset, the function adds these headers to the request:
    - `X-Prerender-Token` — set to `{PRERENDER_KEY}` (replace with your actual key).
    - `X-Prerender-Host` — original `Host` value.
    - `X-Prerender-Cachebuster` — timestamp used to avoid caching conflicts.
    - `X-Query-String` — the original query string.
  - These headers are intended to be visible to the origin-request function.

- Origin-request flow:
  - If `X-Prerender-Token` and `X-Prerender-Host` are present, the function rewrites the request `origin` to point to `service.prerender.io` and sets the request `path` to include the encoded original host (so prerender.io knows which page to render).
  - If `X-Query-String` was set earlier, it restores the `querystring` before forwarding.

**Configuration**

- Replace the `{PRERENDER_KEY}` placeholder in `prerender-origin-routing.js` with your actual prerender.io token before deploying.
- The script currently sets `sslProtocols: ['TLSv1', 'TLSv1.1']` when contacting `service.prerender.io`. These protocols are outdated; consider updating to `TLSv1.2` if your environment and prerender.io support it.

**Deployment**

Typical steps to deploy as Lambda@Edge (outline):

1. Create a Lambda function in `us-east-1` (N. Virginia) because Lambda@Edge requires the function to be in that region.
2. Use the Node.js runtime compatible with the code (the handler is a plain JavaScript function).
3. Publish a version of the Lambda function.
4. Associate the published version with a CloudFront behavior:
   - Attach the handler as a `viewer-request` trigger (to detect bots and add headers).
   - Attach the same handler as an `origin-request` trigger (CloudFront will call it before fetching the origin; the code routes to prerender.io when header flags are present).

You can deploy using the AWS Console, CloudFormation, CDK, or the `aws` CLI. Example zip-and-create (illustrative):

```bash
zip function.zip prerender-origin-routing.js
aws lambda create-function --region us-east-1 --function-name prerender-origin-routing \
  --runtime nodejs18.x --role <role-arn> --handler prerender-origin-routing.handler --zip-file fileb://function.zip
aws lambda publish-version --function-name prerender-origin-routing
# Then associate the published version with CloudFront behaviors
```

**Testing**

- To simulate a crawler and verify that `viewer-request` sets headers, run:

```bash
curl -s -D - -o /dev/null -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" https://example.cloudfront.net/path
```

- To test origin-request behavior, ensure CloudFront is configured to call the origin-request trigger and that `X-Prerender-Token` and `X-Prerender-Host` headers are present (CloudFront forwards the modified request to origin). Inspect CloudFront logs or prerender.io logs to confirm requests are received.

**Notes & Security**

- Keep your prerender.io token secret. Do not commit real tokens to source control.
- The code includes a long regex of known crawler user agents; update it if you need to add/remove crawlers.
- Consider tightening the `sslProtocols` to modern TLS versions.

**License**

This repository is provided as-is. Add your preferred license if you plan to publish or share.

---

If you want, I can:
- Add a `package.json` and simple deployment script.
- Replace `{PRERENDER_KEY}` with an environment variable pattern and update the README with deployment steps using the AWS CLI or CloudFormation templates.

File: `prerender-origin-routing.js`
# cloudfront-lambda-edge-prerender-io-routing
lambda edge code for routing cloudfront origin request to lambda edge
