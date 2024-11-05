// renders a full month calendar for the month
function renderCalendar(container, monthDate, onclick) {
  const BLANK = ' ';
  let thisMonth = monthDate.getMonth();
  let thisYear = monthDate.getFullYear();
  let lastDayOfMonth = new Date(thisYear, thisMonth + 1, 0);
  let monthSquares = [];
  let daysInMonth = lastDayOfMonth.getDate();
  let startDay = new Date(thisYear, thisMonth, 1).getDay();         // week day of first day of the month
  let endDay = lastDayOfMonth.getDay();   // week day of last day of the month
  if (startDay != 1) {
    let blanks = startDay == 0 ? 7 : startDay;
    for (let i = 1; i < blanks; i++) { monthSquares.push(BLANK); }
  }
  for (let i = 1; i <= daysInMonth; i++) {
    monthSquares.push(i);
  }
  if (endDay != 0) {
    let blanks = endDay == 6 ? 1 : 7 - endDay;
    for (let i = 0; i < blanks; i++) { monthSquares.push(BLANK); }
  }

  let calendarTable = document.createElement("table");
  calendarTable.classList.add('calendar-table');
  container.innerHTML = "";
  container.appendChild(calendarTable);

  let calendarRow = document.createElement("tr");
  for (let i = 0; i < monthSquares.length; i++) {
    let calendarCell = document.createElement("td");
    if (monthSquares[i] == BLANK) {
      calendarCell.classList.add("blank");
    } else {
      calendarCell.classList.add("day");
      if (monthSquares[i] < 0) calendarCell.classList.add("empty");
      calendarCell.innerHTML = Math.abs(monthSquares[i]);
      calendarCell.addEventListener("click", function (e) {
        if (onclick) onclick(e);
      });
    }
    calendarRow.appendChild(calendarCell);
    if (i != 0 && (i + 1) % 7 == 0) {
      calendarTable.appendChild(calendarRow);
      calendarRow = document.createElement("tr");
      calendarRow.classList.add("day");
    }
  }
}
