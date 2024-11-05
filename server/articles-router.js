// routes for articles
import express from 'express';
import ArticlesDB from '../lib/articles-db.js';
import { ArticlesScrapersBuilder } from "../lib/articles-scraper.js";

/* ----  articles database  -------------------------------------------------*/
let db = await ArticlesDB.create();

/* ----  run all the Scrapers  ----------------------------------------------*/
// refresh the database contents with the latest articles
await (async function obtainLatestArticles() {
  let scrapers = ArticlesScrapersBuilder.buildAll(db);
  try {
    await Promise.all(scrapers.map(async scraper => scraper.scrapeRootPage()));    
  } catch (error) {
    // ignore fetch errors and proceed    
  }
})();

/* ---- html generation helpers ----------------------------------------------*/
function articleToHtml(article) {
  let { id, url, source, name, title, subtitle, author, published, content, scraped } = article;
  let pubd = new Date(published);
  let showDate = "DLMXJVS".charAt(pubd.getDay()) + " " + pubd.toLocaleDateString('en-GB');
  let pcontent = "<p>" + content.split("\n\n").join("</p>\n<p>") + "</p>";
  let h = `  <article id=${id}>
    <header>
      <h2><i class="src src-${source}"></i> ${title}</h2>
      <h3>${subtitle}</h3>
      <p>${name}. <strong>${showDate}</strong> ${author}</p>
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
  const lhtml = id => `<span id="${id}" hx-swap-oob="true">
    <a href="#" hx-get="/articles?${prev}" hx-target="#articles" rel="prev">⟪</a>
    <a href="#" hx-get="/articles?${next}" hx-target="#articles" rel="next">⟫</a>
  </span>`;
  return lhtml("nav-links") + "\n\n" + lhtml("nav-links-footer");
}

function headerInfoHtml(sourceName, page) {
  return `
    <span id="articles-source" hx-swap-oob="true">${sourceName ?? "Tot"}</span>
    <span id="articles-page" hx-swap-oob="true">${page || "principal"}</span>
  `;
}

/* ---- yyyymmddd functions --------------------------------------------------*/
const ymd = date => date.toISOString().slice(0, 10);
function addDays(ymd1, ndays) {
  return ymd(new Date(new Date(ymd1).getTime() + (ndays * 86400000)));
}
function daysBetween(ymd1, ymd2) {
  return Math.round(Math.abs(new Date(ymd2).getTime() - new Date(ymd1).getTime()) / 86400000);
}

/* ---- routing functions ----------------------------------------------------*/
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
  let current, next, prev, rows, sourceName;
  if (page != null) {  // pagination is just a form of 'limit, offset'
    limit = size ?? DEFAULT_PAGE_SIZE;
    offset = (page - 1) * limit;
    current = page;
    next = `page=${Number(page) + 1}`;
    if (page > 1) prev = `page=${Number(page) - 1}`;
    if (size != null) {
      next += `&size=${size}`;
      if (prev != null) prev += `&size=${limit}`;
    }
  } else {
    current = Math.round(offset / limit);
    next = `offset=${offset + limit}&limit=${limit}`; // TODO
    prev = `offset=${offset - limit}&limit=${limit}`;  // TODO
  }
  if (start) {  // date boundaries are totally different

    // if (!dateend)   // if no dateend, set it to start plus one day
    // dateend = (new Date(new Date(datestart).getTime() + 86400000)).toISOString().slice(0, 10);

    if (!end) end = start;
    rows = await db.getArticlesForDate(start, end);
    current = start;
    let startplusone = addDays(start, 1);
    let startminusone = addDays(start, -1);
    let difference = daysBetween(start, end);
    let startpludif = addDays(start, difference);
    let startminusdif = addDays(start, difference);
    next = `start=${startplusone}`;    // TODO `start=${end}&end=${end + (end - start)}`; 
    prev = `start=${startminusone}`;   // TODO `start=${start - (end - start)}&end=${start)}`; 
  }
  else if (source) {
    sourceName = await db.getSourceName(source);
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
    let headerinfo = headerInfoHtml(sourceName, current);
    let links = linksToHtml(prev, next);
    return res.send(links + headerinfo + content);

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