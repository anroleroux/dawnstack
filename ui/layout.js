const testing  = true; //testing
const supabase = false;
const SUPABASE_URL      = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_PUBLISHABLE_KEY__';
const debug = false; //testing

const USER_STORAGE_KEY = "currentUserId";

function getCurrentUserId() {
  return localStorage.getItem(USER_STORAGE_KEY) || "";
}

function setCurrentUserId(userId) {
  if (!userId) {
    return;
  }
  localStorage.setItem(USER_STORAGE_KEY, userId);
}

var _explainTimers = [];
var pageExplains = {
    home: {
        main: "Hi. I'm Anro. If you're anything like me, you have a bunch of ideas flying around in your head. And if you only have two — that's a perfectly good place to start. This is just a tool to help you picture your plan, prioritize what matters, and move with intention. I hope it serves you as well as it has served me.",
        hint: "\"All models are wrong, some are useful.\" — George E. P. Box"
    },
    attributes: {
        main: "Here is where it all begins. Who are you, really? What do you do better than anyone? What have you overcome, built, earned? Map your strengths, claim your wins, and name what makes you irreplaceable. This is your foundation — everything else flows from here.",
        hint: "Start by adding attribute groups — these are your categories, like Strengths, Wins, or Weaknesses. Find them in the nav under Attribute Groups. Then come back here to add individual attributes and assign each one to a group."
    },
    ideas: {
        main: "Your attributes are the fuel. Ideas are where you ask — what could I build, offer, or create that only I can? Think without limits first, then bring clarity by rating each idea against who you are and what you know.",
        hint: "Add an idea with the + button. Once added, rate it against your attributes and criteria like impact, reach, and feasibility to see which ones rise to the top."
    },
    "portfolio-items": {
        main: "This is where ideas become real things. Your portfolio is the collection of products, services, and projects you are committing to — the tangible bets you are placing on yourself and your vision.",
        hint: "Add a portfolio item with the + button and link the ideas behind it. Each item can be a product, service, or project. From here you will break it down into milestones."
    },
    milestones: {
        main: "A vision without a timeline is just a wish. Milestones turn your portfolio into a plan — concrete goals with dates that pull you forward, one step at a time.",
        hint: "Add a milestone for a portfolio item, give it a clear goal, and set a target date. Milestones can depend on each other across portfolio items, so you can map the full shape of your work."
    }
};

function typeExplain(aside, explain) {
    _explainTimers.forEach(clearTimeout);
    _explainTimers = [];
    var textEl = aside.querySelector('.page-explain__text');
    var hintEl = aside.querySelector('.page-explain__hint');
    if (hintEl) hintEl.style.opacity = '0';
    var words = explain.main.split(' ');
    textEl.innerHTML = '';
    words.forEach(function(word, i) {
        var span = document.createElement('span');
        span.textContent = (i === 0 ? '' : ' ') + word;
        span.className = 'page-explain__word';
        textEl.appendChild(span);
        _explainTimers.push(setTimeout(function() {
            span.classList.add('page-explain__word--visible');
        }, 400 + i * 120));
    });
    if (hintEl && explain.hint) {
        hintEl.textContent = explain.hint;
        var hintDelay = 400 + (words.length - 1) * 120 + 900;
        _explainTimers.push(setTimeout(function() {
            hintEl.style.opacity = '1';
        }, hintDelay));
    }
}

function showPage(name) {
    document.querySelectorAll('main > section').forEach(s => s.hidden = true);
    document.getElementById('page-' + name).hidden = false;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));
    document.getElementById('nav-' + name)?.classList.add('nav-btn--active');
    document.body.className = 'page-' + name;
    var explainEl = document.getElementById(name + '-explain');
    if (explainEl && pageExplains[name]) {
        typeExplain(explainEl, pageExplains[name]);
    }
}

// showPage('milestones');

/* {{reactivity-js}} */

/* {{auth-js}} */

/* {{attributes-js}} */

/* {{att_groups-js}} */

/* {{ideas-js}} */

/* {{attribute-ratings-js}} */

/* {{criteria-js}} */

/* {{criteria-ratings-js}} */

/* {{portfolio-items-js}} */

/* {{portfolio-item-ideas-js}} */

/* {{settings-js}} */

/* {{milestones-js}} */

/* {{milestone-deps-js}} */

/* {{tasks-js}} */

//testing-start
/* {{gantt-tests-js}} */
//testing-end

function loadAll() {
    loadAttributeGroups(); loadAttributes(); loadIdeas(); loadAttributeRatings();
    loadCriteria(); loadCriteriaRatings(); loadPortfolioItems();
    loadPortfolioItemIdeas(); loadMilestones(); loadMilestoneDeps(); loadTasks();
}

function maybeAuth() {
    if (!supabase) { setCurrentUserId(1); loadAll(); showPage('home'); return; }
    initAuth();
}

document.addEventListener("DOMContentLoaded", () => {
    if (testing) {  //testing-start
        document.getElementById('app-section').hidden = false;
        showPage('home');
        loadAll();
        runGanttTests();
        return;
    } //testing-end
    maybeAuth();
});