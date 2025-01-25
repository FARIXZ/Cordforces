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

let code = async (contestId, groupId) => {
  const USERNAME = process.env.USERNAME;
  const PASSWORD = process.env.PASSWORD;
  const COOKIES_PATH = '../cookies.json';

  const browser = await puppeteer.launch({
    headless: true, // Set to false for debugging -------------------------
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

    const problems = await loadProblems(browser, contestId, groupId);
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
      let data = await loadProblems(browser, contestId, groupId);
      await browser.close();
      return data;
    } else {
      throw new Error('Form submission failed, mention farixz to check the error.');
    }
  }
};

//

const loadProblems = async (browser, contestId, groupID) => {
  try {
    const page = await browser.newPage();

    // User-agent to bypass cloudflare challenges
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    );

    let url;

    // Construct the URL based on the provided parameters
    if (groupID && contestId) {
      url = `https://codeforces.com/group/${groupID}/contest/${contestId}/standings/page/1`;
    } else if (!groupID && contestId) {
      url = `https://codeforces.com/contest/${contestId}/standings`;
    } else {
      throw new Error('Either contestId or groupID must be provided.');
    }

    await page.goto(url, { waitUntil: 'networkidle2' }); // Wait for all network requests to be done
    await page.waitForNetworkIdle({ idleTime: 1000 }); // Wait for 2 seconds to ensure that challenge has passed

    const notificationMessage = await page.evaluate(() => {
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

    const $ = cheerio.load(await page.content());
    let problems = [];

    $('th a').each((index, element) => {
      const problemName = $(element).attr('title'); // Extract the problem name from the title attribute
      const problemLink = `https://codeforces.com${$(element).attr('href')}`; // Extract the link and append the domain

      problems.push({
        name: problemName,
        link: problemLink,
      });
    });

    return problems;
  } catch (err) {
    console.error('Error loading problems:', err);
    return false;
  }
};

module.exports = { code };
