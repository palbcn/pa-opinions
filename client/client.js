
function headerClick(e) {
  // toggle visibility to the article main for this header  
  console.log("headerClick", e);
  let header = e.currentTarget;
  let article = header.parentElement;
  let content = article.getElementsByTagName("main")[0];
  content.addEventListener("click", contentClick);
  let display = content.style.display || 'none';
  content.style.display = (display == 'none') ? 'block' : 'none';
}
function mainNavClick(e) {

}

function dateSelected(e) {
  // on date selected 
  // TODO render articles for date selected
  console.log(e.target.value);
  // hide the date selection form
  let dateSelectionForm = document.getElementById('date-selection-form');
  dateSelectionForm.style.display = 'none';
}
function selectDateButtonClick(e) {
  // open popup for date selection
  //   with a form with a input date field
  let dateSelectionForm = document.getElementById('date-selection-form');
  dateSelectionForm.style.display = 'block';
}
function contentClick(e) {
  // toggle visibility to the article 
  let content = e.currentTarget;
  content.style.display = 'none';
  content.parentElement.scrollIntoView();
}
function copyButtonClick(e) {
  e.stopPropagation();
  let button = e.target;
  let article = button.closest('article');
  button.textContent = '';
  let text = article.innerText;
  navigator.clipboard.writeText(text);
  button.textContent = 'Contingut copiat al porta-retalls.';
  setTimeout(() => button.textContent = 'COPIA', 3000);
}
function addCopyButtonToArticle(article) {
  let button = document.createElement('button');
  button.innerText = 'COPIA';
  button.addEventListener("click", copyButtonClick);
  article.querySelector('header h2').appendChild(button);
}
function setAccordionToArticle(article) {
  // add titleClick to each article header and hide the article main
  let header = article.getElementsByTagName("header")[0];
  let content = article.getElementsByTagName("main")[0];
  content.style.display = 'none';
  header.addEventListener("click", headerClick);
}
function addOnClickToArticles() {
  let $articles = document.querySelectorAll("#articles > article");
  //console.log("addOnClickToArticles", $articles)
  $articles.forEach(setAccordionToArticle);
  $articles.forEach(addCopyButtonToArticle);
}

document.addEventListener("DOMContentLoaded", function (e) {
  console.log("DOMContentLoaded", e);
  let selectDateButton = document.getElementById('select-date-button');
  selectDateButton.addEventListener("click", selectDateButtonClick);
  let dateSelectionForm = document.getElementById('date-selection-form');
  dateSelectionForm.getElementsByTagName('input')[0].addEventListener('change', dateSelected);
});

// invoke addOnclick every new articles are loaded to DOM
document.addEventListener('htmx:afterSettle', function (e) {
  //console.log("htmx:afterSettle", e.target.id);
  if (e.target.id == "articles") addOnClickToArticles();
});
