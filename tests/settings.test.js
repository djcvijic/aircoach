suite("settings screen", function () {
    test("opens prefilled with the current trainer name and email", async function () {
        var win = await freshApp({ trainerName: "Alex Morgan", trainerEmail: "alex@aircoach.example" });

        win.openSettingsScreen();

        assertEqual(win.settingsNameInput.value, "Alex Morgan");
        assertEqual(win.settingsEmailInput.value, "alex@aircoach.example");
    });

    test("unsaved changes on Back open a confirmation instead of leaving", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();
        setValue(win.settingsNameInput, "Changed Name");

        win.backFromSettings();

        assertTrue(isActive(win.settingsScreen));
        assertFalse(isHidden(win.document.getElementById("unsaved-modal")));
    });

    test("choosing Back in the confirmation keeps editing with the change intact", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();
        setValue(win.settingsNameInput, "Changed Name");
        win.backFromSettings();

        win.document.getElementById("unsaved-back-button").click();

        assertTrue(isActive(win.settingsScreen));
        assertEqual(win.settingsNameInput.value, "Changed Name");
    });

    test("choosing Discard in the confirmation leaves without saving", async function () {
        var win = await freshApp({ trainerName: "Original" });
        win.openSettingsScreen();
        setValue(win.settingsNameInput, "Changed Name");
        win.backFromSettings();

        win.document.getElementById("unsaved-discard-button").click();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.appState.trainerName, "Original");
    });

    test("Back with no changes leaves immediately with no confirmation", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();

        win.backFromSettings();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertTrue(isHidden(win.document.getElementById("unsaved-modal")));
    });

    test("saving with no name shows an error", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();
        setValue(win.settingsNameInput, "");

        win.applySettings();

        assertTrue(win.settingsErrorEl.textContent.length > 0);
        assertTrue(isActive(win.settingsScreen));
    });

    test("saving with no email shows an error", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();
        setValue(win.settingsEmailInput, "");

        win.applySettings();

        assertTrue(win.settingsErrorEl.textContent.length > 0);
        assertTrue(isActive(win.settingsScreen));
    });

    test("a valid save updates the trainer info and returns home", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();
        setValue(win.settingsNameInput, "New Name");
        setValue(win.settingsEmailInput, "new@aircoach.example");

        win.applySettings();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.appState.trainerName, "New Name");
        assertEqual(win.appState.trainerEmail, "new@aircoach.example");
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("export produces a JSON file with the whole app state", async function () {
        var trainee = baseTrainee({ name: "Jamie Rivera" });
        var win = await freshApp({ trainerName: "Alex Morgan", trainees: [trainee] });
        win.openSettingsScreen();

        var capturedBlob = null;
        var capturedDownload = null;
        var originalCreate = win.URL.createObjectURL;
        var originalClick = win.HTMLAnchorElement.prototype.click;
        win.URL.createObjectURL = function (blob) { capturedBlob = blob; return "blob:captured"; };
        win.HTMLAnchorElement.prototype.click = function () { capturedDownload = this.download; };

        win.exportData();

        win.URL.createObjectURL = originalCreate;
        win.HTMLAnchorElement.prototype.click = originalClick;

        var content = JSON.parse(await capturedBlob.text());
        assertTrue(/^aircoach-\d{4}-\d{2}-\d{2}\.json$/.test(capturedDownload), "expected a dated filename, got: " + capturedDownload);
        assertEqual(content.trainerName, "Alex Morgan");
        assertEqual(content.trainees.length, 1);
        assertEqual(content.trainees[0].name, "Jamie Rivera");
    });

    test("importing a valid file overwrites the whole state and reboots", async function () {
        var win = await freshApp({});
        win.openSettingsScreen();

        var payload = {
            trainerName: "Imported Name",
            trainerEmail: "imported@aircoach.example",
            trainees: [baseTrainee({ id: "imported-trainee", name: "Imported Trainee" })]
        };
        var file = new win.File([JSON.stringify(payload)], "backup.json", { type: "application/json" });
        var dataTransfer = new win.DataTransfer();
        dataTransfer.items.add(file);
        win.importFileInput.files = dataTransfer.files;
        win.importFileInput.dispatchEvent(new win.Event("change", { bubbles: true }));
        await wait(50);

        assertEqual(win.appState.trainerName, "Imported Name");
        assertEqual(win.appState.trainees[0].id, "imported-trainee");
        assertTrue(isActive(win.document.getElementById("trainees-screen")));
    });

    test("importing invalid JSON shows an error and leaves state untouched", async function () {
        var win = await freshApp({ trainerName: "Original" });
        win.openSettingsScreen();

        var file = new win.File(["not json"], "garbage.json", { type: "application/json" });
        var dataTransfer = new win.DataTransfer();
        dataTransfer.items.add(file);
        win.importFileInput.files = dataTransfer.files;
        win.importFileInput.dispatchEvent(new win.Event("change", { bubbles: true }));
        await wait(50);

        assertEqual(win.appState.trainerName, "Original");
        assertTrue(isActive(win.settingsScreen), "an invalid import must not navigate away");
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("importing a file with no trainees array is rejected", async function () {
        var win = await freshApp({ trainerName: "Original" });
        win.openSettingsScreen();

        var file = new win.File([JSON.stringify({ trainerName: "Not aircoach" })], "backup.json", { type: "application/json" });
        var dataTransfer = new win.DataTransfer();
        dataTransfer.items.add(file);
        win.importFileInput.files = dataTransfer.files;
        win.importFileInput.dispatchEvent(new win.Event("change", { bubbles: true }));
        await wait(50);

        assertEqual(win.appState.trainerName, "Original");
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("clicking delete erases all data (instant in test mode) and reboots into onboarding", async function () {
        var win = await freshApp({ trainees: [baseTrainee({})] });
        win.openSettingsScreen();
        win.document.getElementById("delete-all-data-button").click();

        win.deleteAllConfirmButton.dispatchEvent(new win.MouseEvent("mousedown"));

        assertEqual(win.appState.trainees.length, 0);
        assertEqual(win.appState.trainerName, "");
        assertTrue(isActive(win.onboardingScreen));
        assertTrue(win.toastEl.textContent.length > 0);
    });

    test("a storage failure during delete-all shows an error and leaves data intact", async function () {
        var trainee = baseTrainee({});
        var win = await freshApp({ trainees: [trainee] });
        win.openSettingsScreen();
        win.document.getElementById("delete-all-data-button").click();

        var originalRemoveItem = win.localStorage.removeItem;
        win.localStorage.removeItem = function () { throw new Error("blocked"); };

        win.deleteAllConfirmButton.dispatchEvent(new win.MouseEvent("mousedown"));

        win.localStorage.removeItem = originalRemoveItem;

        assertEqual(win.appState.trainees.length, 1, "data must survive a failed deletion");
        assertFalse(isActive(win.onboardingScreen), "boot() must not run when deletion failed");
        assertTrue(win.toastEl.textContent.length > 0);
    });
});
