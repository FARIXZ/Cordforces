const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');

let stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow');
stealth.enabledEvasions.delete('media.codecs');
stealth.enabledEvasions.delete('user-agent-override');
puppeteer.use(stealth);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let code = async (contestId, groupId, list) => {
  const USERNAME = process.env.USERNAME;
  const PASSWORD = process.env.PASSWORD;
  const COOKIES_PATH = '../cookies.json';

  const browser = await puppeteer.launch({
    headless: false, // Set to false for debugging -------------------------
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0');

  // Helper function to check if the user is logged in
  const isLoggedIn = async () => {
    await page.goto('https://codeforces.com/', { waitUntil: 'networkidle2' });

    // check header for username and logout to see if it is logged in
    const result = await page.evaluate((USERNAME) => {
      const userLink = document.querySelector(`#header a[href="/profile/${USERNAME}"]`);
      const logoutLink = document.querySelector('#header a[href*="logout"]');

      if (logoutLink !== null && userLink && userLink.textContent.toLowerCase() == USERNAME) return true;
      else return false;
    }, USERNAME);

    return result;
  };

  // Try to load cookies if they exist
  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
    await page.setCookie(...cookies);
    console.log('Cookies loaded!');
  }

  // Check if logged in
  if (await isLoggedIn()) {
    console.log('Already logged in with cookies!');

    const problems = await loadStanding(browser, contestId, groupId, list);
    await browser.close();
    return problems;

    // return standings in array or 'No access' or 'Wrong ID'
  } else {
    console.log('Not logged in, attempting to log in...');
    await delay(1000);

    // If not logged in, try logging in with username and password
    await page.goto('https://codeforces.com/enter');
    await page.waitForSelector('#handleOrEmail');
    await delay(2000);
    await page.type('#handleOrEmail', USERNAME);
    await page.type('#password', PASSWORD);
    await page.click('#remember');

    // Submit the form
    await Promise.all([page.click('.submit'), page.waitForNavigation({ waitUntil: 'networkidle0' })]);

    // After logging in, check again if login was successful
    if (await isLoggedIn()) {
      console.log('Logged in successfully!');
      // Save cookies
      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log('New cookies saved!');
      // Work ✅
      let data = await loadStanding(browser, contestId, groupId, list);
      await browser.close();
      return data;
    } else {
      throw new Error('Form submission failed, mention farixz to check the error.');
    }
  }
};

//

const reformStanding = (standing) => {
  let standingInRows = [];
  let i = 0;

  for (let row of standing) {
    if (++i === 1) continue; // Skip the header row
    const $ = cheerio.load(row);

    try {
      // Extract the handle (username)
      let handle = $(row).find('a[class^="rated-user"]').first().text();

      // Extract problem statuses
      let problems = $(row).find('span[class!="cell-time"]');
      let problemsStatus = [];

      for (let problem of problems) {
        if ($(problem).attr('class') === 'cell-accepted' || $(problem).attr('class') === 'cell-passed-system-test') {
          const x = $(problem).text().trim().replace(/\n/g, '');
          problemsStatus.push(x); // Pushes the status of the problem (+ / +1 / etc.)
          //
        } else if ($(problem).attr('class') === 'cell-unsubmitted' || $(problem).attr('class') === 'cell-rejected') {
          // alternative fix : ($(problem).text().trim() === '') means the cell is empty (works)
          try {
            const y = $(problem).text().trim().replace(/\n/g, '');
            if (y === '') y = '0';

            problemsStatus.push(y);
          } catch (err) {
            problemsStatus.push('0');
          }
        }
      }

      standingInRows.push({
        handle: handle,
        problems: problemsStatus,
      });
    } catch (err) {
      console.error('Error processing row:', err);
      continue;
    }
  }

  return standingInRows;
};

//

const loadStanding = async (browser, contestId, groupID, list, page = 1) => {
  try {
    const pageObj = await browser.newPage();

    // Set the user-agent to bypass cloudflare challenges
    await pageObj.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    );

    let url;

    // Construct the URL based on the provided parameters
    if (groupID && contestId) {
      url = `https://codeforces.com/group/${groupID}/contest/${contestId}/standings/page/${page}`;
      if (list) url += `?list=${list}`;
    } else if (!groupID && contestId) {
      url = `https://codeforces.com/contest/${contestId}/standings`;
      if (list) url += `?list=${list}`;
    } else {
      throw new Error('Either contestId or groupID must be provided.');
    }

    await pageObj.goto(url, { waitUntil: 'networkidle2' }); // Wait for all network requests to be done
    await pageObj.waitForNetworkIdle({ idleTime: 1000 }); // Wait for 1 second to ensure that challenge has passed

    const notificationMessage = await pageObj.evaluate(() => {
      const notificationElement = document.querySelector('.jGrowl-notification .message');
      return notificationElement ? notificationElement.textContent : null;
    });

    if (notificationMessage) {
      await browser.close();
      if (notificationMessage.includes('You are not allowed to view the contest')) {
        return 'No access';
      } else if (notificationMessage.includes('Illegal contest ID')) {
        return 'Wrong ID';
      } else {
        return `Codeforces Error: ${notificationMessage}`;
      }
    }

    const content = await pageObj.content();
    const $ = cheerio.load(content);
    const standing = $('table > tbody > tr');
    const results = reformStanding(standing);

    return results;
  } catch (err) {
    console.error('Error loading standings:', err);
    return false;
  }
};

module.exports = { code };
