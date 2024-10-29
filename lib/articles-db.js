/*
  articles db 
  PA bcn

*/
import path from 'path';
import sqlite3 from 'sqlite3';
import * as sqlite from 'sqlite';
const __dirname = import.meta.dirname;

/*-------------------------------------------------------------------------*/
export default class ArticlesDB {
  #dbName = '';
  #db = null;

  constructor(dbName) {  // should never be accessed 
    this.#dbName = path.resolve(dbName);
    this.#db = null;
  }
  static async create(dbName = path.join(__dirname, '/../.data/articles.db')) {
    const instance = new this(dbName);
    await instance.#setupDatabase();
    return instance;
  }
  /*-------------------------------------------------------------------------*/
  get dbName() { return this.#dbName }

  /*-------------------------------------------------------------------------*/
  async #setupDatabase() {
    if (this.#db) return;
    this.#db = await sqlite.open({
      filename: this.#dbName,
      driver: sqlite3.Database
    });
    await this.#db.exec(`CREATE TABLE IF NOT EXISTS cache (
      url TEXT PRIMARY KEY,
      content TEXT,
      scraped DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await this.#db.exec(`CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      title TEXT not null,
      subtitle TEXT,
      author TEXT,
      published DATE,
      content TEXT,
      scraped DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await this.#db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url ON articles(url)`);
  }
  async setCachedPage(url, content) {
    await this.#db.run(`INSERT OR REPLACE INTO cache (url, content) VALUES (?, ?)`, [url, content]);
  }
  async getCachedPage(url) {
    return await this.#db.get(`SELECT * FROM cache WHERE url = ?`, [url]);
  }
  #appendLimitOffset(query, limit, offset) {
    if (limit && Number.isInteger(Number(limit))) {
      query += ` LIMIT ${limit}`;
      if (offset && Number.isInteger(Number(offset))) // SQL can't OFFSET without LIMIT 
        query += ` OFFSET ${offset}`;
    }
    return query;
  }
  async insertArticle(article) {
    let { url, source, title, subtitle, author, published, content } = article;
    await this.#db.run(`INSERT OR REPLACE INTO articles (url,source,title,subtitle,author,published,content) VALUES (?,?,?,?,?,?,?)`, [url, source, title, subtitle, author, published, content]);
  }
  async getArticleByID(id) {
    let row = await this.#db.get(`SELECT * FROM articles WHERE id = ?`, [id]);
    return row;
  }
  async getArticleByURL(url) {
    let row = await this.#db.get(`SELECT * FROM articles WHERE url = ?`, [url]);
    return row;
  }
  async getAllArticles(limit, offset) {
    let q = this.#appendLimitOffset(`SELECT * FROM articles ORDER BY published DESC`, limit, offset);
    let rows = await this.#db.all(q);
    return rows;
  }
  async getSources() {
    let rows = await this.#db.all(`SELECT DISTINCT source FROM articles`);
    return rows
  }
  async getArticlesForSource(source, limit, offset) {
    let q = this.#appendLimitOffset(`SELECT * FROM articles WHERE source LIKE ? ORDER BY published DESC`, limit, offset);
    let rows = await this.#db.all(q, [source]);
    return rows;
  }
  async getArticlesForDate(datestart, dateend) {  // dates in ISO format
    let rows;
    if (dateend)
      rows = await this.#db.all(`SELECT * FROM articles WHERE published BETWEEN ? AND ? ORDER BY published`, [datestart, dateend]);
    else
      rows = await this.#db.all(`SELECT * FROM articles WHERE published >= ? ORDER BY published`, [datestart]);
    return rows;
  }

}
