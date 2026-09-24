suite("bottom nav: unsaved-changes guard", function () {
    test("leaving a dirty trainee screen via the nav bar is guarded, and Discard lands on the actually-clicked destination", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);
        setValue(win.traineeNameInput, "Changed");

        win.document.getElementById("nav-settings-button").click();
        assertTrue(isActive(win.traineeScreen), "navigation is blocked until the warning is resolved");
        assertFalse(isHidden(win.document.getElementById("unsaved-modal")));

        win.document.getElementById("unsaved-discard-button").click();
        assertTrue(isActive(win.settingsScreen), "Discard must resume the nav click's own destination, not just go home");
    });

    test("leaving a dirty log session screen via the nav bar is guarded, and Discard lands on the actually-clicked destination", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openLogSessionScreen();
        win.logSessionNotesInput.innerHTML = "unsaved";

        win.document.getElementById("nav-home-button").click();
        assertTrue(isActive(win.logSessionScreen));

        win.document.getElementById("unsaved-discard-button").click();
        assertTrue(isActive(win.document.getElementById("trainees-screen")));
    });

    test("leaving a dirty settings screen via the nav bar is guarded, and Discard lands on the actually-clicked destination", async function () {
        var win = await freshApp({ trainees: [baseTrainee({ name: "Jamie Rivera" })] });
        win.openSettingsScreen();
        setValue(win.settingsNameInput, "Changed");

        win.document.getElementById("nav-log-session-button").click();
        assertTrue(isActive(win.settingsScreen));

        win.document.getElementById("unsaved-discard-button").click();
        assertTrue(isActive(win.logSessionScreen), "Discard must resume the nav click's own destination, not just go home");
    });

    test("choosing Back in the confirmation from a nav click keeps editing in place", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);
        setValue(win.traineeNameInput, "Changed");

        win.document.getElementById("nav-history-button").click();
        win.document.getElementById("unsaved-back-button").click();

        assertTrue(isActive(win.traineeScreen));
        assertEqual(win.traineeNameInput.value, "Changed");
    });

    test("with no unsaved changes anywhere, every nav button navigates immediately with no confirmation", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });
        win.openTrainee(trainee.id);

        win.document.getElementById("nav-history-button").click();

        assertTrue(isActive(win.historyScreen));
        assertTrue(isHidden(win.document.getElementById("unsaved-modal")));
    });

    test("a screen with no guard (e.g. History) never blocks nav bar navigation", async function () {
        var win = await freshApp({});
        win.openHistoryScreen();

        win.document.getElementById("nav-settings-button").click();

        assertTrue(isActive(win.settingsScreen));
    });
});

suite("bottom nav: active state", function () {
    test("highlights the icon matching the current screen", async function () {
        var win = await freshApp({});

        win.document.getElementById("nav-settings-button").click();

        assertTrue(win.document.getElementById("nav-settings-button").classList.contains("active"));
        assertFalse(win.document.getElementById("nav-home-button").classList.contains("active"));
    });

    test("leaves every icon unhighlighted on a drill-down screen with no nav button of its own", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });

        win.openTrainee(trainee.id);

        ["nav-home-button", "nav-log-session-button", "nav-history-button", "nav-settings-button"].forEach(function (id) {
            assertFalse(win.document.getElementById(id).classList.contains("active"), id + " should not be highlighted");
        });
    });
});
