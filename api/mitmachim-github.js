import fs from 'fs';
import path from 'path';

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
    // Read the data file created by GitHub Actions
    const dataPath = path.join(process.cwd(), 'data', 'mitmachim.json');

    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

      return res.status(200).json({
        success: true,
        data: data,
        source: 'github-actions'
      });
    } else {
      // Fallback data if file doesn't exist yet
      return res.status(200).json({
        success: true,
        data: {
          posts: [{
            title: 'kvylock - New Network-Based MDM System',
            content: 'Excited to announce kvylock, an innovative MDM solution that leverages network-level controls for device management.',
            date: '2024-10-15T12:00:00Z',
            likes: 42,
            url: 'https://mitmachim.top/user/tripleu'
          }],
          stats: {
            posts: '1163',
            reputation: '1092'
          },
          timestamp: new Date().toISOString()
        },
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error reading Mitmachim data:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
