# Security Note - API Key

## Current Implementation
The Discourse API key is currently embedded directly in the client-side JavaScript code. This is visible to anyone who views the page source.

## Security Considerations
- The API key provided is READ-ONLY, so it can only fetch public data
- It cannot modify, delete, or post content
- Limited to reading user activity and posts

## Recommended Production Setup
For production, consider:
1. Using a backend proxy server to hide the API key
2. Setting up Vercel/Netlify serverless functions
3. Using environment variables with a build process
4. Implementing CORS restrictions on your API key

## Current API Key
The key is stored in index.html for the forum activity feature.
To update it, search for `const apiKey =` in the file.

## Note
Since this is a read-only key for public forum data, the current implementation is acceptable for a personal bio site. However, never expose write-access keys in client-side code.