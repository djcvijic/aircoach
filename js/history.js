// History screen: every session across every trainee, either grouped by
// date (newest first) or grouped by trainee (same frecency order as the
// home screen). Styled after airbudget's own history (detail) screen.

var historyScreen = document.getElementById('history-screen');
var historyModeButtons = document.querySelectorAll('.history-mode-option');
var historyListEl = document.getElementById('history-list');
var historyEmptyEl = document.getElementById('history-empty');

var historyMode = 'date';

// Set only when opened via the trainee screen's "Session History" link, so
// Back can return there instead of always going home.
var historyReturnTraineeId = null;

function formatTimeOfDay(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

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
    var key = formatDateOnly(new Date(entry.session.createdAt));
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
      var primaryText = entry.trainee.name + ', ' + formatTimeOfDay(new Date(entry.session.createdAt));
      group.body.appendChild(buildHistorySessionRow(entry, primaryText));
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
      var sessionDate = new Date(session.createdAt);
      var primaryText = formatDayHeader(sessionDate) + ', ' + formatTimeOfDay(sessionDate);
      group.body.appendChild(buildHistorySessionRow(entry, primaryText));
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

// mode is optional, defaulting to date grouping. scrollToTraineeId expands
// + scrolls to that trainee's group, and sets where Back returns to —
// both only apply when opened from the View Trainee screen's Session
// History button.
function openHistoryScreen(mode, scrollToTraineeId) {
  historyMode = mode || 'date';
  historyReturnTraineeId = scrollToTraineeId || null;
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

// Re-renders in place, unlike openHistoryScreen, so a session-edit round
// trip doesn't reset historyReturnTraineeId and lose the trainee screen
// further back in the chain.
function refreshHistoryScreen() {
  showScreen(historyScreen);
  renderHistoryView();
}

function setHistoryMode(mode) {
  if (mode === historyMode) return;
  historyMode = mode;
  renderHistoryView();
}

function backFromHistory() {
  if (historyReturnTraineeId) {
    var traineeId = historyReturnTraineeId;
    historyReturnTraineeId = null;
    openViewTraineeScreen(traineeId);
  } else {
    goHome();
  }
}
