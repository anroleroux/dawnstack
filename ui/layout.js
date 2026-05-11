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
    attributes: "Here is where it all begins. Who are you, really? What do you do better than anyone? What have you overcome, built, earned? Map your strengths, claim your wins, and name what makes you irreplaceable. This is your foundation — everything else flows from here."
};

function typeExplain(el, text) {
    _explainTimers.forEach(clearTimeout);
    _explainTimers = [];
    var words = text.split(' ');
    el.innerHTML = '';
    words.forEach(function(word, i) {
        var span = document.createElement('span');
        span.textContent = (i === 0 ? '' : ' ') + word;
        span.className = 'page-explain__word';
        el.appendChild(span);
        _explainTimers.push(setTimeout(function() {
            span.classList.add('page-explain__word--visible');
        }, 300 + i * 75));
    });
}

function showPage(name) {
    document.querySelectorAll('main > section').forEach(s => s.hidden = true);
    document.getElementById('page-' + name).hidden = false;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));
    document.getElementById('nav-' + name)?.classList.add('nav-btn--active');
    var explainEl = document.getElementById(name + '-explain');
    if (explainEl && pageExplains[name]) {
        typeExplain(explainEl.querySelector('.page-explain__text'), pageExplains[name]);
    }
}

showPage('milestones');

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

/* {{milestones-js}} */

/* {{milestone-deps-js}} */

function loadAll() {
    loadAttributeGroups(); loadAttributes(); loadIdeas(); loadAttributeRatings();
    loadCriteria(); loadCriteriaRatings(); loadPortfolioItems();
    loadPortfolioItemIdeas(); loadMilestones(); loadMilestoneDeps();
}

function maybeAuth() {
    if (!supabase) { setCurrentUserId(1); loadAll(); return; }
    initAuth();
}

document.addEventListener("DOMContentLoaded", () => {
    if (testing) {  //testing
        document.getElementById('app-section').hidden = false; //testing
        loadAll();  //testing
        return;     //testing
    }               //testing
    maybeAuth();
});