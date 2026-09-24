var traineesSearchInput = document.getElementById('trainees-search-input');
traineesSearchInput.addEventListener('input', renderTrainees);

function renderTrainees() {
  var list = document.getElementById('trainees-list');
  var empty = document.getElementById('trainees-empty');
  list.innerHTML = '';

  var query = traineesSearchInput.value.toLowerCase();
  var filtered = sortedTrainees().filter(function (trainee) {
    return trainee.name.toLowerCase().indexOf(query) !== -1;
  });

  if (filtered.length === 0) {
    empty.textContent = activeTrainees().length === 0
      ? 'No trainees yet. Add your first one to get started.'
      : 'No trainees match your search.';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  filtered.forEach(function (trainee) {
    var card = document.createElement('div');
    card.className = 'trainee-card';

    function openThisTrainee() {
      openTrainee(trainee.id);
    }

    var avatarButton = document.createElement('button');
    avatarButton.type = 'button';
    avatarButton.className = 'trainee-card-avatar-button';
    avatarButton.setAttribute('aria-label', 'Edit ' + trainee.name);
    var avatarIcon = document.createElement('i');
    avatarIcon.className = 'fa-solid fa-user';
    avatarButton.appendChild(avatarIcon);
    avatarButton.addEventListener('click', openThisTrainee);
    card.appendChild(avatarButton);

    var info = document.createElement('div');
    info.className = 'trainee-card-info';

    var name = document.createElement('div');
    name.className = 'trainee-card-name';
    name.textContent = trainee.name;
    info.appendChild(name);

    info.addEventListener('click', openThisTrainee);
    card.appendChild(info);

    var sessionButton = document.createElement('button');
    sessionButton.type = 'button';
    sessionButton.className = 'trainee-card-session-button';
    sessionButton.setAttribute('aria-label', 'Add session for ' + trainee.name);
    var sessionIcon = document.createElement('i');
    sessionIcon.className = 'fa-solid fa-calendar-plus';
    sessionButton.appendChild(sessionIcon);
    sessionButton.addEventListener('click', function () {
      currentTraineeId = trainee.id;
      openLogSessionScreen();
    });
    card.appendChild(sessionButton);

    list.appendChild(card);
  });
}

