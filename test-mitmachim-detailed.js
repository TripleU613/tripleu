// Detailed test script for Mitmachim scraper
// Run with: node test-mitmachim-detailed.js

const puppeteer = require('puppeteer');

async function testMitmachimDetailed() {
  console.log('🚀 Starting detailed Mitmachim scraper test...\n');

  let browser = null;

  try {
    // Launch browser with visible UI for debugging
    browser = await puppeteer.launch({
      headless: false, // Set to true for production
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

    // First, let's examine the page structure
    const pageStructure = await page.evaluate(() => {
      const result = {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 300),
        hasEmberApp: !!document.querySelector('#ember-app, .ember-application'),
        hasDiscourseApp: !!document.querySelector('.discourse-root, [data-discourse-version]'),
        postElements: []
      };

      // Find all links that might be posts
      const allLinks = Array.from(document.querySelectorAll('a[href*="/t/"], a[href*="/topic/"]'));
      result.postLinksCount = allLinks.length;

      if (allLinks.length > 0) {
        result.firstPostLink = {
          text: allLinks[0].textContent.trim(),
          href: allLinks[0].href,
          parentClass: allLinks[0].parentElement?.className || 'no-class',
          parentParentClass: allLinks[0].parentElement?.parentElement?.className || 'no-class'
        };
      }

      // Try to find post containers
      const possibleContainers = [
        '.posts',
        '.user-stream',
        '.topic-list',
        '.activity-list',
        '[class*="post"]',
        '[class*="topic"]',
        '[class*="activity"]',
        'article',
        'tr',
        '.item'
      ];

      for (const selector of possibleContainers) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          result.postElements.push({
            selector,
            count: elements.length,
            firstElementClass: elements[0].className || 'no-class',
            firstElementText: elements[0].textContent.substring(0, 100)
          });
        }
      }

      return result;
    });

    console.log('📋 PAGE STRUCTURE:\n');
    console.log('Title:', pageStructure.title);
    console.log('Has Ember App:', pageStructure.hasEmberApp);
    console.log('Has Discourse App:', pageStructure.hasDiscourseApp);
    console.log('Post links found:', pageStructure.postLinksCount);

    if (pageStructure.firstPostLink) {
      console.log('\n🔗 First Post Link:');
      console.log('  Text:', pageStructure.firstPostLink.text);
      console.log('  URL:', pageStructure.firstPostLink.href);
      console.log('  Parent class:', pageStructure.firstPostLink.parentClass);
    }

    console.log('\n📦 Possible Post Containers:');
    pageStructure.postElements.forEach(el => {
      console.log(`  ${el.selector}: ${el.count} found`);
      if (el.count > 0) {
        console.log(`    First element class: ${el.firstElementClass}`);
        console.log(`    Preview: ${el.firstElementText.substring(0, 50)}...`);
      }
    });

    // Now try our actual scraping logic
    console.log('\n' + '='.repeat(50));
    console.log('🔧 RUNNING ACTUAL SCRAPER:\n');

    const scrapedData = await page.evaluate(() => {
      const data = {
        posts: [],
        debug: {
          selectors: {}
        }
      };

      // Start with the most specific approach - find topic links
      const topicLinks = document.querySelectorAll('a[href*="/t/"]');

      if (topicLinks.length > 0) {
        console.log(`Found ${topicLinks.length} topic links`);

        // Process the first topic link
        const firstLink = topicLinks[0];

        // Get the container element (likely the post/activity item)
        let container = firstLink.closest('.item') ||
                       firstLink.closest('tr') ||
                       firstLink.closest('[class*="post"]') ||
                       firstLink.closest('[class*="topic"]') ||
                       firstLink.parentElement?.parentElement;

        if (container) {
          // Extract data from container
          const title = firstLink.textContent.trim();
          const url = firstLink.href;

          // Look for excerpt/content
          let content = '';
          const excerptElem = container.querySelector('.excerpt, .summary, .raw-topic-link, .topic-excerpt');
          if (excerptElem) {
            content = excerptElem.textContent.trim();
          } else {
            // Try to get text content excluding the title
            const containerText = container.textContent.replace(title, '').trim();
            content = containerText.substring(0, 200);
          }

          // Look for time
          const timeElem = container.querySelector('time, .relative-date, [class*="time"], .age');
          const date = timeElem?.getAttribute('datetime') ||
                      timeElem?.getAttribute('title') ||
                      timeElem?.textContent?.trim() || '';

          // Look for stats
          const likesText = container.textContent.match(/(\d+)\s*(לייק|like|♥)/i);
          const repliesText = container.textContent.match(/(\d+)\s*(תגוב|reply|comment)/i);

          const likes = likesText ? parseInt(likesText[1]) : 0;
          const replies = repliesText ? parseInt(repliesText[1]) : 0;

          data.posts.push({
            title,
            url,
            content: content.substring(0, 250),
            date,
            likes,
            replies,
            containerTag: container.tagName,
            containerClass: container.className
          });
        }
      }

      // If no posts found with links, try finding by structure
      if (data.posts.length === 0) {
        const activityItems = document.querySelectorAll('.user-stream-item, .activity-item, .topic-list-item');

        if (activityItems.length > 0) {
          const item = activityItems[0];

          data.posts.push({
            title: item.querySelector('a')?.textContent?.trim() || 'Activity',
            url: item.querySelector('a')?.href || 'https://mitmachim.top/user/tripleu',
            content: item.textContent.substring(0, 200),
            date: new Date().toISOString(),
            likes: 0,
            replies: 0,
            debug: 'Found via activity items'
          });
        }
      }

      return data;
    });

    console.log('🎯 SCRAPED DATA:\n');

    if (scrapedData.posts.length > 0) {
      const post = scrapedData.posts[0];
      console.log('✅ Found post!');
      console.log('  Title:', post.title);
      console.log('  URL:', post.url);
      console.log('  Content:', post.content ? post.content.substring(0, 100) + '...' : 'No content');
      console.log('  Date:', post.date || 'No date');
      console.log('  Likes:', post.likes);
      console.log('  Replies:', post.replies);

      if (post.containerTag) {
        console.log('\n  Container:', post.containerTag + '.' + post.containerClass);
      }
      if (post.debug) {
        console.log('  Debug:', post.debug);
      }
    } else {
      console.log('❌ No posts found!');
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'mitmachim-test.png' });
    console.log('\n📸 Screenshot saved as mitmachim-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('✨ Test complete!');
    console.log('\n👀 Browser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

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
testMitmachimDetailed();