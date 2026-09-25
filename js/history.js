// History screen: every session across every trainee, either grouped by
// date (newest first) or grouped by trainee (same frecency order as the
// home screen). Styled after airbudget's own history (detail) screen.

var historyScreen = document.getElementById('history-screen');
var historyModeButtons = document.querySelectorAll('.history-mode-option');
var historyListEl = document.getElementById('history-list');
var historyEmptyEl = document.getElementById('history-empty');

var historyMode = 'date';

function allSessionsWithTrainee() {
  var entries = [];
  activeTrainees().forEach(function (trainee) {
    trainee.sessions.forEach(function (session) {
      entries.push({ session: session, trainee: trainee });
    });
  });
  return entries;
}

// Notes are rich text (bold, lists, multiple lines); the history preview
// shows only a plain-text first line, so this walks the parsed HTML
// splitting on block elements/<br> and keeps only text-node content.
function notesFirstLine(html) {
  var container = document.createElement('div');
  container.innerHTML = html;

  var lines = [''];
  var blockTags = { DIV: true, P: true, LI: true, UL: true, OL: true };

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      lines[lines.length - 1] += node.textContent;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.tagName === 'BR') {
      lines.push('');
      return;
    }

    var isBlock = blockTags[node.tagName];
    if (isBlock && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    node.childNodes.forEach(walk);
    if (isBlock) {
      lines.push('');
    }
  }

  container.childNodes.forEach(walk);

  var firstNonEmpty = lines.map(function (line) { return line.trim(); })
    .find(function (line) { return line.length > 0; });
  return firstNonEmpty || '';
}

function buildHistorySessionRow(entry, primaryText) {
  var row = document.createElement('div');
  row.className = 'history-session';
  row.addEventListener('click', function () {
    openEditSessionScreen(entry.trainee.id, entry.session.id);
  });

  var content = document.createElement('div');
  content.className = 'history-session-content';

  var primary = document.createElement('div');
  primary.className = 'history-session-primary';
  primary.textContent = primaryText;
  content.appendChild(primary);

  var firstLine = entry.session.notes ? notesFirstLine(entry.session.notes) : '';
  if (firstLine) {
    var notes = document.createElement('div');
    notes.className = 'history-session-notes';
    notes.textContent = firstLine;
    content.appendChild(notes);
  }

  row.appendChild(content);

  var editIcon = document.createElement('i');
  editIcon.className = 'fa-solid fa-pen history-session-edit-icon';
  row.appendChild(editIcon);

  return row;
}

function buildHistoryGroup(title, sessionCount, collapsed, elementId) {
  var countEl = document.createElement('span');
  countEl.className = 'collapsible-group-count';
  countEl.textContent = sessionCount + ' session' + (sessionCount === 1 ? '' : 's');

  return buildCollapsibleGroup(title, countEl, collapsed, elementId);
}

function renderByDate(entries) {
  entries.sort(function (a, b) {
    return compareSessionsDesc(a.session, b.session);
  });

  var days = [];
  var currentKey = null;
  var currentDay = null;

  entries.forEach(function (entry) {
    var key = entry.session.date;
    if (key !== currentKey) {
      currentKey = key;
      currentDay = { date: parseDateOnly(key), entries: [] };
      days.push(currentDay);
    }
    currentDay.entries.push(entry);
  });

  days.forEach(function (day) {
    var group = buildHistoryGroup(formatDayHeader(day.date), day.entries.length);
    day.entries.forEach(function (entry) {
      group.body.appendChild(buildHistorySessionRow(entry, entry.trainee.name));
    });
    historyListEl.appendChild(group.el);
  });
}

function renderByTrainee() {
  sortedTrainees().forEach(function (trainee) {
    if (trainee.sessions.length === 0) return;

    var sorted = trainee.sessions.slice().sort(compareSessionsDesc);

    var group = buildHistoryGroup(trainee.name, sorted.length, true, 'history-trainee-' + trainee.id);
    sorted.forEach(function (session) {
      var entry = { session: session, trainee: trainee };
      group.body.appendChild(buildHistorySessionRow(entry, formatDayHeader(parseDateOnly(session.date))));
    });
    historyListEl.appendChild(group.el);
  });
}

function renderHistoryView() {
  historyModeButtons.forEach(function (button) {
    button.classList.toggle('selected', button.dataset.mode === historyMode);
  });

  historyListEl.innerHTML = '';

  var entries = allSessionsWithTrainee();
  historyEmptyEl.style.display = entries.length === 0 ? 'block' : 'none';
  if (entries.length === 0) return;

  if (historyMode === 'date') {
    renderByDate(entries);
  } else {
    renderByTrainee();
  }
}

// mode is optional, defaulting to date grouping; scrollToTraineeId is only
// meaningful with trainee grouping, and expands + scrolls to that trainee's
// group once rendered (used by the trainee screen's "See History" link).
function openHistoryScreen(mode, scrollToTraineeId) {
  historyMode = mode || 'date';
  showScreen(historyScreen);
  renderHistoryView();

  if (scrollToTraineeId) {
    var target = document.getElementById('history-trainee-' + scrollToTraineeId);
    if (target) {
      target.classList.remove('collapsed');
      target.scrollIntoView();
    }
  }
}

function setHistoryMode(mode) {
  if (mode === historyMode) return;
  historyMode = mode;
  renderHistoryView();
}

function backFromHistory() {
  goHome();
}
