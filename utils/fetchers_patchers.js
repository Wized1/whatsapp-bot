const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cloudscraper = require('cloudscraper');
const cookieJar = new tough.CookieJar();
const client = wrapper(
  axios.create({
    jar: cookieJar,
  })
);

const userAgents = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'];

async function getJson(url, options = {}) {
  const { retries = 3, delay = 1000, timeout = 30000, headers = {}, ...axiosOptions } = options;

  const config = {
    timeout,
    headers: {
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: new URL(url).origin,
      ...headers,
    },
    ...axiosOptions,
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.get(url, config);

      if (response.status === 200) {
        return response.data;
      } else if (response.status === 403 || response.status === 503) {
        console.warn('Cloudflare detected, attempting to bypass...');
        return await bypassCloudflare(url, config);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (attempt === retries - 1) throw error;
      console.warn(`Request failed, retrying... (${retries - attempt - 1} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
}

async function bypassCloudflare(url, config) {
  try {
    const response = await cloudscraper.get(url, {
      ...config,
      resolveWithFullResponse: true,
    });

    if (response.statusCode === 200) {
      const cookies = response.request.headers.cookie;
      if (cookies) {
        cookieJar.setCookieSync(cookies, url);
      }
      return JSON.parse(response.body);
    } else {
      throw new Error(`Cloudflare bypass failed! Status: ${response.statusCode}`);
    }
  } catch (error) {
    console.error('Error bypassing Cloudflare:', error.message);
    throw error;
  }
}

module.exports = {
  getJson,
  fetchJson: getJson,
};
