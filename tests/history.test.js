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
            sessions: [baseSession({ date: daysAgoDate(5) }), baseSession({ date: daysAgoDate(1) })]
        });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("date");

        var titles = Array.from(win.document.querySelectorAll(".collapsible-group-title")).map(function (el) { return el.textContent; });
        assertEqual(titles.length, 2);
        assertEqual(titles[0], win.formatDayHeader(win.parseDateOnly(daysAgoDate(1))));
        assertEqual(titles[1], win.formatDayHeader(win.parseDateOnly(daysAgoDate(5))));
    });

    test("within the same date, orders sessions by exact logging time, not by trainee", async function () {
        var sameDay = todayDate();
        var traineeZ = baseTrainee({ name: "Zed", sessions: [baseSession({ date: sameDay, createdAt: 2000 })] });
        var traineeA = baseTrainee({ name: "Amy", sessions: [baseSession({ date: sameDay, createdAt: 1000 })] });
        var win = await freshApp({ trainees: [traineeA, traineeZ] });

        win.openHistoryScreen("date");

        var names = Array.from(win.document.querySelectorAll(".history-session-primary")).map(function (el) { return el.textContent; });
        assertArrayEqual(names, ["Zed", "Amy"]);
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
        var busy = baseTrainee({ name: "Busy", sessions: [baseSession({ date: todayDate() })] });
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
            sessions: [baseSession({ date: daysAgoDate(10) }), baseSession({ date: daysAgoDate(1) })]
        });
        var win = await freshApp({ trainees: [trainee] });

        win.openHistoryScreen("trainee");
        var group = win.document.querySelector(".collapsible-group");
        group.classList.remove("collapsed");

        var dates = Array.from(group.querySelectorAll(".history-session-primary")).map(function (el) { return el.textContent; });
        assertEqual(dates[0], win.formatDayHeader(win.parseDateOnly(daysAgoDate(1))));
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
