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
    await this.#db.exec(`CREATE TABLE IF NOT EXISTS sources (
      source TEXT PRIMARY KEY,
      name TEXT
    )`);
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
  async insertSource(source, name) {
    await this.#db.run(`INSERT OR IGNORE INTO sources (source,name) VALUES (?,?)`, [source, name]);
  }
  async insertArticle(article) {
    let { url, source, title, subtitle, author, published, content } = article;
    await this.#db.run(`INSERT OR REPLACE INTO articles (url,source,title,subtitle,author,published,content) VALUES (?,?,?,?,?,?,?)`, [url, source, title, subtitle, author, published, content]);
  }
  async getArticleByID(id) {
    let row = await this.#db.get(`SELECT SELECT articles.*, sources.name 
      FROM articles INNER JOIN sources ON articles.source = sources.source 
      WHERE id = ?`, [id]);
    return row;
  }
  async getArticleByURL(url) {
    let row = await this.#db.get(`SELECT articles.*, sources.name 
      FROM articles INNER JOIN sources ON articles.source = sources.source 
       WHERE url = ?`, [url]);
    return row;
  }
  async getAllArticles(limit, offset) {
    let q = this.#appendLimitOffset(`SELECT articles.*, sources.name 
      FROM articles INNER JOIN sources ON articles.source = sources.source 
      ORDER BY published DESC`, limit, offset);
    let rows = await this.#db.all(q);
    return rows;
  }
  async getSources() {
    let rows = await this.#db.all(`SELECT * FROM sources`);
    return rows
  }
  async getSourceName(source) {
    let row = await this.#db.get(`SELECT name FROM sources WHERE source=?`, [source]);
    return row.name;
  }
  async getArticlesForSource(source, limit, offset) {
    let q = this.#appendLimitOffset(`SELECT articles.*, sources.name 
      FROM articles INNER JOIN sources ON articles.source = sources.source 
      WHERE articles.source LIKE ? ORDER BY published DESC`, limit, offset);
    let rows = await this.#db.all(q, [source]);
    return rows;
  }
  async getArticlesForDate(datestart, dateend = datestart) {  // dates in ISO format
    let rows = await this.#db.all(`SELECT articles.*, sources.name 
      FROM articles INNER JOIN sources ON articles.source = sources.source 
      WHERE published BETWEEN ? AND ? ORDER BY published`, [datestart, dateend]);
  /* rows = await this.#db.all(`SELECT * FROM articles WHERE published >= ? ORDER BY published`, [datestart]);*/
    return rows;
  }

}
