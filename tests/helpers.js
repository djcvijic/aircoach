// Shared helpers for driving the real app inside the iframe. Every test
// file interacts with the app exactly like a user would: real DOM events
// on real elements, never a mocked or reimplemented DOM.

var APP_STORAGE_KEY = "aircoach-state";

function seedState(partial) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
        trainerName: partial.trainerName != null ? partial.trainerName : "Alex Morgan",
        trainerEmail: partial.trainerEmail != null ? partial.trainerEmail : "alex@aircoach.example",
        trainees: partial.trainees || []
    }));
}

// index.html registers a cache-first service worker; tests.html unregisters
// any leftover registration before the suite runs (see tests.html), so a
// plain cache-busted navigation is enough to always get the current files.
function loadApp() {
    return new Promise(function (resolve) {
        var iframe = document.getElementById("app-frame");
        iframe.addEventListener("load", function onLoad() {
            iframe.removeEventListener("load", onLoad);
            resolve(iframe.contentWindow);
        });
        iframe.src = "../index.html?testMode=1&v=" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    });
}

// partialState === null clears storage (fresh install / onboarding tests).
// Otherwise seeds storage with the given state before the app boots.
async function freshApp(partialState) {
    if (partialState === null) {
        localStorage.removeItem(APP_STORAGE_KEY);
    } else {
        seedState(partialState || {});
    }
    return await loadApp();
}

function setValue(el, value) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
}

function isActive(screenEl) {
    return screenEl.classList.contains("active");
}

function isHidden(el) {
    return el.classList.contains("hidden");
}

function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
}

function dateOnly(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function todayDate() {
    return dateOnly(new Date());
}

function daysAgoDate(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return dateOnly(d);
}

function baseTrainee(overrides) {
    var trainee = {
        id: "trainee-" + Math.random().toString(36).slice(2, 8),
        name: "Test Trainee",
        gender: "",
        dob: "",
        email: "",
        phone: "",
        trainingPlan: "",
        sessions: [],
        deleted: false,
        createdAt: Date.now()
    };
    for (var key in overrides) {
        trainee[key] = overrides[key];
    }
    return trainee;
}

function baseSession(overrides) {
    var session = {
        id: "session-" + Math.random().toString(36).slice(2, 8),
        date: todayDate(),
        notes: "",
        createdAt: Date.now()
    };
    for (var key in overrides) {
        session[key] = overrides[key];
    }
    return session;
}
