const testing = true; //testing
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
    document.getElementById('nav-' + name).classList.add('nav-btn--active');
}

/* {{reactivity-js}} */

/* {{attributes-js}} */

/* {{att_groups-js}} */

document.addEventListener("DOMContentLoaded", () => {
  setCurrentUserId(1);
  loadAttributeGroups();
  loadAttributes();
});