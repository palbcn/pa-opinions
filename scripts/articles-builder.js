/*
  articles page builder 

  PA bcn

*/
import os from 'os';
import path from 'path';
import fs from "fs/promises";
import { randomNcharString } from '../lib/random-string.js';
import ArticlesDB from '../lib/articles-db.js';
const __dirname = import.meta.dirname;

class ArticlesBuilder {
  #db;
  constructor(db) {
    this.#db = db;
  }
  #fullPage(main) {
    return `<!DOCTYPE html><html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="PA-scrape-articles">
        <title>Scraping opinió</title>  
        <script src="../client/client.js" defer></script>
        <link rel="stylesheet" href="../client/style.css">
      </head>
      <body>
        <header>
          <h3><em>Una altra frikada de PA per JI</em></h3>
          <h1>Scraping d'opinió.</h1>
        </header>
        <main>
          ${main}
        </main>
        <footer>
          <p>&copy; La Pera Limonera 2022. All Rights Reserved.</p>      
        </footer>
      </body>
    </html>`;
  }
  #buildArticle(article) {
    let { id, url, title, subtitle, author, published, content, scraped } = article;
    let pcontent = "<p>" + content.split("\n\n").join("</p>\n<p>") + "</p>";
    let h = `<article id=${id} data-collapsable="toggle">
        <header>
          <h2>${title}</h2>
          <h3>${subtitle}</h3>
          <p>${author} -- ${published} -- <a href="${url}">original</a></p>
        </header>
        <main data-collapsable="content">
          ${pcontent}
        </main>
      </article>`;
    return h;
  }
  async getAllArticles() {
    let all = await this.#db.getAllArticles();
    return all;
  }

  async buildPage() {
    let sources = await this.#db.getSources();
    let htmls = [];
    for (let { source } of sources) {
      let articles = await this.#db.getArticlesForSource(source);
      let articleshtml = articles.map(a => this.#buildArticle(a)).join('\n\n');
      let sourcehtml = `
      <section data-accordion="control">
        <header>
          <h1>${source}</h1>
          <p>${articles.length} articles</p>
        </header>
        <div data-accordion="content">
          ${articleshtml}
        </div>
      </section>`;
      htmls.push(sourcehtml);
    }
    let main = htmls.join('\n\n');
    let fullpage = this.#fullPage(main);
    let temphtmlfn = path.join(os.tmpdir(), 'articles-' + randomNcharString() + '.html');
    await fs.writeFile(temphtmlfn, fullpage, 'utf8');
    console.log(temphtmlfn, 'created');
    return fullpage;
  }
}

(async function main() {
  let db = await ArticlesDB.create();
  let builder = new ArticlesBuilder(db);

  let articles = await builder.getAllArticles();
  let outjsonfn = path.join(__dirname, '..', 'www', 'articles.json');
  await fs.writeFile(outjsonfn, JSON.stringify(articles), 'utf8');
  console.log(outjsonfn, 'created');

  let page = await builder.buildPage();
  let outhtmlfn = path.join(__dirname, '..', 'www', 'articles.html');
  await fs.writeFile(outhtmlfn, page, 'utf8');
  console.log(outhtmlfn, 'created');
})()