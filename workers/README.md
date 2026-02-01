# TripleU API Cache Worker

This Cloudflare Worker caches API responses from JTech Forums, GitHub, and Mitmachim to improve performance and reduce API calls.

## Features

- **Secure**: API keys stored as encrypted Cloudflare secrets (not in code)
- **Fast**: Responses cached in Cloudflare KV storage globally
- **Reliable**: Automatic cache invalidation with configurable TTLs
- **CORS-enabled**: Works from any frontend

## Cache Duration

- **JTech Forums**: 15 minutes (900s)
- **GitHub Activity**: 10 minutes (600s)
- **Mitmachim**: 1 hour (3600s) - Updated every 5 hours via GitHub Actions

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
wrangler kv:namespace create "API_CACHE"
```

This will output an ID like: `{ binding = "API_CACHE", id = "abc123..." }`

Copy the `id` value and update it in `wrangler.toml` replacing `YOUR_KV_NAMESPACE_ID`.

### 4. Set Secrets (API Keys)

```bash
# Set JTech Forums API Key
wrangler secret put JTECH_API_KEY
# When prompted, paste: ***REDACTED***

# Set GitHub Personal Access Token
wrangler secret put GITHUB_TOKEN
# When prompted, paste: ***REDACTED***
```

**IMPORTANT**: After setting these secrets, you should:
1. Rotate/regenerate these API keys since they were exposed in the frontend
2. Update the new keys using the same `wrangler secret put` commands

### 5. Deploy the Worker

```bash
wrangler deploy
```

This will deploy to: `https://tripleu-api-cache.YOURNAME.workers.dev`

### 6. Configure Custom Domain (Optional)

To use your custom domain instead of workers.dev:

1. Uncomment the `routes` section in `wrangler.toml`
2. Update the pattern to match your domain
3. Run `wrangler deploy` again

## API Endpoints

Once deployed, your worker will expose these endpoints:

- **JTech Forums**: `https://YOUR-WORKER.workers.dev/api/jtech-forum`
- **GitHub Activity**: `https://YOUR-WORKER.workers.dev/api/github`
- **Mitmachim**: `https://YOUR-WORKER.workers.dev/api/mitmachim`

## Testing

Test each endpoint after deployment:

```bash
# Test JTech Forums
curl https://YOUR-WORKER.workers.dev/api/jtech-forum

# Test GitHub
curl https://YOUR-WORKER.workers.dev/api/github

# Test Mitmachim
curl https://YOUR-WORKER.workers.dev/api/mitmachim
```

Check the `X-Cache` header to verify caching:
- `X-Cache: HIT` - Served from cache
- `X-Cache: MISS` - Fresh fetch, now cached

## Monitoring

View logs and analytics:

```bash
wrangler tail
```

Or view in Cloudflare Dashboard → Workers & Pages → tripleu-api-cache → Logs

## Security Notes

- Never commit secrets to git
- Rotate API keys that were previously exposed in frontend code
- KV data is encrypted at rest
- Worker runs in Cloudflare's secure sandbox

## Updating

To update the worker after making changes:

```bash
wrangler deploy
```

To update secrets:

```bash
wrangler secret put JTECH_API_KEY
wrangler secret put GITHUB_TOKEN
```
