import ArticlesDB from '../lib/articles-db.js';
//import { ArticlesScrapersBuilder } from "../lib/articles-scraper.js";

// refresh the database contents with the latest articles
(async function refreshDb() {
  let db = await ArticlesDB.create();
  let scrapers = ArticlesScrapersBuilder.buildAll(db);
  await Promise.all(scrapers.map(async scraper => scraper.scrapeRootPage()));
})();

async function getHandler(event, context) {
  let db = await ArticlesDB.create();
  let articles = await db.getAllArticles();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ articles })
  }
}

export async function handler(event, context) {
  if (event.httpMethod == "GET") {
    return await getHandler(event, context);
  } else {
    return { statusCode: 501, message: `${event.httpMethod} unsupported` }
  }
}
