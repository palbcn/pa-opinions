import ArticlesDB from '../lib/articles-db.js';

/*
function version1() {
  const TEST_DATE_DMY = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
  const TEST_DATE_YMD = /(\d{4})-(\d{1,2})-(\d{1,2})T/;
  const TEST_DATE_LOC_DMMMY = /.*?\.\s+D.*?[es]\,\s+(\d{1,2})\s+(?:de |d')(.*?)\s+de\s+(\d{4})/;
  const MESOS = 'gener febrer març abril maig juny juliol agost setembre octubre novembre desembre'.split(' ');
  return function makeDate(kindaDate) {
    let _, d, m, y;
    if (TEST_DATE_DMY.test(kindaDate))
      [_, d, m, y] = TEST_DATE_DMY.exec(kindaDate);
    else if (TEST_DATE_YMD.test(kindaDate))
      [_, y, m, d] = TEST_DATE_YMD.exec(kindaDate);
    else if (TEST_DATE_LOC_DMMMY.test(kindaDate)) {
      let mes;
      [_, d, mes, y] = TEST_DATE_LOC_DMMMY.exec(kindaDate);
      m = MESOS.findIndex(e => e == mes) + 1;
    } else { y = 1999; m = 9; d = 9; }
    return new Date(y, m - 1, d, 12, 0);
  }
}
*/
function version2() {
  return function makeDate(kindaDate) {
    let d = new Date(kindaDate);
    if (d.getFullYear() < 2000) d = new Date();
    let iso = d.toISOString().slice(0, 10);
    if (kindaDate == iso) return null;
    else return iso;
  }
}

(async function main() {
  let db = await ArticlesDB.create();
  let rows = await db.getAllArticles();
  let transformDate = version2();
  let updatedRowsCount = 0;
  for (let row of rows) {
    let date = transformDate(row.published);
    if (date) {
      console.log(row.published, '->', date);
      row.published = date;
      await db.insertArticle(row);
      updatedRowsCount++;
    } else {
      console.log(row.published, 'OK');
    }
  }
  console.log("updated", updatedRowsCount, 'rows of ', rows.length);

})()