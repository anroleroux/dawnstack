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

var _typingTimer = null;
var pageExplains = {
    attributes: "Here is where it all begins. Who are you, really? What do you do better than anyone? What have you overcome, built, earned? Map your strengths, claim your wins, and name what makes you irreplaceable. This is your foundation — everything else flows from here."
};

function typeExplain(el, text) {
    if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
    var cursor = document.createElement('span');
    cursor.className = 'page-explain__cursor';
    el.innerHTML = '';
    el.appendChild(cursor);
    var i = 0;
    function tick() {
        if (i < text.length) {
            el.insertBefore(document.createTextNode(text[i]), cursor);
            i++;
            _typingTimer = setTimeout(tick, 30);
        }
    }
    setTimeout(tick, 400);
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