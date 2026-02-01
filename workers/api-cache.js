/**
 * Cloudflare Worker for caching API responses
 * Handles JTech Forums, GitHub, and Mitmachim data with KV caching
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route to appropriate handler
      if (path === '/api/jtech-forum') {
        return await handleJTechForum(env, corsHeaders);
      } else if (path === '/api/github') {
        return await handleGitHub(env, corsHeaders);
      } else if (path === '/api/mitmachim') {
        return await handleMitmachim(env, corsHeaders);
      } else {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Handle JTech Forums API - Cache for 15 minutes
 */
async function handleJTechForum(env, corsHeaders) {
  const cacheKey = 'jtech-forum-latest';
  const cacheTTL = 900; // 15 minutes

  // Try to get from KV cache
  const cached = await env.API_CACHE.get(cacheKey, { type: 'json' });
  if (cached && cached.timestamp && Date.now() - cached.timestamp < cacheTTL * 1000) {
    return new Response(JSON.stringify(cached.data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${cacheTTL}`,
      },
    });
  }

  // Fetch fresh data
  const apiKey = env.JTECH_API_KEY;
  const username = 'TripleU';

  // Try multiple endpoints with fallback
  const endpoints = [
    `https://forums.jtechforums.org/user_actions.json?username=${username}&filter=5&api_key=${apiKey}`,
    `https://forums.jtechforums.org/search.json?q=@${username}%20order:latest`,
    `https://forums.jtechforums.org/u/${username}/activity.json`,
  ];

  let data = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { 'User-Agent': 'TripleU-Portfolio/1.0' },
      });

      if (response.ok) {
        const json = await response.json();

        // Extract post data based on endpoint structure
        let post = null;
        if (json.user_actions && json.user_actions.length > 0) {
          post = extractPostFromUserActions(json.user_actions[0]);
        } else if (json.topics && json.topics.length > 0) {
          post = extractPostFromSearch(json.topics[0], json.posts);
        }

        if (post) {
          data = post;
          break;
        }
      }
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (!data) {
    throw new Error(`Failed to fetch JTech forum data: ${lastError?.message || 'No data found'}`);
  }

  // Cache the result
  await env.API_CACHE.put(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: data,
  }));

  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${cacheTTL}`,
    },
  });
}

/**
 * Handle GitHub API - Cache for 10 minutes
 */
async function handleGitHub(env, corsHeaders) {
  const cacheKey = 'github-activity-latest';
  const cacheTTL = 600; // 10 minutes

  // Try to get from KV cache
  const cached = await env.API_CACHE.get(cacheKey, { type: 'json' });
  if (cached && cached.timestamp && Date.now() - cached.timestamp < cacheTTL * 1000) {
    return new Response(JSON.stringify(cached.data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${cacheTTL}`,
      },
    });
  }

  // Fetch fresh data from GitHub
  const githubToken = env.GITHUB_TOKEN;
  const response = await fetch('https://api.github.com/users/TripleU613/events/public', {
    headers: {
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'TripleU-Portfolio/1.0',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const events = await response.json();

  // Find the most recent meaningful activity
  const activity = extractLatestGitHubActivity(events);

  // Cache the result
  await env.API_CACHE.put(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: activity,
  }));

  return new Response(JSON.stringify(activity), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${cacheTTL}`,
    },
  });
}

/**
 * Handle Mitmachim data - Cache for 1 hour (since it updates every 5 hours via GitHub Actions)
 */
async function handleMitmachim(env, corsHeaders) {
  const cacheKey = 'mitmachim-latest';
  const cacheTTL = 3600; // 1 hour

  // Try to get from KV cache
  const cached = await env.API_CACHE.get(cacheKey, { type: 'json' });
  if (cached && cached.timestamp && Date.now() - cached.timestamp < cacheTTL * 1000) {
    return new Response(JSON.stringify(cached.data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${cacheTTL}`,
      },
    });
  }

  // Fetch fresh data from GitHub
  const response = await fetch(
    'https://raw.githubusercontent.com/TripleU613/tripleu/master/data/mitmachim.json',
    {
      headers: { 'User-Agent': 'TripleU-Portfolio/1.0' },
    }
  );

  if (!response.ok) {
    throw new Error(`Mitmachim data fetch error: ${response.status}`);
  }

  const data = await response.json();

  // Cache the result
  await env.API_CACHE.put(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: data,
  }));

  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${cacheTTL}`,
    },
  });
}

/**
 * Extract post data from JTech user_actions response
 */
function extractPostFromUserActions(action) {
  if (!action) return null;

  return {
    title: action.title || 'No title',
    excerpt: action.excerpt || action.cooked || '',
    created_at: action.created_at,
    topic_id: action.topic_id,
    post_number: action.post_number,
    slug: action.slug,
    url: `https://forums.jtechforums.org/t/${action.slug}/${action.topic_id}/${action.post_number}`,
    likes: action.actions_summary?.reduce((sum, a) => sum + (a.count || 0), 0) || 0,
    reply_count: action.reply_count || 0,
  };
}

/**
 * Extract post data from JTech search response
 */
function extractPostFromSearch(topic, posts) {
  if (!topic) return null;

  const post = posts?.find(p => p.topic_id === topic.id);

  return {
    title: topic.title || 'No title',
    excerpt: post?.blurb || topic.excerpt || '',
    created_at: topic.created_at,
    topic_id: topic.id,
    post_number: 1,
    slug: topic.slug,
    url: `https://forums.jtechforums.org/t/${topic.slug}/${topic.id}`,
    likes: topic.like_count || 0,
    reply_count: topic.posts_count - 1 || 0,
  };
}

/**
 * Extract latest meaningful GitHub activity
 */
function extractLatestGitHubActivity(events) {
  if (!events || events.length === 0) {
    return null;
  }

  // Find first meaningful event
  for (const event of events) {
    const repo = event.repo?.name || '';
    const created_at = event.created_at;

    let description = '';
    let eventType = event.type;

    switch (event.type) {
      case 'PushEvent':
        const commits = event.payload?.commits || [];
        const commitMsg = commits[0]?.message || 'Code push';
        description = `Pushed ${commits.length} commit${commits.length !== 1 ? 's' : ''}: ${commitMsg}`;
        break;
      case 'CreateEvent':
        description = `Created ${event.payload?.ref_type || 'repository'}`;
        break;
      case 'IssuesEvent':
        description = `${event.payload?.action} issue: ${event.payload?.issue?.title}`;
        break;
      case 'PullRequestEvent':
        description = `${event.payload?.action} pull request: ${event.payload?.pull_request?.title}`;
        break;
      case 'WatchEvent':
        description = 'Starred repository';
        break;
      case 'ForkEvent':
        description = 'Forked repository';
        break;
      case 'ReleaseEvent':
        description = `Released ${event.payload?.release?.tag_name}`;
        break;
      default:
        continue; // Skip non-meaningful events
    }

    if (description) {
      return {
        repo: repo,
        repo_url: `https://github.com/${repo}`,
        type: eventType,
        description: description,
        created_at: created_at,
      };
    }
  }

  return null;
}
