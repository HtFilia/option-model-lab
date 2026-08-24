# Production deployment preparation

No repository workflow deploys to the VPS. This directory documents the intended boundary and the
manual work required before deployment automation is designed.

```text
pricing.lucaslebihan.dev      GitHub Pages static frontend
api.pricing.lucaslebihan.dev  Caddy on the VPS → 127.0.0.1:8000 → FastAPI container
```

## 1. Configure GitHub Pages

In repository **Settings → Pages**:

1. keep GitHub Actions as the publishing source;
2. set the custom domain to `pricing.lucaslebihan.dev`;
3. enable HTTPS after GitHub's DNS check succeeds.

At the DNS provider, configure the custom subdomain `pricing` as a `CNAME` pointing directly to
`htfilia.github.io.` without the repository name. Do not add a repository `CNAME` file: the custom
Actions workflow uses the Pages setting as the source of truth. Avoid wildcard DNS records.

The production Vite build already uses `/` as its base and emits canonical metadata for
`https://pricing.lucaslebihan.dev/`.

## 2. Configure API DNS and firewall

Create an `A` record for `api.pricing.lucaslebihan.dev` pointing to the VPS public IPv4 address. Add
an `AAAA` record only if IPv6 is intentionally configured on the host. DNS is changed manually; no
credential or provider token belongs in this repository.

Allow inbound TCP 80 and 443 to Caddy. Do not allow public inbound traffic to port 8000. Caddy needs
working outbound access for certificate issuance and renewal.

## 3. Build and run the backend

On the VPS, check out a reviewed commit and build from the repository root:

```bash
docker build --tag option-model-lab-backend:reviewed backend
```

Run the container with its published port bound only to loopback:

```bash
docker run --detach \
  --name option-model-lab-backend \
  --restart unless-stopped \
  --publish 127.0.0.1:8000:8000 \
  --env APP_ENV=production \
  --env ALLOWED_ORIGINS=https://pricing.lucaslebihan.dev \
  --env LOG_LEVEL=INFO \
  option-model-lab-backend:reviewed
```

The public API has no authentication. CORS limits browser origins, but it is not an access-control
system. Pydantic bounds quotes, maturities, prices, rates, optimizer tolerance, and iterations; Caddy
also rejects request bodies over 64 KB.

## 4. Install Caddy

Use Caddy 2.10 or newer because `request_body max_size` was introduced in that release. Copy
[`Caddyfile.example`](Caddyfile.example) into the host's managed Caddy configuration, validate it,
then reload Caddy using the installation method chosen for the VPS.

The example terminates public HTTPS, compresses responses, checks `/health`, limits request bodies,
and proxies to the loopback-only backend. It contains no secret.

## 5. Verify production

Check the private service first, then the public boundary:

```bash
curl --fail http://127.0.0.1:8000/health
curl --fail https://api.pricing.lucaslebihan.dev/health
```

Both should return `{"status":"ok"}`. Then open the production frontend, run Heston calibration,
and confirm that the diagnostics show `Remote API`. Stop the container temporarily and confirm the
same screen reports `Local browser fallback` while Learn and local models continue to work.

## 6. Updating and rollback

Build each reviewed revision under a unique immutable tag rather than overwriting the running tag.
Start the replacement against loopback, check `/health`, switch the container bound to port 8000,
and retain the prior image tag for rollback. Automating that sequence is a later deployment task;
CI currently verifies tests and the Docker build only.

## External references

- [GitHub Pages custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Caddy `reverse_proxy` directive](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy `request_body` directive](https://caddyserver.com/docs/caddyfile/directives/request_body)
