suite("formatTimeOfDay", function () {
    test("matches the machine's own 12/24-hour locale format", async function () {
        var win = await freshApp({});
        var date = new Date(2026, 0, 1, 14, 5);

        assertEqual(win.formatTimeOfDay(date), date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    });
});

suite("history screen: empty and defaults", function () {
    test("shows the empty-state message when there are no sessions anywhere", async function () {
        var win = await freshApp({ trainees: [baseTrainee({ name: "No Sessions" })] });

        win.openHistoryScreen();

        assertTrue(win.document.getElementById("history-empty").textContent.indexOf("No sessions") !== -1);
        assertEqual(win.document.querySelectorAll(".collapsible-group").length, 0);
    });

    test("opens in date mode by default, regardless of what mode was last used", async function () {
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [trainee] });
        win.openHistoryScreen();
        win.setHistoryMode("trainee");
        win.backFromHistory();

        win.openHistoryScreen();

        assertEqual(win.historyMode, "date");
    });

    test("back button returns home", async function () {
        var win = await freshApp({});

        win.openHistoryScreen();
        win.backFromHistory();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
    });
});

suite("history screen: date mode", function () {
    test("groups sessions by calendar date, most recent date first", async function () {
        var trainee = baseTrainee({
            name: "Jamie",
            sessions: [baseSession({ createdAt: daysAgoTimestamp(5) }), baseSession({ createdAt: daysAgoTimestamp(1) })]
        });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("date");

        var titles = Array.from(win.document.querySelectorAll(".collapsible-group-title")).map(function (el) { return el.textContent; });
        assertEqual(titles.length, 2);
        assertEqual(titles[0], win.formatDayHeader(win.parseDateOnly(daysAgoDate(1))));
        assertEqual(titles[1], win.formatDayHeader(win.parseDateOnly(daysAgoDate(5))));
    });

    test("within the same date, orders sessions by exact logging time, not by trainee", async function () {
        var traineeZ = baseTrainee({ name: "Zed", sessions: [baseSession({ createdAt: 2000 })] });
        var traineeA = baseTrainee({ name: "Amy", sessions: [baseSession({ createdAt: 1000 })] });
        var win = await freshApp({ trainees: [traineeA, traineeZ] });

        win.openHistoryScreen("date");

        var names = Array.from(win.document.querySelectorAll(".history-session-primary")).map(function (el) { return el.textContent; });
        assertEqual(names.length, 2);
        assertEqual(names[0].indexOf("Zed"), 0, "expected Zed first, got: " + names[0]);
        assertEqual(names[1].indexOf("Amy"), 0, "expected Amy second, got: " + names[1]);
    });

    test("shows the time of day after the trainee name, in the same style", async function () {
        var createdAt = new Date(2026, 0, 1, 14, 5).getTime();
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({ createdAt: createdAt })] });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("date");

        var primaryEls = win.document.querySelectorAll(".history-session-primary");
        assertEqual(primaryEls.length, 1);
        assertEqual(primaryEls[0].textContent, "Jamie, " + win.formatTimeOfDay(new Date(createdAt)));
        assertEqual(win.document.querySelectorAll(".history-session-time").length, 0);
    });

    test("date groups are expanded by default", async function () {
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("date");

        assertFalse(win.document.querySelector(".collapsible-group").classList.contains("collapsed"));
    });

    test("excludes sessions belonging to a soft-deleted trainee", async function () {
        var deleted = baseTrainee({ name: "Gone", deleted: true, sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [deleted] });

        win.openHistoryScreen("date");

        assertEqual(win.document.querySelectorAll(".collapsible-group").length, 0);
    });

    test("clicking a group header toggles its collapsed state", async function () {
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [trainee] });
        win.openHistoryScreen("date");
        var group = win.document.querySelector(".collapsible-group");

        group.querySelector(".collapsible-group-header").click();
        assertTrue(group.classList.contains("collapsed"));

        group.querySelector(".collapsible-group-header").click();
        assertFalse(group.classList.contains("collapsed"));
    });

    test("the session preview shows only the plain-text first line of notes", async function () {
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({ notes: "<div><b>Bold</b> line</div><div>hidden second line</div>" })] });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("date");

        assertEqual(win.document.querySelector(".history-session-notes").textContent, "Bold line");
    });

    test("clicking a session row opens it for editing", async function () {
        var trainee = baseTrainee({ name: "Jamie" });
        var session = baseSession({});
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });
        win.openHistoryScreen("date");

        win.document.querySelector(".history-session").click();

        assertTrue(isActive(win.logSessionScreen));
        assertEqual(win.logSessionEditingSessionId, session.id);
    });
});

suite("history screen: trainee mode", function () {
    test("groups by trainee in sortedTrainees order, skipping trainees with no sessions", async function () {
        var busy = baseTrainee({ name: "Busy", sessions: [baseSession({ createdAt: Date.now() })] });
        var empty = baseTrainee({ name: "Empty", sessions: [] });
        var win = await freshApp({ trainees: [empty, busy] });

        win.openHistoryScreen("trainee");

        var titles = Array.from(win.document.querySelectorAll(".collapsible-group-title")).map(function (el) { return el.textContent; });
        assertArrayEqual(titles, ["Busy"]);
    });

    test("trainee groups are collapsed by default", async function () {
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("trainee");

        assertTrue(win.document.querySelector(".collapsible-group").classList.contains("collapsed"));
    });

    test("a trainee's own sessions are sorted by date descending", async function () {
        var trainee = baseTrainee({
            name: "Jamie",
            sessions: [baseSession({ createdAt: daysAgoTimestamp(10) }), baseSession({ createdAt: daysAgoTimestamp(1) })]
        });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("trainee");
        var group = win.document.querySelector(".collapsible-group");
        group.classList.remove("collapsed");

        var dates = Array.from(group.querySelectorAll(".history-session-primary")).map(function (el) { return el.textContent; });
        assertEqual(dates[0].indexOf(win.formatDayHeader(win.parseDateOnly(daysAgoDate(1)))), 0);
    });

    test("shows the time of day next to the date, in the same style", async function () {
        var createdAt = new Date(2026, 0, 1, 14, 5).getTime();
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({ createdAt: createdAt })] });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("trainee");
        win.document.querySelector(".collapsible-group").classList.remove("collapsed");

        var primaryEls = win.document.querySelectorAll(".history-session-primary");
        assertEqual(primaryEls.length, 1);
        assertEqual(primaryEls[0].textContent, win.formatDayHeader(new Date(createdAt)) + ", " + win.formatTimeOfDay(new Date(createdAt)));
        assertEqual(win.document.querySelectorAll(".history-session-time").length, 0);
    });

    test("opening from the trainee screen's Session History link expands and scrolls to that trainee's group", async function () {
        var target = baseTrainee({ name: "Target", sessions: [baseSession({})] });
        var other = baseTrainee({ name: "Other", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [other, target] });

        win.openHistoryScreen("trainee", target.id);

        var group = win.document.getElementById("history-trainee-" + target.id);
        assertTrue(group !== null);
        assertFalse(group.classList.contains("collapsed"));

        var otherGroup = win.document.getElementById("history-trainee-" + other.id);
        assertTrue(otherGroup.classList.contains("collapsed"));
    });

    test("Back after opening from the View Trainee screen's Session History button returns to that View screen", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("trainee", trainee.id);
        win.backFromHistory();

        assertTrue(isActive(win.viewTraineeScreen));
        assertEqual(win.currentTraineeId, trainee.id);
    });

    test("editing a session from a trainee-scoped history view and backing out twice still returns to the View Trainee screen", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var session = baseSession({});
        trainee.sessions = [session];
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("trainee", trainee.id);
        win.openEditSessionScreen(trainee.id, session.id);
        win.backFromLogSession();

        assertTrue(isActive(win.historyScreen));

        win.backFromHistory();

        assertTrue(isActive(win.viewTraineeScreen));
        assertEqual(win.currentTraineeId, trainee.id);
    });
});

suite("history screen: mode switch", function () {
    test("clicking Trainee in the segmented control switches grouping", async function () {
        var trainee = baseTrainee({ name: "Jamie", sessions: [baseSession({})] });
        var win = await freshApp({ trainees: [trainee] });
        win.openHistoryScreen();

        win.document.querySelector('.history-mode-option[data-mode="trainee"]').click();

        assertEqual(win.historyMode, "trainee");
        assertTrue(win.document.querySelector('.history-mode-option[data-mode="trainee"]').classList.contains("selected"));
    });
});
