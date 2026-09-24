suite("date helpers", function () {
    test("parseDateOnly reads the date as local midnight, not UTC", async function () {
        var win = await freshApp({});
        var date = win.parseDateOnly("2026-03-15");

        assertEqual(date.getFullYear(), 2026);
        assertEqual(date.getMonth(), 2);
        assertEqual(date.getDate(), 15);
        assertEqual(date.getHours(), 0);
    });

    test("formatDateOnly and parseDateOnly round-trip", async function () {
        var win = await freshApp({});
        var original = new Date(2026, 5, 1);
        var roundTripped = win.parseDateOnly(win.formatDateOnly(original));

        assertEqual(roundTripped.getFullYear(), 2026);
        assertEqual(roundTripped.getMonth(), 5);
        assertEqual(roundTripped.getDate(), 1);
    });

    test("formatDayHeader includes weekday, month, and day", async function () {
        var win = await freshApp({});
        var text = win.formatDayHeader(win.parseDateOnly("2026-01-01"));

        assertTrue(text.indexOf("Jan") !== -1, "expected month abbreviation, got: " + text);
        assertTrue(text.indexOf("1") !== -1, "expected day number, got: " + text);
    });
});

suite("traineeFrecency", function () {
    test("a trainee with no sessions has zero frecency", async function () {
        var win = await freshApp({});
        var trainee = baseTrainee({ sessions: [] });

        assertEqual(win.traineeFrecency(trainee), 0);
    });

    test("a session today contributes close to full weight", async function () {
        var win = await freshApp({});
        var trainee = baseTrainee({ sessions: [baseSession({ date: todayDate() })] });

        assertClose(win.traineeFrecency(trainee), 1, 0.1);
    });

    test("a session one half-life ago contributes about half weight", async function () {
        var win = await freshApp({});
        var trainee = baseTrainee({ sessions: [baseSession({ date: daysAgoDate(30) })] });

        assertClose(win.traineeFrecency(trainee), 0.5, 0.05);
    });

    test("a session far in the past contributes almost nothing", async function () {
        var win = await freshApp({});
        var trainee = baseTrainee({ sessions: [baseSession({ date: daysAgoDate(365) })] });

        assertTrue(win.traineeFrecency(trainee) < 0.01);
    });

    test("multiple sessions sum their individual contributions", async function () {
        var win = await freshApp({});
        var soloScore = win.traineeFrecency(baseTrainee({ sessions: [baseSession({ date: todayDate() })] }));
        var pairScore = win.traineeFrecency(baseTrainee({
            sessions: [baseSession({ date: todayDate() }), baseSession({ date: todayDate() })]
        }));

        assertClose(pairScore, soloScore * 2, 0.05);
    });
});

suite("sortedTrainees", function () {
    test("orders by frecency descending", async function () {
        var busy = baseTrainee({ name: "Busy", sessions: [baseSession({ date: todayDate() })] });
        var quiet = baseTrainee({ name: "Quiet", sessions: [baseSession({ date: daysAgoDate(365) })] });
        var win = await freshApp({ trainees: [quiet, busy] });

        assertArrayEqual(win.sortedTrainees().map(function (t) { return t.name; }), ["Busy", "Quiet"]);
    });

    test("ties in frecency (typically zero sessions) fall back to most recently added first", async function () {
        var older = baseTrainee({ name: "Older", sessions: [], createdAt: 1000 });
        var newer = baseTrainee({ name: "Newer", sessions: [], createdAt: 2000 });
        var win = await freshApp({ trainees: [older, newer] });

        assertArrayEqual(win.sortedTrainees().map(function (t) { return t.name; }), ["Newer", "Older"]);
    });

    test("excludes soft-deleted trainees", async function () {
        var active = baseTrainee({ name: "Active" });
        var deleted = baseTrainee({ name: "Deleted", deleted: true });
        var win = await freshApp({ trainees: [active, deleted] });

        assertArrayEqual(win.sortedTrainees().map(function (t) { return t.name; }), ["Active"]);
    });
});

suite("activeTrainees / findTrainee", function () {
    test("activeTrainees excludes soft-deleted trainees", async function () {
        var active = baseTrainee({ name: "Active" });
        var deleted = baseTrainee({ name: "Deleted", deleted: true });
        var win = await freshApp({ trainees: [active, deleted] });

        assertEqual(win.activeTrainees().length, 1);
        assertEqual(win.activeTrainees()[0].name, "Active");
    });

    test("findTrainee returns null for a soft-deleted trainee's id", async function () {
        var deleted = baseTrainee({ deleted: true });
        var win = await freshApp({ trainees: [deleted] });

        assertEqual(win.findTrainee(deleted.id), null);
    });

    test("findTrainee returns null for an unknown id", async function () {
        var win = await freshApp({});

        assertEqual(win.findTrainee("does-not-exist"), null);
    });

    test("findTrainee returns the trainee for a known, active id", async function () {
        var trainee = baseTrainee({ name: "Findable" });
        var win = await freshApp({ trainees: [trainee] });

        assertEqual(win.findTrainee(trainee.id).name, "Findable");
    });
});

suite("compareSessionsDesc", function () {
    test("a later date sorts before an earlier one", async function () {
        var win = await freshApp({});
        var earlier = baseSession({ date: "2026-01-01" });
        var later = baseSession({ date: "2026-01-02" });

        assertTrue(win.compareSessionsDesc(later, earlier) < 0);
        assertTrue(win.compareSessionsDesc(earlier, later) > 0);
    });

    test("same date breaks the tie by most recently logged (higher createdAt) first", async function () {
        var win = await freshApp({});
        var loggedFirst = baseSession({ date: "2026-01-01", createdAt: 1000 });
        var loggedSecond = baseSession({ date: "2026-01-01", createdAt: 2000 });

        assertTrue(win.compareSessionsDesc(loggedSecond, loggedFirst) < 0);
    });

    test("same date, missing createdAt on both, is treated as a true tie", async function () {
        var win = await freshApp({});
        var a = baseSession({ date: "2026-01-01" });
        var b = baseSession({ date: "2026-01-01" });
        delete a.createdAt;
        delete b.createdAt;

        assertEqual(win.compareSessionsDesc(a, b), 0);
    });
});

suite("notesFirstLine", function () {
    test("plain text with no markup is returned as-is", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("Plain text only"), "Plain text only");
    });

    test("takes only the first of several block-separated lines", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("<div>Hello <b>world</b></div><div>second line</div>"), "Hello world");
    });

    test("skips leading empty lines from stray <br> tags", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("<br><br>First real line<br>second"), "First real line");
    });

    test("takes the first list item's text out of a bullet list", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("<ul><li>Item one</li><li>Item two</li></ul>"), "Item one");
    });

    test("trims whitespace-only lines before finding the first real one", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("   <div>   </div><div>Trimmed line</div>"), "Trimmed line");
    });

    test("content that is entirely empty lines returns an empty string", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("<div><br></div>"), "");
    });

    test("bold and italic tags are stripped, keeping only their text", async function () {
        var win = await freshApp({});

        assertEqual(win.notesFirstLine("<b>Bold</b> and <i>italic</i> text"), "Bold and italic text");
    });
});
