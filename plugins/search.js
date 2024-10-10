const { bot, getJson, Google, getFloor, onwhatsapp } = require('../utils');
const moment = require('moment');
const axios = require('axios');

bot(
 {
  pattern: 'fx1',
  fromMe: false,
  desc: 'Fetches the latest forex news',
  type: 'search',
 },
 async (message) => {
  const apiUrl = 'https://api.polygon.io/v2/reference/news?apiKey=Y4iTYoJANwppB8I3Bm4QVWdV5oXlvc45';
  const data = await getJson(apiUrl);
  if (!data.results || data.results.length === 0) return message.reply('*No forex news available at the moment.*');
  const output = data.results.map((article, index) => `*Title:* ${article.title}\n` + `*Publisher:* ${article.publisher.name}\n` + `*Published UTC:* ${article.published_utc}\n` + `*Article URL:* ${article.article_url}\n` + (index < data.results.length - 1 ? '---\n\n' : '')).join('');
  return message.reply(output);
 }
);

bot(
 {
  pattern: 'fxstatus',
  fromMe: false,
  desc: 'Fetches the current status of the forex market',
  type: 'search',
 },
 async (message) => {
  const apiUrl = 'https://api.polygon.io/v1/marketstatus/now?apiKey=Y4iTYoJANwppB8I3Bm4QVWdV5oXlvc45';
  const data = await getJson(apiUrl);

  if (!data) return message.reply('*Failed to fetch forex market status.*');

  const output = `*Forex Market Status:*\n` + `After Hours: ${data.afterHours ? 'Closed' : 'Open'}\n` + `Market: ${data.market ? 'Open' : 'Closed'}\n\n` + `*Currencies:*\n` + `Crypto: ${data.currencies.crypto}\n` + `FX: ${data.currencies.fx}\n\n` + `*Exchanges:*\n` + `NASDAQ: ${data.exchanges.nasdaq}\n` + `NYSE: ${data.exchanges.nyse}\n` + `OTC: ${data.exchanges.otc}\n\n` + `*Indices Groups:*\n` + `S&P: ${data.indicesGroups.s_and_p}\n` + `Societe Generale: ${data.indicesGroups.societe_generale}\n` + `MSCI: ${data.indicesGroups.msci}\n` + `FTSE Russell: ${data.indicesGroups.ftse_russell}\n` + `MStar: ${data.indicesGroups.mstar}\n` + `MStarC: ${data.indicesGroups.mstarc}\n` + `CCCY: ${data.indicesGroups.cccy}\n` + `CGI: ${data.indicesGroups.cgi}\n` + `NASDAQ: ${data.indicesGroups.nasdaq}\n` + `Dow Jones: ${data.indicesGroups.dow_jones}\n\n` + `*Server Time:* ${data.serverTime}`;

  return message.reply(output);
 }
);

bot(
 {
  pattern: 'fxange',
  fromMe: false,
  desc: 'Fetches the latest foreign exchange rates against the US Dollar',
  type: 'search',
 },
 async (message, match) => {
  const currencyCode = match || 'USD';
  const apiUrl = `https://api.exchangerate-api.com/v4/latest/${currencyCode}`;
  const data = await getJson(apiUrl);

  if (!data || !data.rates) return message.reply(`*Failed to fetch exchange rates for ${currencyCode}.*`);
  const output = Object.entries(data.rates)
   .map(([currency, rate]) => `${currency}: ${rate.toFixed(4)}`)
   .join('\n');

  return message.reply(`*Foreign Exchange Rates (${data.base})*\n\n${output}`);
 }
);

bot(
 {
  pattern: 'weather ?(.*)',
  fromMe: false,
  desc: 'weather info',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('*Example : weather delhi*');
  const data = await getJson(`http://api.openweathermap.org/data/2.5/weather?q=${match}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273&language=en`).catch(() => {});
  if (!data) return await message.reply(`_${match} not found_`);
  const { name, timezone, sys, main, weather, visibility, wind } = data;
  const degree = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][getFloor(wind.deg / 22.5 + 0.5) % 16];
  return await message.reply(`*Name :* ${name}\n*Country :* ${sys.country}\n*Weather :* ${weather[0].description}\n*Temp :* ${getFloor(main.temp)}°\n*Feels Like :* ${getFloor(main.feels_like)}°\n*Humidity :* ${main.humidity}%\n*Visibility  :* ${visibility}m\n*Wind* : ${wind.speed}m/s ${degree}\n*Sunrise :* ${moment.utc(sys.sunrise, 'X').add(timezone, 'seconds').format('hh:mm a')}\n*Sunset :* ${moment.utc(sys.sunset, 'X').add(timezone, 'seconds').format('hh:mm a')}`);
 }
);

bot(
 {
  pattern: 'google ?(.*)',
  fromMe: false,
  desc: 'Search Google',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('_Provide Me A Query' + message.pushName + '_\n\n' + message.prefix + 'google fxop-md');
  const msg = await message.reply('_Searching for ' + match + '_');
  const res = await Google(match);
  return await msg.edit(res);
 }
);

bot(
 {
  pattern: 'onwa ?(.*)',
  fromMe: false,
  desc: 'Checks if a number exists on WhatsApp',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('*Please provide a phone number.*');

  const phoneNumber = match.trim();
  const result = await onwhatsapp(phoneNumber);
  return await message.reply(result);
 }
);

bot(
 {
  pattern: 'wiki ?(.*)',
  fromMe: false,
  desc: 'Search Wikipedia for a query',
  type: 'search',
 },
 async (message, match, m, client) => {
  if (!match) return await message.reply('*_Provide Search Query_*');
  const query = encodeURIComponent(match);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`;
  const response = await getJson(url);
  if (response.type === 'standard') {
   await message.reply(`*Wikipedia result:*\n\nTitle: ${response.title}\n\n${response.extract}\n\nRead more: ${response.content_urls.desktop.page}`);
  } else {
   await message.reply('No Wikipedia article found for your query.');
  }
 }
);

bot(
 {
  pattern: 'movie ?(.*)',
  fromMe: false,
  desc: 'Get movie information',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('Please provide a movie title.');
  const query = encodeURIComponent(match);
  const url = `http://www.omdbapi.com/?t=${query}&apikey=4fc4cf8c`;
  const response = await axios.get(url);
  const movie = response.data;
  if (movie.Response === 'True') {
   await message.reply(`*Title:* ${movie.Title}\n*Year:* ${movie.Year}\n*Genre:* ${movie.Genre}\n*Plot:* ${movie.Plot}\n*IMDB Rating:* ${movie.imdbRating}\n\n*More Info:* ${movie.Poster}`);
  } else {
   await message.reply('Movie not found.');
  }
 }
);

bot(
 {
  pattern: 'define ?(.*)',
  fromMe: false,
  desc: 'Get the definition of a word',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('Please provide a word to define.');

  const query = encodeURIComponent(match);
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${query}`;
  const response = await axios.get(url);
  const definition = response.data[0];
  if (definition) {
   await message.reply(`*Word:* ${definition.word}\n*Meaning:* ${definition.meanings[0].definitions[0].definition}\n*Example:* ${definition.meanings[0].definitions[0].example || 'N/A'}`);
  } else {
   await message.reply('Definition not found.');
  }
 }
);

bot(
 {
  pattern: 'news ?(.*)',
  fromMe: false,
  desc: 'Get the latest news on a topic',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('Please provide a topic for news.');

  const query = encodeURIComponent(match);
  const url = `https://newsapi.org/v2/everything?q=${query}&apiKey=6798c308cb454b4cbba9af98ee488507&pageSize=1`;
  const response = await axios.get(url);
  const news = response.data.articles[0];
  if (news) {
   await message.reply(`*Headline:* ${news.title}\n*Source:* ${news.source.name}\n*Published at:* ${news.publishedAt}\n\n${news.description}\n\nRead more: ${news.url}`);
  } else {
   await message.reply('No news found for your query.');
  }
 }
);

bot(
 {
  pattern: 'crypto ?(.*)',
  fromMe: false,
  desc: 'Get current price of a cryptocurrency',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('Please provide a cryptocurrency symbol (e.g., bitcoin, ethereum).');
  const query = encodeURIComponent(match.toLowerCase());
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${query}&vs_currencies=usd`;
  const response = await axios.get(url);
  const priceData = response.data;
  if (priceData[query]) {
   await message.reply(`*${match.toUpperCase()} Price:* $${priceData[query].usd}`);
  } else {
   await message.reply('Cryptocurrency not found.');
  }
 }
);

bot(
 {
  pattern: 'anime ?(.*)',
  fromMe: false,
  desc: 'Search for anime information',
  type: 'search',
 },
 async (message, match) => {
  if (!match) return await message.reply('Please provide an anime title.');

  const query = encodeURIComponent(match);
  const url = `https://api.jikan.moe/v4/anime?q=${query}&limit=1`;
  const response = await axios.get(url);
  const anime = response.data.data[0];
  if (anime) {
   await message.reply(`*Title:* ${anime.title}\n*Episodes:* ${anime.episodes}\n*Status:* ${anime.status}\n*Score:* ${anime.score}\n*Synopsis:* ${anime.synopsis}\n\n*More Info:* ${anime.url}`);
  } else {
   await message.reply('Anime not found.');
  }
 }
);

bot(
 {
  pattern: 'github ?(.*)',
  fromMe: false,
  desc: 'Search for a GitHub user',
  type: 'search',
 },
 async (message, match, m, client) => {
  if (!match) return await message.reply('Please provide a GitHub username.');
  const query = encodeURIComponent(match);
  const url = `https://api.github.com/users/${query}`;
  const response = await axios.get(url);
  const user = response.data;
  if (user) {
   await message.reply(`*Name:* ${user.name || 'N/A'}\n*Username:* ${user.login}\n*Bio:* ${user.bio || 'N/A'}\n*Public Repos:* ${user.public_repos}\n*Followers:* ${user.followers}\n\n*Profile URL:* ${user.html_url}`);
  } else {
   await message.reply('GitHub user not found.');
  }
 }
);
