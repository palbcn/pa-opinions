/*
  articles scraper
  
    ARA ara.cat
    VAN lavanguardia.com
    NAC elnacional.cat
    elpais.es
    elconfidencial.com
    eldiario.es

  PA bcn

*/
import os from 'os';
import path from 'path';
import fs from "fs/promises";
import * as cheerio from "cheerio";

/* -- Date interpretation in different formats -----------------------------*/
const TEST_DATE_DMY = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
const TEST_DATE_YMD = /(\d{4})-(\d{1,2})-(\d{1,2})T/;
const TEST_DATE_LOC_DMMMY = /.*?\.\s+D.*?[es]\,\s+(\d{1,2})\s+(?:de |d')(.*?)\s+de\s+(\d{4})/;
const MESOS = 'gener febrer març abril maig juny juliol agost setembre octubre novembre desembre'.split(' ');
function interpretDate(kindaDate) {
  function interpretAsDate(kindaDate) {
    let date, _, d, m, y;
    let today = (new Date()).toISOString().slice(0, 10);
    if (TEST_DATE_DMY.test(kindaDate))
      [_, d, m, y] = TEST_DATE_DMY.exec(kindaDate);
    else if (TEST_DATE_YMD.test(kindaDate))
      [_, y, m, d] = TEST_DATE_YMD.exec(kindaDate);
    else if (TEST_DATE_LOC_DMMMY.test(kindaDate)) {
      let mes;
      [_, d, mes, y] = TEST_DATE_LOC_DMMMY.exec(kindaDate);
      m = MESOS.findIndex(e => e == mes) + 1;
    } else return new Date();
    return new Date(y, m - 1, d, 12, 0);  // cope with the "fa 2 hores" kind of date
  }
  let d = interpretAsDate(kindaDate);
  let iso = d.toISOString().slice(0, 10);  // transform to iso YYYY-MM-DD
  return iso;
}

/*-------------------------------------------------------------------------*/
export class ArticlesScraper {

  /* -- Polymorpihc Factory Method createScraper  -------------------------
    different sources require different classes
    so we register each scraper with a class under a source name
    this class is not registered as should never be instantiated
  */
  static _source = 'base';
  static _root = 'http://example.com';
  static _linksSelector = 'a';
  static _name = 'Base';
  static _scraperClassesBySource = {};
  static register(scraperClass) {
    let source = scraperClass._source;
    this._scraperClassesBySource[source] = scraperClass;
  }
  static createScraper(source, db) {
    return new (this._scraperClassesBySource[source])(db);
  }
  static sourceName(source) {
    return this._scraperClassesBySource[source]._name;
  }
  static allScrapers() {
    let all = Object.entries(this._scraperClassesBySource);
    return all.map(([source, subclass]) => ({ source, name: subclass._name, subclass }));
  }
  static allScraperSources() {
    return Object.keys(this._scraperClassesBySource);
  }

  /*-------------------------------------------------------------------------*/
  #db = null;
  constructor(db) {
    this.#db = db;
    db.insertSource(this.source, this.name);
  }
  /*-------------------------------------------------------------------------*/
  get source() { return this.constructor._source }
  get name() { return this.constructor._name }
  get root() { return this.constructor._root }
  get linksSelector() { return this.constructor._linksSelector }

  /*- private methods not intended to be changed by descendants -------------*/
  async #fetchPage(url) {
    const response = await fetch(url);
    if (!response.ok) return null;
    const content = await response.text();
    return content;
  }
  async #fetchPageWithCache(url) {
    const cached = await this.#db.getCachedPage(url);
    if (cached) return cached.content;
    let content = await this.#fetchPage(url);
    if (!content) return null;
    await this.#db.setCachedPage(url, content);
    return content;
  }

  /*--------------------------------------------------------------------------*/
  parseLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    let links = [];
    $(this.linksSelector).each((_, element) => {
      let href = $(element).attr('href');
      if (href) {
        let fullUrl = new URL(href, baseUrl).href;
        links.push(fullUrl);
      }
    });
    let uniqueLinks = [...new Set(links)];
    return uniqueLinks;
  }
  async filterLinks(links) {  // this method should be overriden specifically
    return links;   //return links.filter(v => v.endsWith('.html'));
  }
  async scrapePageForLinks(url) {  // scrape = fetch + parse
    const html = await this.#fetchPage(url);  // dont' use cache for links urls
    if (!html) return null;
    let links = this.parseLinks(html, url);
    links = this.filterLinks(links);
    return links;
  }

  /*-------------------------------------------------------------------------*/
  parseArticle(html, url) {  // this method should be overriden specifically
    return null;
  }
  async scrapeArticle(url) {  // scrape = fetch + parse
    const html = await this.#fetchPageWithCache(url);
    let article = this.parseArticle(html, url);
    if (article) await this.#db.insertArticle(article);
    return article;
  }
  /*-------------------------------------------------------------------------*/
  async scrapeRootPage() {
    let links = await this.scrapePageForLinks(this.root);
    let articles = [];
    for (const link of links) {
      let art = await this.scrapeArticle(link);
      if (art) articles.push(art);
    }
    return articles;
  }
}

/*****************************************************************************/
const VALID_ARA_OPINIO_LINK = /^http.*\/\/.*?\/(.+)\/(.+\.html)/i
export class AraScraper extends ArticlesScraper {
  static _source = 'ARA';
  static _root = 'https://www.ara.cat/opinio';
  static _name = 'Ara';
  static {
    super.register(this);
  }
  filterLinks(links) {
    return links.filter(l => VALID_ARA_OPINIO_LINK.test(l));
  }
  parseArticle(html, url) {
    const $ = cheerio.load(html);
    let source = this.source;
    let title = $('h1.title').text().trim();
    let author = $('.opening-actions--info .author a').text().trim();
    let subtitle = $('.featured .text').get().map(d => $(d).text().trim()).join('\n\n');
    let published = interpretDate($('.opening-actions--date').text().trim());
    let spanplace = $('.ara-body > p:nth-child(1) span.place');
    let place = spanplace.text();
    spanplace.text(place.toUpperCase() + ' ');
    let content = $('.ara-body p').get().map(p => $(p).text().trim()).join('\n\n');
    let article = { url, source, title, subtitle, author, published, content };
    return article;
  }
}

/*****************************************************************************/
const VALID_VAN_OPINIO_LINK = /^http.*\/\/.*opinion.*html$/i
export class LaVanguardiaScraper extends ArticlesScraper {
  static _source = 'VAN';
  static _root = 'https://www.lavanguardia.com/opinion';
  static _name = 'La Vanguardia';
  static {
    super.register(this);
  }
  filterLinks(links) {
    return links.filter(l => VALID_VAN_OPINIO_LINK.test(l));
  }
  parseArticle(html, url) {
    const $ = cheerio.load(html);
    let source = this.source;
    let title = $('.title').text().trim();
    let subtitle = $('.subtitle').get().map(d => $(d).text().trim()).join('\n\n');
    let author = $(".author-opinion-name a").text().trim();
    let published = interpretDate($(".created").text());
    let content = $('p.paragraph').get().map(p => $(p).text().trim()).join('\n\n');
    let article = { url, source, title, subtitle, author, published, content };
    return article;
  }
}

/*****************************************************************************/
const VALID_NAC_OPINIO_LINK = /^http.*\/(?:opinio|editorial)\/.*html$/i
export class ElNacionalScraper extends ArticlesScraper {
  static _source = 'NAC';
  static _root = 'https://www.elnacional.cat/ca/opinio.html';
  static _name = "El Nacional.cat";
  static {
    super.register(this);
  }
  filterLinks(links) {
    return links.filter(l => VALID_NAC_OPINIO_LINK.test(l));
  }
  parseArticle(html, url) {
    const $ = cheerio.load(html);
    let source = this.source;
    let title = $('.c-mainarticle__title').text().trim();
    let subtitle = $('.article-body > blockquote').get().map(b => $(b).text().trim()).join('\n\n');
    let author = $('strong.author').text();
    let published = interpretDate($('.date').text());
    let content = $('.article-body > p').get().map(b => $(b).text().trim()).join('\n\n');
    let article = { url, source, title, subtitle, author, published, content };
    return article;
  }
}

/*****************************************************************************/
const VALID_EPA_OPINIO_LINK = /^http.*\/(?:opinion)\/.*html()+$/i
export class ElPaisScraper extends ArticlesScraper {
  static _source = 'EPA';
  static _root = 'https://elpais.com/opinion';
  static _name = "El País";
  static {
    super.register(this);
  }
  filterLinks(links) {
    return links.map(l => {
      let u = new URL(l);
      u.hash = ''; u.search = '';
      return u.toString()
    })
      .filter(l => VALID_EPA_OPINIO_LINK.test(l));
  }
  parseArticle(html, url) {
    const $ = cheerio.load(html);
    let source = this.source;
    let title = $('article header h1.a_t').text().trim();
    let subtitle = $('article header h2.a_st').text().trim();
    let published = interpretDate($('article [data-date]').attr('data-date'));
    let author = $('article [data-dtm-region="articulo_firma"]').text().trim();
    let content = $('article [data-dtm-region="articulo_cuerpo"] p').get().map(b => $(b).text().trim()).join('\n\n');
    if (content.length == 0) return null;
    let article = { url, source, title, subtitle, author, published, content };
    return article;
  }
}

/*****************************************************************************/
export class ElConfidencialScraper extends ArticlesScraper {
  static _source = 'ECO';
  static _root = 'https://blogs.elconfidencial.com';
  static _name = "El Confidencial";
  static _linksSelector = '.home-blogs-body .blog-card a';
  static {
    super.register(this);
  }
  parseArticle(html, url) {
    const $ = cheerio.load(html);
    let source = this.source;
    let title = $('article  header h1').text().trim();
    let subtitle = $('article .innerArticle__opening > header > h2').text().trim();
    let published = interpretDate($('time').attr('datetime'));
    let author = $('.innerArticle__content .authorSignature__link').text().trim();
    let content = $('article #news-body-cc p').get().map(b => $(b).text().trim()).join('\n\n');
    if (content.length == 0) return null;
    let article = { url, source, title, subtitle, author, published, content };
    return article;
  }
}


/*****************************************************************************/
export class ElDiarioEsScraper extends ArticlesScraper {
  static _source = 'DIA';
  static _name = "elDiario.es";
  static _root = 'https://www.eldiario.es/opinion';
  static _linksSelector = 'a.kicker';
  static {
    super.register(this);
  }
  filterLinks(links) {
    return links.filter(v => v.endsWith('.html'));
  }
  parseArticle(html, url) {
    const $ = cheerio.load(html);
    let source = this.source;
    let title = $('title').text().trim();
    let subtitle = $('meta[name="description"]').attr('content').trim();
    let published = interpretDate($('meta[property="article:published_time"]').attr('content'));
    let author = $('meta[name="author"]').attr('content').trim();
    let content = $('p.article-text').get().map(b => $(b).text().trim()).join('\n\n');
    if (content.length == 0) return null;
    let article = { url, source, title, subtitle, author, published, content };
    return article;
  }
}

/*****************************************************************************/
// helper builder class that builds one instance of each scraper registered
export class ArticlesScrapersBuilder {
  static buildAll(db) {
    let allSources = ArticlesScraper.allScraperSources();
    return allSources.map(src => ArticlesScraper.createScraper(src, db));
  }
}

