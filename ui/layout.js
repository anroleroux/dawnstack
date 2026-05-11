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

function showPage(name) {
    document.querySelectorAll('main > section').forEach(s => s.hidden = true);
    document.getElementById('page-' + name).hidden = false;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));
    document.getElementById('nav-' + name)?.classList.add('nav-btn--active');
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

//testing-start
/* {{gantt-tests-js}} */
//testing-end

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
    if (testing) {  //testing-start
        document.getElementById('app-section').hidden = false;
        loadAll();
        runGanttTests();
        return;
    } //testing-end
    maybeAuth();
});