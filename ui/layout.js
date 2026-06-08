const testing  = true; //testing
const offline  = false;
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

const EXPLAIN_DISMISSED_KEY = 'explainDismissed';

var _currentGroup = null;

function gotItExplain() {
    localStorage.setItem(EXPLAIN_DISMISSED_KEY, '1');
    document.getElementById('shared-explain').hidden = true;
}

const pageGroups = {
    'attributes':           'attributes',
    'att_groups':           'attributes',
    'ideas':                'ideas',
    'criteria':             'ideas',
    'attribute-ratings':    'ideas',
    'criteria-ratings':     'ideas',
    'portfolio-items':      'portfolio-items',
    'portfolio-item-ideas': 'portfolio-items',
    'milestones':           'milestones',
    'milestone-deps':       'milestones',
    'tasks':                'milestones',
};

var pageExplains = {
    home: {
        main: "Hi, if you're anything like me, you have a bunch of ideas flying around in your head. If you only have two — that's a great place to start aswell. This is a tool to help you picture your plan, prioritize what matters, and move with intention. George E. P. Box said \"All models are wrong, some are useful.\" I hope this is also useful to you.",
        hint: "Start by listing what is important to you. Then note down some ideas and rate them again criteria you defined. You can then build a portfoilo of deliverables and plan out their milestones. Move back and forth updating and improving your plan as you grow — the entire structure updates as you change it."
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
    var textEl = aside.querySelector('.page-explain__text');
    var hintEl = aside.querySelector('.page-explain__hint');
    var words = explain.main.split(' ');
    textEl.innerHTML = '';
    words.forEach(function(word, i) {
        var span = document.createElement('span');
        span.textContent = (i === 0 ? '' : ' ') + word;
        span.className = 'page-explain__word';
        span.style.animation = 'page-explain-fade-in 1s ease ' + (400 + i * 120) + 'ms forwards';
        textEl.appendChild(span);
    });
    if (hintEl && explain.hint) {
        hintEl.textContent = explain.hint;
        var hintDelay = 400 + (words.length - 1) * 120 + 900;
        hintEl.style.animation = 'none';
        hintEl.offsetHeight; // force reflow to restart animation
        hintEl.style.animation = 'page-explain-fade-in 0.8s ease ' + hintDelay + 'ms forwards';
    }
}

function showPage(name) {
    document.querySelectorAll('#main-content > section').forEach(s => s.hidden = true);
    document.getElementById('page-' + name).hidden = false;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));
    const group = pageGroups[name] || null;
    document.getElementById('nav-' + (group || name))?.classList.add('nav-btn--active');
    document.body.className = 'page-' + name;

    const sharedExplain = document.getElementById('shared-explain');
    const dismissed = !!localStorage.getItem(EXPLAIN_DISMISSED_KEY);
    if (group && pageExplains[group] && !dismissed) {
        if (group !== _currentGroup) {
            _currentGroup = group;
            sharedExplain.hidden = false;
            typeExplain(sharedExplain, pageExplains[group]);
        }
    } else {
        if (!group) {
            _currentGroup = null;
            var inlineExplain = document.getElementById(name + '-explain');
            if (inlineExplain && pageExplains[name]) {
                typeExplain(inlineExplain, pageExplains[name]);
            }
        }
        sharedExplain.hidden = true;
    }
}

showPage('home');

/* {{reactivity-js}} */

/* {{cascade-js}} */

/* {{auth-js}} */

/* {{att_groups-js}} */

/* {{attributes-js}} */

/* {{ideas-js}} */

/* {{attribute-ratings-js}} */

/* {{criteria-js}} */

/* {{criteria-ratings-js}} */

/* {{portfolio-items-js}} */

/* {{portfolio-item-ideas-js}} */

/* {{settings-js}} */

/* {{gemini-js}} */

/* {{milestones-js}} */

/* {{milestone-deps-js}} */

/* {{tasks-js}} */

/* {{data-io-js}} */

//testing-start
/* {{gantt-tests-js}} */
//testing-end

function loadAll() {
    loadAttributeGroups(); loadAttributes(); loadIdeas(); loadAttributeRatings();
    loadCriteria(); loadCriteriaRatings(); loadPortfolioItems();
    loadPortfolioItemIdeas(); loadMilestones(); loadMilestoneDeps(); loadTasks();
}

function maybeAuth() {
    if (!supabase) { setCurrentUserId(1); document.getElementById('app-section').hidden = false; showPage('home'); loadAll(); return; }
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