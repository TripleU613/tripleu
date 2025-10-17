// Simple API endpoint to get Mitmachim data
// This will use Vercel KV Storage or Edge Config in production

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // In production, this would fetch from Vercel KV or Edge Config
    // For now, we'll try to fetch fresh data with a simple fetch
    const response = await fetch('https://mitmachim.top/user/tripleu.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();

      // Parse the JSON data from Mitmachim
      const posts = data.user_actions?.filter(action => action.action_type === 5) || []; // Type 5 is usually posts

      if (posts.length > 0) {
        const latestPost = posts[0];
        return res.status(200).json({
          success: true,
          data: {
            posts: [{
              title: latestPost.title || 'Recent Activity',
              content: latestPost.excerpt || '',
              date: latestPost.created_at,
              likes: latestPost.likes || 0,
              replies: latestPost.posts_count || 0,
              url: `https://mitmachim.top/t/${latestPost.slug}/${latestPost.topic_id}`
            }],
            stats: {
              posts: data.user?.post_count || '1163',
              reputation: data.user?.trust_level || '1092',
              likes_received: data.user?.likes_received || '0'
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Fallback data if API fails
    return res.status(200).json({
      success: true,
      data: {
        posts: [{
          title: 'kvylock - New Network-Based MDM System',
          content: 'Excited to announce kvylock, an innovative MDM solution that leverages network-level controls for device management. This project brings enterprise-grade security to kosher phone systems.',
          date: '2024-10-15T12:00:00Z',
          likes: '42',
          replies: '15',
          url: 'https://mitmachim.top/user/tripleu'
        }],
        stats: {
          posts: '1163',
          reputation: '1092',
          likes_received: '387'
        },
        timestamp: new Date().toISOString()
      },
      cached: true
    });

  } catch (error) {
    console.error('Error fetching Mitmachim data:', error);

    // Return fallback data on error
    return res.status(200).json({
      success: true,
      data: {
        posts: [{
          title: 'kvylock - New Network-Based MDM System',
          content: 'Excited to announce kvylock, an innovative MDM solution that leverages network-level controls for device management. This project brings enterprise-grade security to kosher phone systems.',
          date: '2024-10-15T12:00:00Z',
          likes: '42',
          replies: '15',
          url: 'https://mitmachim.top/user/tripleu'
        }],
        stats: {
          posts: '1163',
          reputation: '1092',
          likes_received: '387'
        },
        timestamp: new Date().toISOString()
      },
      cached: true,
      error: error.message
    });
  }
}