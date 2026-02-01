# Mitmachim Scraper Cron Worker

This Cloudflare Worker runs on a schedule to automatically scrape Mitmachim data and store it in KV storage.

## Features

- **Automated Scraping**: Runs every 5 hours via Cloudflare Cron Triggers
- **Browser Rendering**: Uses Cloudflare's Browser Rendering API (Puppeteer)
- **KV Storage**: Stores scraped data in Cloudflare KV for fast global access
- **Manual Trigger**: Can be triggered manually via HTTP POST
- **No GitHub Actions**: Replaces the previous GitHub Actions workflow

## Deployment

The worker is already deployed at:
- URL: `https://tripleu-scraper-cron.usheraweiss.workers.dev`
- Schedule: `0 */5 * * *` (every 5 hours)

## Manual Triggering

To manually trigger the scraper:

```bash
curl -X POST https://tripleu-scraper-cron.usheraweiss.workers.dev
```

Response:
```json
{
  "success": true,
  "message": "Mitmachim data scraped and cached",
  "data": { ... }
}
```

## How It Works

1. **Cron Trigger**: Cloudflare automatically runs the worker every 5 hours
2. **Browser Launch**: Worker launches a headless Chrome browser via Puppeteer
3. **Page Scraping**: Navigates to `https://mitmachim.top/user/tripleu/posts`
4. **Data Extraction**: Extracts latest post title, content, likes, and date
5. **KV Storage**: Stores result in `mitmachim-latest` KV key
6. **API Access**: Main API worker reads from this KV key

## Data Flow

```
Cloudflare Cron (every 5 hours)
  → scraper-cron.js (Puppeteer scraping)
  → KV Storage (mitmachim-latest)
  → api-cache.js (serves /api/mitmachim)
  → Frontend (index.html)
```

## Configuration

Edit `wrangler-scraper.toml` to change:
- Schedule: `[triggers].crons`
- KV Namespace: `[[kv_namespaces]].id`
- Node.js compatibility: `compatibility_flags`

## Monitoring

View logs in real-time:
```bash
wrangler tail tripleu-scraper-cron
```

Or in Cloudflare Dashboard:
https://dash.cloudflare.com → Workers & Pages → tripleu-scraper-cron → Logs

## Cost

- **Browser Rendering**: Paid feature (~$5/month for 1M requests)
- **KV Writes**: 1,000 writes/day free, then $0.50/million
- **Worker Invocations**: 10 million requests/month free

At 5 runs per day (~150/month), this is well within free tier limits.

## Troubleshooting

### Scraper fails to find post

Check the fallback URL in `scraper-cron.js` line 131. Update if the topic has changed.

### KV not updating

- Check cron trigger is active: `wrangler deployments list tripleu-scraper-cron`
- View logs: `wrangler tail tripleu-scraper-cron`
- Manually trigger to test: `curl -X POST <worker-url>`

### Browser timeout

Increase timeout in `page.goto()` calls (currently 30000ms = 30s)

## Advantages Over GitHub Actions

✅ **Faster**: Runs on Cloudflare's edge network
✅ **More Reliable**: Dedicated browser rendering infrastructure
✅ **Direct to KV**: No need to commit/push to GitHub
✅ **Lower Latency**: Data available globally in milliseconds
✅ **Better Monitoring**: Real-time logs and analytics
✅ **Cost Effective**: Free tier covers most usage

## Migration from GitHub Actions

The old GitHub Actions workflow (`.github/workflows/mitmachim-cron.yml`) has been disabled but kept for reference. To fully remove it:

```bash
git rm .github/workflows/mitmachim-cron.yml
git commit -m "Remove deprecated GitHub Actions scraper workflow"
```

## Redeployment

To redeploy after making changes:

```bash
cd workers
npm install  # If dependencies changed
wrangler deploy --config wrangler-scraper.toml
```

Or use the npm script:
```bash
npm run deploy-scraper
```
