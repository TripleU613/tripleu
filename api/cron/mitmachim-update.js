import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// This function will be called by Vercel Cron once daily at 10:00 AM UTC
export const config = {
  maxDuration: 30, // Maximum function duration: 30 seconds
};

// Store the latest data in memory (in production, you'd use a database like Vercel KV)
let cachedData = null;
let lastFetch = null;

export default async function handler(req, res) {
  // Verify this is a cron job request (Vercel adds this header)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return res.status(401).end('Unauthorized');
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headlessMode,
    });

    const page = await browser.newPage();

    // Navigate to Mitmachim profile with JavaScript enabled
    await page.goto('https://mitmachim.top/user/tripleu/posts', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for dynamic content to load
    await page.waitForTimeout(3000);

    // Extract the latest post data
    const postData = await page.evaluate(() => {
      const data = {
        posts: [],
        stats: {},
        timestamp: new Date().toISOString()
      };

      // Look for post elements with various possible selectors
      const postSelectors = [
        '.post-stream .topic-body',
        '.user-stream .user-stream-item',
        '.activity-list-item',
        '[class*="post-"]',
        '.topic-list .topic-list-item'
      ];

      for (const selector of postSelectors) {
        const posts = document.querySelectorAll(selector);
        if (posts.length > 0) {
          // Get the first post
          const post = posts[0];

          // Extract post details
          const titleElem = post.querySelector('.title, .topic-title, h3, a[class*="title"]');
          const contentElem = post.querySelector('.excerpt, .cooked, .user-stream-excerpt');
          const dateElem = post.querySelector('time, .post-time, .relative-date');
          const linkElem = post.querySelector('a[href*="/t/"], a[href*="/topic/"]');

          data.posts.push({
            title: titleElem?.textContent?.trim() || 'Recent Activity',
            content: contentElem?.textContent?.trim()?.substring(0, 200) || '',
            date: dateElem?.getAttribute('datetime') || dateElem?.textContent || new Date().toISOString(),
            url: linkElem?.href || 'https://mitmachim.top/user/tripleu',
            likes: post.querySelector('[class*="like"] .number')?.textContent || '0',
            replies: post.querySelector('[class*="reply"] .number')?.textContent || '0'
          });
          break;
        }
      }

      // Extract user stats
      const statsSelectors = {
        posts: '[class*="post-count"], .stat-posts .value',
        reputation: '[class*="reputation"], .stat-reputation .value',
        likes: '[class*="likes-received"], .stat-likes .value'
      };

      for (const [key, selector] of Object.entries(statsSelectors)) {
        const elem = document.querySelector(selector);
        if (elem) {
          data.stats[key] = elem.textContent.match(/\d+/)?.[0] || '0';
        }
      }

      return data;
    });

    await browser.close();

    // Store the data
    cachedData = postData;
    lastFetch = new Date();

    // Save to Vercel KV or other storage if available
    // For now, we'll just return it

    return res.status(200).json({
      success: true,
      message: 'Mitmachim data updated successfully',
      data: postData
    });

  } catch (error) {
    console.error('Cron job error:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Export function to get cached data
export async function getCachedMitmachimData() {
  return cachedData;
}