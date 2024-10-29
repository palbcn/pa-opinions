import path from "path";
import os from "os";
import fs from "fs/promises";
import ArticlesDB from "../lib/articles-db.js";
import { ArticlesScrapersBuilder } from "../lib/articles-scraper.js";

function randomNcharString(n = 6) {  // creates a random n-char string
  // we compute a random number base36 between (for n=6) 100000 and zzzzzz
  let cap = Math.pow(36, n - 1);  // for n=6 it's the equivalent of parseInt("100000", 36)
  let range = Math.pow(36, n - 1) * 35; // for n=6 it's the equivalent of parseInt("z00000", 36)
  return (Math.floor(Math.random() * range) + cap).toString(36);
}

async function runScraper(scraper) {
  let articles = await scraper.scrapeRootPage();
  let tempjsonfn = path.join(os.tmpdir(), scraper.source + '-articles-' + randomNcharString() + '.json');
  await fs.writeFile(tempjsonfn, JSON.stringify(articles), 'utf8');
  console.log(tempjsonfn, 'created');
}
/*
async function runAra(db) {
  let ara = new AraScraper(db);
  await runScraper(ara);
}
async function runVan(db) {
  let van = new LaVanguardiaScraper(db);
  await runScraper(van);
}
async function runNac(db) {
  let nac = new ElNacionalScraper(db);
  await runScraper(nac);
}
async function runEpa(db) {
  let epa = new ElPaisScraper(db);
  await runScraper(epa);
}
*/
(async function main() {
  let db = await ArticlesDB.create();
  /*
  await runAra(db);
  await runVan(db);
  await runNac(db);
  await runEpa(db);
  */
  let scrapers = ArticlesScrapersBuilder.buildAll(db);
  for (let scraper of scrapers) {
    await runScraper(scraper);
  }
  console.log(`All scrapers done. ${db.dbName} updated`);
})()