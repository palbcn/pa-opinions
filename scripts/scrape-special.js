import path from "path";
import os from "os";
import fs from "fs/promises";
import ArticlesDB from "../lib/articles-db.js";
import { randomNcharString } from "../lib/random-string.js";
import { AraScraper, LaVanguardiaScraper, ElNacionalScraper, ElPaisScraper } from "../lib/articles-scraper.js";


async function scrapeSpecialPage(scraper, page) {
  let links = await scraper.scrapePageForLinks(page);
  let articles = await scraper.scrapeLinks(links);
  let tempjsonfn = path.join(os.tmpdir(), scraper.source + '-articles-' + randomNcharString() + '.json');
  await fs.writeFile(tempjsonfn, JSON.stringify(articles), 'utf8');
  console.log(tempjsonfn, 'created');
  return articles;
}

async function elNacionalOpinioAnterior(db) {
  let nac = new ElNacionalScraper(db);
  for (let i = 20; i >= 2; i--) {
    let page = `https://www.elnacional.cat/ca/opinio.html?_page=${i}`;
    console.log('scraping', page);
    let articles = await scrapeSpecialPage(nac, page);
  }
}

async function elPaisEditoriales(db) {
  let epa = new ElPaisScraper(db);
  for (let i = 1; i < 10; i++) {
    let page = `https://elpais.com/opinion/editoriales/${i}`;
    console.log('scraping', page);
    let articles = await scrapeSpecialPage(epa, page);
  }
}
async function elPaisTribunasYColumnas(db) {
  let epa = new ElPaisScraper(db);
  for (let i = 0; i < 5; i++) {
    let p = (i == 0) ? '' : '' + i;
    let page = `https://elpais.com/opinion/tribunas/${p}`;
    console.log('scraping', page);
    let articles = await scrapeSpecialPage(epa, page);
  }
  for (let i = 0; i < 5; i++) {
    let p = (i == 0) ? '' : '' + i;
    let page = `https://elpais.com/opinion/columnas/${p}`;
    console.log('scraping', page);
    let articles = await scrapeSpecialPage(epa, page);
  }
}


(async function main() {
  let db = await ArticlesDB.create();
  await elPaisTribunasYColumnas(db);
  console.log(`All scraping done. ${db.dbName} updated`);
})()