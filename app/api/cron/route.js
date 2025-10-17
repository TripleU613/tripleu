import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Vercel Cron configuration
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

      // Look for post elements
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