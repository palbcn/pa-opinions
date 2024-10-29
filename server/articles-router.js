// routes for articles
import express from 'express';
import ArticlesDB from '../lib/articles-db.js';
import { ArticlesScrapersBuilder } from "../lib/articles-scraper.js";

let db = await ArticlesDB.create();

// refresh the database contents with the latest articles
await (async function refreshDb() {
  let scrapers = ArticlesScrapersBuilder.buildAll(db);
  await Promise.all(scrapers.map(async scraper => scraper.scrapeRootPage()));
})();

function articleToHtml(article) {
  let { id, url, source, title, subtitle, author, published, content, scraped } = article;

  let pubd = new Date(published);

  let showDate = "DLMXJVS".charAt(pubd.getDay()) + " " + pubd.toLocaleDateString('en-GB');
  let pcontent = "<p>" + content.split("\n\n").join("</p>\n<p>") + "</p>";
  let h = `  <article id=${id}>
    <header>
      <h2><i class="src src-${source}"></i> ${title}</h2>
      <h3>${subtitle}</h3>
      <p>${showDate} ${author}</p>
      <p><span>${id}</span> <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>
    </header>
    <main>
      ${pcontent}
    </main>
  </article>`;
  return h;
}
function articlesToHtml(articles) {
  return articles.map(articleToHtml).join('\n\n');
}
function linksToHtml(prev, next) {
  return `
  <span id="nav-links" hx-swap-oob="true">
    <a href="#" hx-get="/articles?${prev}" hx-target="#articles" rel="prev">⟪</a>
    <a href="#" hx-get="/articles?${next}" hx-target="#articles" rel="next">⟫</a>
  </span>`;
}
const router = express.Router();
const DEFAULT_PAGE_SIZE = 20;
router.get('/', async (req, res) => {
  // what does the client want?
  let { source, limit, offset, page, size, start, end } = req.query;

  function adjustQuery() { // TODO 
    let self = '';
    let next = '';
    let prev = '';
    return { self, prev, next }
  }

  // produce what the client wants and prepare the navigation links.
  let next, prev, rows;
  if (page != null) {  // pagination is just a form of 'limit, offset'
    limit = size ?? DEFAULT_PAGE_SIZE;
    offset = (page - 1) * limit;
    next = `page=${Number(page) + 1}`;
    if (page > 1) prev = `page=${Number(page) - 1}`;
    if (size != null) {
      next += `&size=${size}`;
      if (prev != null) prev += `&size=${limit}`;
    }
  } else {
    next = `offset=${offset + limit}&limit=${limit}`; // TODO
    prev = `offset=${offset - limit}&limit=${limit}`;  // TODO
  }
  if (start) {  // date boundaries are totally different
    rows = await db.getArticlesForDate(start, end);
    next = `start=${end}&end=${end + (end + start)}`; // TODO
    prev = `start=${start - (end - start)}`; // TODO
  }
  else if (source) {
    rows = await db.getArticlesForSource(source, limit, offset);
    next += `&source=${source}`;
    prev += `&source=${source}`;

  } else {
    rows = await db.getAllArticles(limit, offset);
  }

  if (rows == null) {
    return res.status(500).send({ error: "Data access error" });
  }

  // how does the client want it?
  let accept = req.get('Accept').toLowerCase();
  if (accept.includes('text/html') || accept.includes('*/*')) {
    let content = articlesToHtml(rows);
    let links = linksToHtml(prev, next);
    return res.send(links + content);

  } else if (accept.includes('application/json'))
    return res.json(rows);
  else
    return res.status(406).send({ message: "can only produce 'text/html' or 'application/json' content types. '" + accept + "' is not admitted." });
});

router.get('/:id', async (req, res) => {
  let id = req.params.id;
  let row = await db.getArticleByID(id);
  if (row === undefined) res.status(404).json({ error: `Article ${id} not found` });
  return res.send(row);
});

export default router;