suite("trainee screen: create mode", function () {
    test("hides the delete icon and training plan field", async function () {
        var win = await freshApp({});
        win.openNewTraineeScreen();

        assertEqual(win.traineeDeleteButton.style.display, "none");
        assertEqual(win.traineePlanFieldEl.style.display, "none");
    });

    test("title reads New Trainee", async function () {
        var win = await freshApp({});
        win.openNewTraineeScreen();

        assertEqual(win.traineeTitleEl.textContent, "New Trainee");
    });

    test("saving with no name shows an error and creates nothing", async function () {
        var win = await freshApp({});
        win.openNewTraineeScreen();

        win.saveTrainee();

        assertTrue(win.traineeErrorEl.textContent.length > 0);
        assertEqual(win.appState.trainees.length, 0);
        assertTrue(isActive(win.traineeScreen));
    });

    test("a valid save creates the trainee and returns home", async function () {
        var win = await freshApp({});
        win.openNewTraineeScreen();
        setValue(win.traineeNameInput, "Jamie Rivera");
        setValue(win.traineeGenderInput, "female");
        setValue(win.traineePhoneInput, "555-1234");
        setValue(win.traineeEmailInput, "jamie@example.com");

        win.saveTrainee();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.appState.trainees.length, 1);
        var created = win.appState.trainees[0];
        assertEqual(created.name, "Jamie Rivera");
        assertEqual(created.gender, "female");
        assertEqual(created.phone, "555-1234");
        assertEqual(created.email, "jamie@example.com");
        assertEqual(created.deleted, false);
        assertEqual(created.sessions.length, 0);
        assertTrue(created.createdAt > 0);
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("the name is trimmed before saving", async function () {
        var win = await freshApp({});
        win.openNewTraineeScreen();
        setValue(win.traineeNameInput, "  Jamie Rivera  ");

        win.saveTrainee();

        assertEqual(win.appState.trainees[0].name, "Jamie Rivera");
    });
});

suite("trainee screen: edit mode", function () {
    function seededTrainee() {
        return baseTrainee({
            name: "Jamie Rivera",
            gender: "female",
            dob: "1990-05-20",
            phone: "555-1234",
            email: "jamie@example.com",
            trainingPlan: "Solo cross-country prep"
        });
    }

    test("prefills every field from the existing trainee", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });

        win.openTrainee(trainee.id);

        assertEqual(win.traineeTitleEl.textContent, "Jamie Rivera");
        assertEqual(win.traineeNameInput.value, "Jamie Rivera");
        assertEqual(win.traineeGenderInput.value, "female");
        assertEqual(win.traineeDobInput.value, "1990-05-20");
        assertEqual(win.traineePhoneInput.value, "555-1234");
        assertEqual(win.traineeEmailInput.value, "jamie@example.com");
        assertEqual(win.traineePlanInput.innerHTML, "Solo cross-country prep");
    });

    test("shows the delete icon and training plan field", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });

        win.openTrainee(trainee.id);

        assertNotEqual(win.traineeDeleteButton.style.display, "none");
        assertNotEqual(win.traineePlanFieldEl.style.display, "none");
    });

    test("date of birth shows a placeholder when empty and a formatted date once set", async function () {
        var withDob = seededTrainee();
        var withoutDob = baseTrainee({ name: "No Dob", dob: "" });
        var win = await freshApp({ trainees: [withDob, withoutDob] });

        win.openTrainee(withoutDob.id);
        assertEqual(win.traineeDobDisplayEl.textContent, "Date of birth");
        assertFalse(win.traineeDobDisplayEl.classList.contains("has-value"));

        win.openTrainee(withDob.id);
        assertNotEqual(win.traineeDobDisplayEl.textContent, "Date of birth");
        assertTrue(win.traineeDobDisplayEl.classList.contains("has-value"));
    });

    test("saving updates the existing trainee in place, keeping id and sessions", async function () {
        var trainee = seededTrainee();
        trainee.sessions = [baseSession({})];
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);
        setValue(win.traineeNameInput, "Jamie R.");
        setValue(win.traineePhoneInput, "555-9999");

        win.saveTrainee();

        assertTrue(isActive(win.viewTraineeScreen));
        assertEqual(win.appState.trainees.length, 1);
        var updated = win.appState.trainees[0];
        assertEqual(updated.id, trainee.id);
        assertEqual(updated.name, "Jamie R.");
        assertEqual(updated.phone, "555-9999");
        assertEqual(updated.sessions.length, 1);
    });

    test("unsaved changes on Back open a confirmation instead of leaving", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);
        setValue(win.traineeNameInput, "Changed Name");

        win.backFromTrainee();

        assertTrue(isActive(win.traineeScreen));
        assertFalse(isHidden(win.document.getElementById("unsaved-modal")));
    });

    test("choosing Back in the confirmation keeps editing with the change intact", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);
        setValue(win.traineeNameInput, "Changed Name");
        win.backFromTrainee();

        win.document.getElementById("unsaved-back-button").click();

        assertTrue(isActive(win.traineeScreen));
        assertTrue(isHidden(win.document.getElementById("unsaved-modal")));
        assertEqual(win.traineeNameInput.value, "Changed Name");
    });

    test("choosing Discard in the confirmation leaves without saving", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);
        setValue(win.traineeNameInput, "Changed Name");
        win.backFromTrainee();

        win.document.getElementById("unsaved-discard-button").click();

        assertTrue(isActive(win.viewTraineeScreen));
        assertEqual(win.appState.trainees[0].name, "Jamie Rivera");
    });

    test("Back with no changes returns to that trainee's View screen", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);

        win.backFromTrainee();

        assertTrue(isActive(win.viewTraineeScreen));
        assertTrue(isHidden(win.document.getElementById("unsaved-modal")));
    });

    test("deleting soft-deletes the trainee and hides them and their sessions everywhere", async function () {
        var trainee = seededTrainee();
        trainee.sessions = [baseSession({})];
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);

        win.openDeleteTraineeModal();
        win.document.getElementById("delete-confirm-button").click();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.currentTraineeId, null);
        assertTrue(win.toastEl.textContent.length > 0);

        var stillInStorage = win.appState.trainees.find(function (t) { return t.id === trainee.id; });
        assertTrue(stillInStorage !== undefined, "soft delete must not remove the record");
        assertEqual(stillInStorage.deleted, true);
        assertEqual(win.findTrainee(trainee.id), null);
        assertEqual(win.document.querySelectorAll(".trainee-card").length, 0);
    });
});

suite("view trainee screen", function () {
    function seededTrainee() {
        return baseTrainee({
            name: "Jamie Rivera",
            gender: "female",
            dob: "1990-05-20",
            phone: "555-1234",
            email: "jamie@example.com",
            trainingPlan: "Solo cross-country prep"
        });
    }

    test("shows every filled-in field", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });

        win.openViewTraineeScreen(trainee.id);

        assertEqual(win.viewTraineeTitleEl.textContent, "Jamie Rivera");
        assertEqual(win.viewTraineeGenderEl.textContent, "Female");
        assertEqual(win.viewTraineePhoneEl.textContent, "555-1234");
        assertEqual(win.viewTraineeEmailEl.textContent, "jamie@example.com");
        assertEqual(win.viewTraineePlanEl.innerHTML, "Solo cross-country prep");
    });

    test("hides rows for fields the trainee has no value for", async function () {
        var trainee = baseTrainee({ name: "No Details" });
        var win = await freshApp({ trainees: [trainee] });

        win.openViewTraineeScreen(trainee.id);

        assertEqual(win.viewTraineeGenderRowEl.style.display, "none");
        assertEqual(win.viewTraineeDobRowEl.style.display, "none");
        assertEqual(win.viewTraineePhoneRowEl.style.display, "none");
        assertEqual(win.viewTraineeEmailRowEl.style.display, "none");
        assertEqual(win.viewTraineePlanFieldEl.style.display, "none");
    });

    test("hides the Session History button when there are zero sessions, shows it otherwise", async function () {
        var empty = baseTrainee({ name: "Empty", sessions: [] });
        var busy = baseTrainee({ name: "Busy", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [empty, busy] });

        win.openViewTraineeScreen(empty.id);
        assertEqual(win.viewTraineeHistoryFieldEl.style.display, "none");

        win.openViewTraineeScreen(busy.id);
        assertNotEqual(win.viewTraineeHistoryFieldEl.style.display, "none");
    });

    test("shows the total session count, singular and plural", async function () {
        var none = baseTrainee({ name: "None", sessions: [] });
        var one = baseTrainee({ name: "One", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [none, one] });

        win.openViewTraineeScreen(none.id);
        assertEqual(win.viewTraineeSessionCountEl.textContent, "0 sessions");

        win.openViewTraineeScreen(one.id);
        assertEqual(win.viewTraineeSessionCountEl.textContent, "1 session");
    });

    test("Back returns home", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openViewTraineeScreen(trainee.id);

        win.backFromViewTrainee();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
    });

    test("the Edit button opens the trainee screen prefilled for editing", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openViewTraineeScreen(trainee.id);

        win.document.getElementById("view-trainee-edit-button").click();

        assertTrue(isActive(win.traineeScreen));
        assertEqual(win.traineeNameInput.value, "Jamie Rivera");
    });

    test("the Session History button opens History in trainee mode, expanded and scrolled to this trainee", async function () {
        var trainee = seededTrainee();
        trainee.sessions = [baseSession({})];
        var win = await freshApp({ trainees: [trainee] });
        win.openViewTraineeScreen(trainee.id);

        win.document.getElementById("view-trainee-history-button").click();

        assertTrue(isActive(win.historyScreen));
        assertEqual(win.historyMode, "trainee");
        var group = win.document.getElementById("history-trainee-" + trainee.id);
        assertTrue(group !== null);
        assertFalse(group.classList.contains("collapsed"));
    });

    test("the Add Session button opens New Session with this trainee preselected", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openViewTraineeScreen(trainee.id);

        win.document.getElementById("view-trainee-add-session-button").click();

        assertTrue(isActive(win.logSessionScreen));
        assertEqual(win.logSessionTitleEl.textContent, "New Session");
        assertEqual(win.logSessionTraineeSelect.value, trainee.id);
    });

    test("Back/Save from an Add Session opened this way return to the View screen, not home", async function () {
        var trainee = seededTrainee();
        var win = await freshApp({ trainees: [trainee] });
        win.openViewTraineeScreen(trainee.id);
        win.document.getElementById("view-trainee-add-session-button").click();

        win.backFromLogSession();

        assertTrue(isActive(win.viewTraineeScreen));
        assertEqual(win.currentTraineeId, trainee.id);

        win.document.getElementById("view-trainee-add-session-button").click();
        win.saveLogSession();

        assertTrue(isActive(win.viewTraineeScreen));
    });
});
