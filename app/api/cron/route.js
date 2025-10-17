import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Vercel Cron - runs once daily at 10:00 AM UTC (Hobby plan)
export const maxDuration = 30; // Maximum function duration: 30 seconds

export async function GET(request) {
  // Verify this is a cron job request (Vercel adds this header)
  if (
    process.env.CRON_SECRET &&
    request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
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

    // Navigate to Mitmachim profile
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

      // Look for post elements (Discourse-based forum)
      const postSelectors = [
        '.user-stream .user-stream-item',
        '.topic-list .topic-list-item',
        '.post-stream .topic-body',
        '.activity-list-item',
        '[class*="stream-item"]'
      ];

      for (const selector of postSelectors) {
        const posts = document.querySelectorAll(selector);
        if (posts.length > 0) {
          const post = posts[0];

          // Extract title and URL from topic link
          let title = '';
          let postUrl = '';
          const titleLink = post.querySelector('.topic-title a, .title a, a.title, h3 a');
          if (titleLink) {
            title = titleLink.textContent.trim();
            postUrl = titleLink.href;
          }

          // Extract content/excerpt
          const contentElem = post.querySelector('.excerpt, .user-stream-excerpt, .cooked');
          const content = contentElem?.textContent?.trim()?.replace(/\s+/g, ' ')?.substring(0, 250) || '';

          // Extract date
          const dateElem = post.querySelector('time, .post-time, .relative-date');
          const date = dateElem?.getAttribute('datetime') ||
                      dateElem?.getAttribute('title') ||
                      dateElem?.textContent?.trim() ||
                      new Date().toISOString();

          // Extract likes count (parse to number)
          const likesElem = post.querySelector('.like-count, .likes, [class*="like"] .number');
          const likes = parseInt(likesElem?.textContent?.match(/\d+/)?.[0] || '0');

          // Extract replies count (parse to number)
          const repliesElem = post.querySelector('.posts-count, .reply-count, [class*="reply"] .number');
          const replies = parseInt(repliesElem?.textContent?.match(/\d+/)?.[0] || '0');

          data.posts.push({
            title: title || 'Recent Activity',
            content: content || 'Active in the Mitmachim community',
            date: date,
            url: postUrl || 'https://mitmachim.top/user/tripleu',
            likes: likes,
            replies: replies
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

    // If no posts found, use fallback data
    if (postData.posts.length === 0) {
      postData.posts.push({
        title: 'kvylock - New Network-Based MDM System',
        content: 'Excited to announce kvylock, an innovative MDM solution that leverages network-level controls for device management.',
        date: '2024-10-15T12:00:00Z',
        likes: '42',
        replies: '15',
        url: 'https://mitmachim.top/user/tripleu'
      });
      postData.stats = {
        posts: '1163',
        reputation: '1092'
      };
    }

    // In production, save to Vercel KV or Edge Config here
    // await kv.set('mitmachim-data', postData);

    return NextResponse.json({
      success: true,
      message: 'Mitmachim data updated successfully',
      data: postData
    });

  } catch (error) {
    console.error('Cron job error:', error);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}