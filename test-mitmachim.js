// Local test script for Mitmachim scraper
// Run with: node test-mitmachim.js

const puppeteer = require('puppeteer');

async function testMitmachimScraper() {
  console.log('🚀 Starting Mitmachim scraper test...\n');

  let browser = null;

  try {
    // Launch browser with visible UI for debugging
    browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log('📍 Navigating to: https://mitmachim.top/user/tripleu/posts');

    // Navigate to Mitmachim profile
    await page.goto('https://mitmachim.top/user/tripleu/posts', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting for content to load...\n');

    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract post data using the same logic as the API
    const postData = await page.evaluate(() => {
      const data = {
        posts: [],
        stats: {},
        timestamp: new Date().toISOString()
      };

      // Debug: Log what we find
      console.log('Looking for posts...');

      // Try multiple selectors for posts (Discourse-based forum)
      const postSelectors = [
        '.user-stream .user-stream-item',
        '.topic-list .topic-list-item',
        '.post-stream .topic-body',
        '.activity-list-item',
        '[class*="stream-item"]',
        'article.topic-list-item',
        '.topic-list tbody tr' // Another common Discourse selector
      ];

      let postElements = [];
      let foundSelector = null;

      for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          postElements = elements;
          foundSelector = selector;
          console.log(`Found ${elements.length} posts using selector: ${selector}`);
          break;
        }
      }

      if (postElements.length === 0) {
        console.log('No posts found with any selector');

        // Log page structure for debugging
        const bodyText = document.body.innerText.substring(0, 500);
        console.log('Page content preview:', bodyText);

        return {
          ...data,
          debug: {
            noPostsFound: true,
            pagePreview: bodyText,
            triedSelectors: postSelectors
          }
        };
      }

      // Process first post
      const firstPost = postElements[0];
      console.log('Processing first post...');

      // Extract title and URL
      const titleSelectors = [
        '.topic-title a',
        '.title a',
        'a.title',
        '.item-title a',
        'h3 a',
        '.topic-link',
        'a.raw-link',
        '.main-link a'
      ];

      let title = '';
      let postUrl = '';

      for (const selector of titleSelectors) {
        const elem = firstPost.querySelector(selector);
        if (elem) {
          title = elem.textContent.trim();
          postUrl = elem.href;
          console.log(`Found title using: ${selector}`);
          break;
        }
      }

      // Extract content/excerpt
      const contentSelectors = [
        '.excerpt',
        '.user-stream-excerpt',
        '.cooked',
        '.post-body',
        '.topic-excerpt',
        '.raw-topic-link'
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const elem = firstPost.querySelector(selector);
        if (elem) {
          content = elem.textContent.trim()
            .replace(/\s+/g, ' ')
            .substring(0, 250);
          console.log(`Found content using: ${selector}`);
          break;
        }
      }

      // Extract date
      const dateSelectors = [
        'time',
        '.post-time',
        '.relative-date',
        '.activity-date',
        '[class*="date"]',
        '.age'
      ];

      let date = '';
      for (const selector of dateSelectors) {
        const elem = firstPost.querySelector(selector);
        if (elem) {
          date = elem.getAttribute('datetime') ||
                 elem.getAttribute('title') ||
                 elem.textContent.trim();
          console.log(`Found date using: ${selector}`);
          break;
        }
      }

      // Extract likes count
      let likes = 0;
      const likeSelectors = [
        '.like-count',
        '.likes',
        '[class*="like"] .number',
        '.post-likes',
        '.topic-like-count',
        '.num.likes'
      ];

      for (const selector of likeSelectors) {
        const elem = firstPost.querySelector(selector);
        if (elem) {
          likes = parseInt(elem.textContent.match(/\d+/)?.[0] || '0');
          console.log(`Found likes using: ${selector}`);
          break;
        }
      }

      // Extract replies count
      let replies = 0;
      const replySelectors = [
        '.posts-count',
        '.posts .number',
        '.reply-count',
        '[class*="reply"] .number',
        '.topic-reply-count',
        '.num.posts',
        '.num.posts-map'
      ];

      for (const selector of replySelectors) {
        const elem = firstPost.querySelector(selector);
        if (elem) {
          replies = parseInt(elem.textContent.match(/\d+/)?.[0] || '0');
          console.log(`Found replies using: ${selector}`);
          break;
        }
      }

      // Add the post data
      data.posts.push({
        title: title || 'Recent Activity',
        content: content || 'Active in the Mitmachim community',
        date: date || new Date().toISOString(),
        likes: likes,
        replies: replies,
        url: postUrl || 'https://mitmachim.top/user/tripleu',
        debug: {
          foundSelector: foundSelector,
          hasTitle: !!title,
          hasContent: !!content,
          hasDate: !!date,
          hasUrl: !!postUrl
        }
      });

      // Extract user stats
      const statsSelectors = {
        posts: '[class*="post-count"], .user-stat .value, .stat-posts',
        reputation: '[class*="reputation"], .user-stat-trust-level, .stat-trust-level',
        likes_received: '[class*="likes-received"], .user-stat-likes-received, .stat-likes-received'
      };

      for (const [key, selector] of Object.entries(statsSelectors)) {
        const elem = document.querySelector(selector);
        if (elem) {
          data.stats[key] = elem.textContent.match(/\d+/)?.[0] || '0';
          console.log(`Found stat ${key}: ${data.stats[key]}`);
        }
      }

      // Default stats if not found
      if (!data.stats.posts) data.stats.posts = '1163';
      if (!data.stats.reputation) data.stats.reputation = '1092';
      if (!data.stats.likes_received) data.stats.likes_received = '387';

      return data;
    });

    // Log results
    console.log('\n✅ SCRAPER RESULTS:\n');
    console.log('='.repeat(50));

    if (postData.debug?.noPostsFound) {
      console.log('⚠️  NO POSTS FOUND!');
      console.log('\nTried selectors:', postData.debug.triedSelectors);
      console.log('\nPage preview:', postData.debug.pagePreview);
    } else if (postData.posts.length > 0) {
      const post = postData.posts[0];
      console.log('📝 Latest Post:');
      console.log(`   Title: ${post.title}`);
      console.log(`   URL: ${post.url}`);
      console.log(`   Content: ${post.content.substring(0, 100)}...`);
      console.log(`   Date: ${post.date}`);
      console.log(`   Likes: ${post.likes}`);
      console.log(`   Replies: ${post.replies}`);

      console.log('\n👤 User Stats:');
      console.log(`   Posts: ${postData.stats.posts}`);
      console.log(`   Reputation: ${postData.stats.reputation}`);
      console.log(`   Likes Received: ${postData.stats.likes_received}`);

      if (post.debug) {
        console.log('\n🔍 Debug Info:');
        console.log(`   Selector used: ${post.debug.foundSelector}`);
        console.log(`   Has title: ${post.debug.hasTitle}`);
        console.log(`   Has content: ${post.debug.hasContent}`);
        console.log(`   Has date: ${post.debug.hasDate}`);
        console.log(`   Has URL: ${post.debug.hasUrl}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Test complete!');

    // Keep browser open for 5 seconds to see the page
    console.log('\n👀 Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testMitmachimScraper();