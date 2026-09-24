suite("log session screen: opening", function () {
    test("with zero trainees, shows a toast and never opens the screen", async function () {
        var win = await freshApp({});

        win.openLogSessionScreen();

        assertFalse(isActive(win.logSessionScreen));
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("opens with today's date and title New Session", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });

        win.openLogSessionScreen();

        assertTrue(isActive(win.logSessionScreen));
        assertEqual(win.logSessionTitleEl.textContent, "New Session");
        assertEqual(win.logSessionDateInput.value, todayDate());
    });

    test("hides the delete icon in create mode", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });

        win.openLogSessionScreen();

        assertEqual(win.logSessionDeleteButton.style.display, "none");
    });

    test("preselects the current trainee when one is already set", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.currentTraineeId = trainee.id;

        win.openLogSessionScreen();

        assertEqual(win.logSessionTraineeSelect.value, trainee.id);
    });

    test("leaves the trainee unselected when none is set", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.currentTraineeId = null;

        win.openLogSessionScreen();

        assertEqual(win.logSessionTraineeSelect.value, "");
    });

    test("the trainee dropdown lists trainees in sortedTrainees order and excludes soft-deleted ones", async function () {
        var busy = baseTrainee({ name: "Busy", sessions: [baseSession({ date: todayDate() })] });
        var quiet = baseTrainee({ name: "Quiet", sessions: [] });
        var deleted = baseTrainee({ name: "Gone", deleted: true });
        var win = await freshApp({ trainees: [quiet, deleted, busy] });

        win.openLogSessionScreen();

        var names = Array.from(win.logSessionTraineeSelect.options).map(function (o) { return o.textContent; });
        assertArrayEqual(names, ["Select trainee", "Busy", "Quiet"]);
    });
});

suite("log session screen: validation and saving", function () {
    test("saving with no date shows an error", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();
        win.logSessionDateInput.value = "";

        win.saveLogSession();

        assertTrue(win.logSessionErrorEl.textContent.indexOf("date") !== -1);
        assertEqual(trainee_sessionCount(win, trainee.id), 0);
    });

    test("saving with no trainee selected shows an error", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();

        win.saveLogSession();

        assertTrue(win.logSessionErrorEl.textContent.indexOf("trainee") !== -1);
    });

    test("a valid save adds a session, returns home, and shows a toast", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();
        setValue(win.logSessionTraineeSelect, trainee.id);
        win.logSessionNotesInput.innerHTML = "Great session";

        win.saveLogSession();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(trainee_sessionCount(win, trainee.id), 1);
        var session = win.findTrainee(trainee.id).sessions[0];
        assertEqual(session.date, todayDate());
        assertEqual(session.notes, "Great session");
        assertTrue(session.createdAt > 0);
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("clearing the date field via a real change event snaps back to today", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();

        win.logSessionDateInput.value = "";
        win.logSessionDateInput.dispatchEvent(new win.Event("change"));

        assertEqual(win.logSessionDateInput.value, todayDate());
    });

    function trainee_sessionCount(win, id) {
        var trainee = win.appState.trainees.find(function (t) { return t.id === id; });
        return trainee.sessions.length;
    }
});

suite("log session screen: editing", function () {
    test("prefills date, trainee, and notes from the existing session", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var session = baseSession({ date: "2026-02-14", notes: "Prior notes" });
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });

        win.openEditSessionScreen(trainee.id, session.id);

        assertEqual(win.logSessionTitleEl.textContent, "Edit Session");
        assertEqual(win.logSessionDateInput.value, "2026-02-14");
        assertEqual(win.logSessionTraineeSelect.value, trainee.id);
        assertEqual(win.logSessionNotesInput.innerHTML, "Prior notes");
    });

    test("shows the delete icon in edit mode", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var session = baseSession({});
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });

        win.openEditSessionScreen(trainee.id, session.id);

        assertNotEqual(win.logSessionDeleteButton.style.display, "none");
    });

    test("saving updates the session in place, keeping its id and createdAt", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var session = baseSession({ date: "2026-02-14", notes: "Prior notes", createdAt: 555 });
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });
        win.openEditSessionScreen(trainee.id, session.id);
        setValue(win.logSessionDateInput, "2026-03-01");
        win.logSessionNotesInput.innerHTML = "Updated notes";

        win.saveLogSession();

        var updated = win.findTrainee(trainee.id).sessions[0];
        assertEqual(updated.id, session.id);
        assertEqual(updated.createdAt, 555);
        assertEqual(updated.date, "2026-03-01");
        assertEqual(updated.notes, "Updated notes");
    });

    test("saving with a different trainee selected moves the session, keeping id and createdAt", async function () {
        var oldTrainee = baseTrainee({ name: "Old Trainee" });
        var newTrainee = baseTrainee({ name: "New Trainee" });
        var session = baseSession({ createdAt: 777 });
        oldTrainee.sessions = [session];
        var win = await freshApp({ trainees: [oldTrainee, newTrainee] });
        win.openEditSessionScreen(oldTrainee.id, session.id);

        setValue(win.logSessionTraineeSelect, newTrainee.id);
        win.saveLogSession();

        assertEqual(win.findTrainee(oldTrainee.id).sessions.length, 0);
        var moved = win.findTrainee(newTrainee.id).sessions[0];
        assertEqual(moved.id, session.id);
        assertEqual(moved.createdAt, 777);
    });

    test("unsaved changes on Back/Cancel open a confirmation instead of leaving", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();
        win.logSessionNotesInput.innerHTML = "unsaved note";

        win.backFromLogSession();

        assertTrue(isActive(win.logSessionScreen));
        assertFalse(isHidden(win.document.getElementById("unsaved-modal")));
    });

    test("choosing Back in the confirmation keeps editing with the change intact", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();
        win.logSessionNotesInput.innerHTML = "unsaved note";
        win.backFromLogSession();

        win.document.getElementById("unsaved-back-button").click();

        assertTrue(isActive(win.logSessionScreen));
        assertEqual(win.logSessionNotesInput.innerHTML, "unsaved note");
    });

    test("choosing Discard in the confirmation leaves without saving", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();
        win.logSessionNotesInput.innerHTML = "unsaved note";
        win.backFromLogSession();

        win.document.getElementById("unsaved-discard-button").click();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.findTrainee(trainee.id).sessions.length, 0);
    });

    test("Back with no changes leaves immediately with no confirmation", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();

        win.backFromLogSession();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertTrue(isHidden(win.document.getElementById("unsaved-modal")));
    });
});

suite("log session screen: deleting", function () {
    test("clicking delete opens a confirmation modal", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var session = baseSession({});
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });
        win.openEditSessionScreen(trainee.id, session.id);

        win.document.getElementById("delete-session-button").click();

        assertFalse(isHidden(win.document.getElementById("delete-confirm-modal")));
    });

    test("confirming permanently removes the session (hard delete, not soft), returns home, and shows a toast", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var keep = baseSession({});
        var remove = baseSession({});
        trainee.sessions = [keep, remove];
        var win = await freshApp({ trainees: [trainee] });
        win.openEditSessionScreen(trainee.id, remove.id);
        win.openDeleteSessionModal();

        win.document.getElementById("delete-confirm-button").click();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        var remaining = win.findTrainee(trainee.id).sessions;
        assertEqual(remaining.length, 1);
        assertEqual(remaining[0].id, keep.id);
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("unsaved edits are discarded on delete with no confirmation dialog of their own", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var session = baseSession({});
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });
        win.openEditSessionScreen(trainee.id, session.id);
        win.logSessionNotesInput.innerHTML = "unsaved edit";

        win.document.getElementById("delete-session-button").click();
        win.document.getElementById("delete-confirm-button").click();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.findTrainee(trainee.id).sessions.length, 0);
    });
});
