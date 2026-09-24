suite("trainees screen", function () {
    test("with no trainees, shows the empty-state message and no cards", async function () {
        var win = await freshApp({});

        assertTrue(win.document.getElementById("trainees-empty").textContent.indexOf("Add your first") !== -1);
        assertEqual(win.document.querySelectorAll(".trainee-card").length, 0);
    });

    test("lists trainees in sortedTrainees order", async function () {
        var busy = baseTrainee({ name: "Busy", sessions: [baseSession({ date: todayDate() })] });
        var quiet = baseTrainee({ name: "Quiet", sessions: [] });
        var win = await freshApp({ trainees: [quiet, busy] });

        var names = Array.from(win.document.querySelectorAll(".trainee-card-name")).map(function (el) { return el.textContent; });
        assertArrayEqual(names, ["Busy", "Quiet"]);
    });

    test("never lists a soft-deleted trainee", async function () {
        var deleted = baseTrainee({ name: "Gone", deleted: true });
        var win = await freshApp({ trainees: [deleted] });

        assertEqual(win.document.querySelectorAll(".trainee-card").length, 0);
    });

    test("search filters the list by name, case-insensitively", async function () {
        var win = await freshApp({ trainees: [baseTrainee({ name: "Jamie Rivera" }), baseTrainee({ name: "Sam Chen" })] });

        setValue(win.traineesSearchInput, "jamie");

        var names = Array.from(win.document.querySelectorAll(".trainee-card-name")).map(function (el) { return el.textContent; });
        assertArrayEqual(names, ["Jamie Rivera"]);
    });

    test("a search with no matches shows a distinct empty-state message", async function () {
        var win = await freshApp({ trainees: [baseTrainee({ name: "Jamie Rivera" })] });

        setValue(win.traineesSearchInput, "nobody named this");

        assertTrue(win.document.getElementById("trainees-empty").textContent.indexOf("No trainees match") !== -1);
    });

    test("clicking a trainee's info opens the trainee screen prefilled for editing", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });

        win.document.querySelector(".trainee-card-info").click();

        assertTrue(isActive(win.traineeScreen));
        assertEqual(win.traineeNameInput.value, "Jamie Rivera");
        assertEqual(win.currentTraineeId, trainee.id);
    });

    test("clicking a trainee's calendar button jumps straight to New Session with that trainee preselected", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainees: [trainee] });

        win.document.querySelector(".trainee-card-session-button").click();

        assertTrue(isActive(win.logSessionScreen));
        assertEqual(win.logSessionTraineeSelect.value, trainee.id);
    });

    test("+ New Trainee opens the trainee screen in create mode", async function () {
        var win = await freshApp({});

        win.document.getElementById("add-trainee-button").click();

        assertTrue(isActive(win.traineeScreen));
        assertEqual(win.traineeNameInput.value, "");
        assertEqual(win.currentTraineeId, null);
    });
});
