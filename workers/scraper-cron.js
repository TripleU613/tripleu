/**
 * Cloudflare Worker with Cron Trigger for scraping Mitmachim data
 * Runs every 5 hours and stores results in KV
 */

import puppeteer from '@cloudflare/puppeteer';

export default {
  async scheduled(event, env, ctx) {
    console.log('Cron triggered:', new Date().toISOString());

    try {
      const data = await scrapeMitmachim(env);

      // Store in KV with timestamp
      await env.API_CACHE.put('mitmachim-latest', JSON.stringify({
        timestamp: Date.now(),
        data: data,
      }));

      console.log('✅ Successfully scraped and cached Mitmachim data');
      console.log('Topic:', data.posts[0]?.title);
    } catch (error) {
      console.error('❌ Error in scraper cron:', error);

      // Store error fallback data
      const fallbackData = {
        posts: [{
          title: 'אפליקציית ניהול וחסימה לאנדרואיד: TripleU MDM',
          content: 'Active in the Mitmachim community',
          date: new Date().toISOString(),
          likes: 0,
          url: 'https://mitmachim.top/user/tripleu'
        }],
        stats: {
          posts: '1163',
          reputation: '1092'
        },
        timestamp: new Date().toISOString(),
        error: error.message
      };

      await env.API_CACHE.put('mitmachim-latest', JSON.stringify({
        timestamp: Date.now(),
        data: fallbackData,
      }));
    }
  },

  // Also allow manual triggering via HTTP
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Use POST to trigger manual scrape', { status: 405 });
    }

    try {
      const data = await scrapeMitmachim(env);

      await env.API_CACHE.put('mitmachim-latest', JSON.stringify({
        timestamp: Date.now(),
        data: data,
      }));

      return new Response(JSON.stringify({
        success: true,
        message: 'Mitmachim data scraped and cached',
        data: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function scrapeMitmachim(env) {
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();

    // Navigate to posts page
    console.log('Navigating to Mitmachim user posts...');
    await page.goto('https://mitmachim.top/user/tripleu/posts', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Try to extract post info
    console.log('Extracting post info...');
    const postInfo = await page.evaluate(() => {
      const containerSelectors = [
        '[component="user/posts"]',
        '.posts-list',
        '.user-posts',
        '[data-component="posts"]',
        '.posts',
        'main'
      ];

      let firstPostCard = null;

      for (const containerSelector of containerSelectors) {
        const container = document.querySelector(containerSelector);
        if (container) {
          const itemSelectors = [
            ':scope > div:first-child',
            ':scope > li:first-child',
            '.post-card:first-child',
            '.user-stream-item:first-child',
            '[data-tid]:first-child',
            '.post:first-child'
          ];

          for (const itemSelector of itemSelectors) {
            const item = container.querySelector(itemSelector);
            if (item) {
              firstPostCard = item;
              break;
            }
          }

          if (firstPostCard) break;
        }
      }

      if (!firstPostCard) {
        const globalSelectors = [
          '.post-card',
          '.user-stream-item',
          '[data-tid]',
          '.topic-title'
        ];

        for (const selector of globalSelectors) {
          const elem = document.querySelector(selector);
          if (elem) {
            firstPostCard = elem.closest('div, li') || elem;
            break;
          }
        }
      }

      if (!firstPostCard) {
        return null;
      }

      const topicTitleElem = firstPostCard.querySelector('.topic-title a, a.topic-title, [component="topic/title"] a, a[href*="/topic/"]');
      const topicTitle = topicTitleElem ? topicTitleElem.textContent.trim() : '';
      const topicUrl = topicTitleElem ? topicTitleElem.href : '';

      const contentElem = firstPostCard.querySelector('.content, .excerpt, [component="post/content"], p');
      const content = contentElem ? contentElem.textContent.trim().replace(/\s+/g, ' ').substring(0, 250) : '';

      const timeElem = firstPostCard.querySelector('time, .timeago, span[class*="time"]');
      const timestamp = timeElem ? (timeElem.getAttribute('datetime') || timeElem.getAttribute('title') || timeElem.textContent.trim()) : '';

      return {
        topicTitle,
        topicUrl,
        content,
        timestamp
      };
    });

    if (!postInfo || !postInfo.topicUrl) {
      console.log('Could not find post, using fallback...');
      const fallbackUrl = 'https://mitmachim.top/topic/26215';

      await page.goto(fallbackUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      const postData = await extractPostData(page, fallbackUrl);
      return sanitizeData(postData);
    }

    console.log(`Found topic: ${postInfo.topicTitle}`);
    console.log(`Navigating to: ${postInfo.topicUrl}`);

    await page.goto(postInfo.topicUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    const postData = await extractPostData(page, postInfo.topicUrl, postInfo);
    return sanitizeData(postData);

  } finally {
    await browser.close();
  }
}

async function extractPostData(page, url, extractedInfo = {}) {
  return await page.evaluate((info, pageUrl) => {
    const h1Selectors = [
      'h1[component="post/header"]',
      '[itemprop="name"] h1',
      '[itemprop="name"]',
      '.topic-title h1',
      'main h1'
    ];

    let h1Elem = null;
    for (const sel of h1Selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim() !== 'דף הבית') {
        h1Elem = el;
        break;
      }
    }

    const topicTitle = h1Elem ? h1Elem.textContent.trim() : (info.topicTitle || 'Recent Activity');

    let yourPostContent = '';
    let yourPostLikes = 0;
    let yourPostDate = info.timestamp || new Date().toISOString();

    const allPosts = document.querySelectorAll('[component="post"]');

    for (const post of allPosts) {
      const authorLink = post.querySelector('[component="user/picture"]');
      const authorNameLink = post.querySelector('a[href*="/user/tripleu"], .username a');

      const isYourPost = (authorLink && authorLink.getAttribute('href')?.includes('/user/tripleu')) ||
                       (authorNameLink && (authorNameLink.textContent.trim().toLowerCase() === 'tripleu'));

      if (isYourPost) {
        const contentElem = post.querySelector('[component="post/content"], .content');
        if (contentElem) {
          yourPostContent = contentElem.textContent.trim().replace(/\s+/g, ' ').substring(0, 250);
        }

        const votesElem = post.querySelector('[component="post/vote-count"]');
        if (votesElem) {
          const dataVotes = votesElem.getAttribute('data-votes');
          yourPostLikes = dataVotes !== null ? parseInt(dataVotes) || 0 : 0;
        }

        const timeElem = post.querySelector('time');
        if (timeElem) {
          yourPostDate = timeElem.getAttribute('datetime') || timeElem.textContent.trim();
        }

        break;
      }
    }

    return {
      posts: [{
        title: topicTitle,
        content: yourPostContent || info.content || 'Active in the Mitmachim community',
        date: yourPostDate,
        likes: yourPostLikes,
        url: pageUrl
      }],
      stats: {
        posts: '1163',
        reputation: '1092'
      },
      timestamp: new Date().toISOString()
    };
  }, extractedInfo, url);
}

function sanitizeData(value) {
  if (typeof value === 'string') {
    return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeData);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, sanitizeData(val)]));
  }
  return value;
}
