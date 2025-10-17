# Security Note - API Keys

## Current Implementation
Both Discourse (Forum) and GitHub API keys are currently embedded directly in the client-side JavaScript code. These are visible to anyone who views the page source.

## Security Considerations

### Discourse API Key
- The API key provided is READ-ONLY, so it can only fetch public data
- It cannot modify, delete, or post content
- Limited to reading user activity and posts

### GitHub Personal Access Token
- Token: `***REDACTED***`
- **Verified as READ-ONLY** for public repositories and user data
- Cannot create, modify, or delete repositories
- Cannot modify user profile or settings
- Cannot create issues, pull requests, or comments
- Limited to reading public activity events

## Security Verification Tests
Created test files to verify token safety:
- `test-github-token.html` - Verifies token cannot perform write operations
- `test-github-activity.html` - Tests activity data fetching
- `verify-all-integrations.html` - Complete integration testing dashboard

## Recommended Production Setup
For production, consider:
1. Using a backend proxy server to hide API keys
2. Setting up Vercel/Netlify serverless functions
3. Using environment variables with a build process
4. Implementing rate limiting to prevent abuse
5. Rotating tokens periodically

## Current API Keys Location
Both keys are stored in index.html:
- Forum API: Search for `const apiKey =`
- GitHub Token: Search for `const githubToken =`

## Note
Since both keys are read-only for public data, the current implementation is acceptable for a personal bio site. However, never expose write-access keys in client-side code.