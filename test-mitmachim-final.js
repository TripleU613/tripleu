// Final test script for Mitmachim scraper with correct selectors
// Run with: node test-mitmachim-final.js

const puppeteer = require('puppeteer');

async function finalMitmachimTest() {
  console.log('🚀 Starting final Mitmachim scraper test...\n');

  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log('📍 Navigating to: https://mitmachim.top/user/tripleu/posts');

    await page.goto('https://mitmachim.top/user/tripleu/posts', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting for content to load...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll down to load more content
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract posts using corrected selectors based on what we saw
    const posts = await page.evaluate(() => {
      const results = [];

      // Look for post containers - based on the screenshot, posts are in a list structure
      const postContainers = document.querySelectorAll('.post, .post-body, .activity-post, [class*="post-body"]');

      console.log(`Found ${postContainers.length} post containers`);

      // Also try to find by topic title class we saw
      const topicTitles = document.querySelectorAll('.topic-title');
      console.log(`Found ${topicTitles.length} topic titles`);

      // Process each topic title as a post
      topicTitles.forEach((titleElem, index) => {
        if (index >= 3) return; // Get only first 3 posts

        const container = titleElem.closest('.post-body') || titleElem.parentElement?.parentElement;

        // Get the link within the title
        const link = titleElem.querySelector('a') || titleElem;
        const title = link.textContent?.trim() || '';
        const url = link.href || '';

        // Look for content/excerpt - usually in a sibling or child element
        let content = '';
        const excerptElem = container?.querySelector('.post-excerpt, .excerpt, .post-content') ||
                          container?.nextElementSibling?.querySelector('.excerpt');

        if (excerptElem) {
          content = excerptElem.textContent.trim();
        } else if (container) {
          // Get text content after the title
          const fullText = container.textContent || '';
          const titleIndex = fullText.indexOf(title);
          if (titleIndex !== -1) {
            content = fullText.substring(titleIndex + title.length).trim().substring(0, 200);
          }
        }

        // Look for metadata (time, likes, replies)
        let timeText = '';
        let likes = 0;
        let replies = 0;

        // Time could be in Hebrew like "לפני 8 שעות" (8 hours ago)
        const timeElem = container?.querySelector('time, .post-time, .relative-time, small');
        if (timeElem) {
          timeText = timeElem.getAttribute('datetime') ||
                    timeElem.getAttribute('title') ||
                    timeElem.textContent?.trim() || '';
        }

        // Look for engagement metrics
        const statsText = container?.textContent || '';

        // Look for likes (could be in Hebrew: לייק or English: like)
        const likesMatch = statsText.match(/(\d+)\s*(לייק|like|♥|❤)/i);
        if (likesMatch) likes = parseInt(likesMatch[1]);

        // Look for replies (could be in Hebrew: תגובה/תגובות)
        const repliesMatch = statsText.match(/(\d+)\s*(תגוב|reply|comment|💬)/i);
        if (repliesMatch) replies = parseInt(repliesMatch[1]);

        // Also check for view count (צפיות)
        const viewsMatch = statsText.match(/(\d+)\s*(צפי|view|👁)/i);
        const views = viewsMatch ? parseInt(viewsMatch[1]) : 0;

        results.push({
          title,
          url,
          content: content.substring(0, 250),
          time: timeText,
          likes,
          replies,
          views,
          index
        });
      });

      // If no topic titles found, try alternative approach
      if (results.length === 0) {
        // Find all links to topics
        const topicLinks = document.querySelectorAll('a[href*="/topic/"], a[href*="/t/"]');

        topicLinks.forEach((link, index) => {
          if (index >= 3) return;

          const container = link.closest('.post-body, .activity-item, .stream-item') ||
                          link.parentElement?.parentElement;

          results.push({
            title: link.textContent?.trim() || 'Post',
            url: link.href,
            content: container?.textContent?.substring(0, 200) || '',
            time: 'Recent',
            likes: 0,
            replies: 0,
            views: 0,
            method: 'alternative'
          });
        });
      }

      // Get user stats from the page
      const stats = {
        posts: document.querySelector('.stat-posts, [class*="post-count"]')?.textContent?.match(/\d+/)?.[0] || '0',
        topics: document.querySelector('.stat-topics, [class*="topic-count"]')?.textContent?.match(/\d+/)?.[0] || '0',
        followers: document.querySelector('.stat-followers, [class*="follower"]')?.textContent?.match(/\d+/)?.[0] || '0'
      };

      // Also look for stats in Hebrew
      const statsText = document.body.textContent;
      const postsMatch = statsText.match(/(\d+\.?\d*k?)\s*פוסטים/i);
      if (postsMatch) stats.posts = postsMatch[1];

      const topicsMatch = statsText.match(/(\d+)\s*נושאים/i);
      if (topicsMatch) stats.topics = topicsMatch[1];

      return { posts: results, stats };
    });

    console.log('📊 RESULTS:\n');
    console.log('='.repeat(50));

    if (posts.posts.length > 0) {
      console.log(`✅ Found ${posts.posts.length} posts!\n`);

      posts.posts.forEach((post, i) => {
        console.log(`📝 Post ${i + 1}:`);
        console.log(`   Title: ${post.title}`);
        console.log(`   URL: ${post.url}`);
        console.log(`   Content: ${post.content ? post.content.substring(0, 80) + '...' : 'No content'}`);
        console.log(`   Time: ${post.time || 'No time'}`);
        console.log(`   Engagement: ${post.likes} likes, ${post.replies} replies, ${post.views} views`);
        if (post.method) console.log(`   Method: ${post.method}`);
        console.log();
      });
    } else {
      console.log('❌ No posts found');
    }

    console.log('👤 User Stats:');
    console.log(`   Posts: ${posts.stats.posts}`);
    console.log(`   Topics: ${posts.stats.topics}`);
    console.log(`   Followers: ${posts.stats.followers}`);

    // Take a full page screenshot
    await page.screenshot({ path: 'mitmachim-full-test.png', fullPage: true });
    console.log('\n📸 Full page screenshot saved as mitmachim-full-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('✨ Test complete!');
    console.log('\n👀 Browser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
finalMitmachimTest();