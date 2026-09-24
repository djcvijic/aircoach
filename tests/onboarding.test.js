suite("onboarding", function () {
    test("fresh install boots straight into onboarding with no bottom nav", async function () {
        var win = await freshApp(null);

        assertTrue(isActive(win.onboardingScreen));
        assertEqual(win.bottomNavEl.style.display, "none");
    });

    test("an already-onboarded install boots straight home instead", async function () {
        var win = await freshApp({});

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertNotEqual(win.bottomNavEl.style.display, "none");
    });

    test("continuing with no name shows an error and stays on onboarding", async function () {
        var win = await freshApp(null);

        win.document.getElementById("onboarding-continue-button").click();

        assertTrue(win.onboardingErrorEl.textContent.length > 0);
        assertTrue(isActive(win.onboardingScreen));
    });

    test("continuing with a name but no email shows an error and stays on onboarding", async function () {
        var win = await freshApp(null);
        setValue(win.onboardingNameInput, "Alex Morgan");

        win.document.getElementById("onboarding-continue-button").click();

        assertTrue(win.onboardingErrorEl.textContent.length > 0);
        assertTrue(isActive(win.onboardingScreen));
    });

    test("a valid name and email saves and navigates home with the bottom nav shown", async function () {
        var win = await freshApp(null);
        setValue(win.onboardingNameInput, "Alex Morgan");
        setValue(win.onboardingEmailInput, "alex@aircoach.example");

        win.document.getElementById("onboarding-continue-button").click();

        assertTrue(isActive(win.document.getElementById("trainees-screen")));
        assertEqual(win.appState.trainerName, "Alex Morgan");
        assertEqual(win.appState.trainerEmail, "alex@aircoach.example");
        assertNotEqual(win.bottomNavEl.style.display, "none");
    });

    test("leading/trailing whitespace is trimmed from name and email", async function () {
        var win = await freshApp(null);
        setValue(win.onboardingNameInput, "  Alex Morgan  ");
        setValue(win.onboardingEmailInput, "  alex@aircoach.example  ");

        win.document.getElementById("onboarding-continue-button").click();

        assertEqual(win.appState.trainerName, "Alex Morgan");
        assertEqual(win.appState.trainerEmail, "alex@aircoach.example");
    });

    test("the import button opens the same file picker as settings", async function () {
        var win = await freshApp(null);
        var clicked = false;
        var originalClick = win.importFileInput.click;
        win.importFileInput.click = function () { clicked = true; };

        win.document.getElementById("onboarding-import-button").click();

        win.importFileInput.click = originalClick;
        assertTrue(clicked);
    });
});
