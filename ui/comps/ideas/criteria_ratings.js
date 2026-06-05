function criteriaRatingsTemplate(state) {
    const ratingTemplate = (r) => {
        const mr = 'criteriaRatings', api = '/api/criteria-ratings';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">Criteria rating</span>
                <button class="back-btn" type="button" onclick="criteriaRatings.selected=null;criteriaRatings.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Idea',      'idea_id', ideaName(r.idea_id),       'select', ideas.list.map(i => ({value: i.id, label: i.name})))}
                ${editableField(mr, api, 'Criterion', 'crit_id', criterionName(r.crit_id),  'select', criteria.list.map(c => ({value: c.id, label: c.name})))}
                ${editableField(mr, api, 'Score',     'score',   String(r.score),           'score')}
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="deleteCriteriaRating(criteriaRatings.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveCriteriaRating(event)">
            <div class="item-card__header">
                <span class="item-card__category">New criteria rating</span>
                <button class="back-btn" type="button" onclick="criteriaRatings.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Idea</label>
                    <select name="idea_id" required>
                        <option value="">Select an idea</option>
                        ${ideas.list.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}
                    </select>
                </div>
                <div class="add-form__field">
                    <label>Criterion</label>
                    <select name="crit_id" required>
                        <option value="">Select a criterion</option>
                        ${criteria.list.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
                    </select>
                </div>
                <div class="add-form__field">
                    <label>Score</label>
                    <input name="score" type="number" min="0" max="10" step="1" value="5" required>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Save</button>
            </div>
        </form>
    `;

    const rowTemplate = (r, rid) => `
        <div class="item-row" onclick="selectCriteriaRating(${rid})">
            <div class="item-row__main">
                <span class="item-row__name">${ideaName(r.idea_id)}</span>
                <span class="item-row__category">${criterionName(r.crit_id)}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${r.score}</span>
            </div>
        </div>
    `;

    if (state.selected) return ratingTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="criteriaRatings.adding=true">+ Add rating</button>
        </div>
        ${state.list.map((r, rid) => rowTemplate(r, rid)).join("")}
    `;
}

var criteriaRatings = mount(
    document.getElementById("criteria-ratings-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    criteriaRatingsTemplate
);

function selectCriteriaRating(rid) {
    criteriaRatings.selected = criteriaRatings.list[rid];
}

async function deleteCriteriaRating(r) {
    if (offline) {
        const idx = criteriaRatings.list.findIndex(item => item.id === r.id);
        if (idx !== -1) criteriaRatings.list.splice(idx, 1);
        lsFlush(lsKey('/api/criteria-ratings'), criteriaRatings.list);
        criteriaRatings.editing_field = null;
        criteriaRatings.selected = null;
        return;
    }

    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/criteria-ratings/${r.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/criteria-ratings')}?id=eq.${r.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete criteria rating");
        const idx = criteriaRatings.list.findIndex(item => item.id === r.id);
        if (idx !== -1) criteriaRatings.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete criteria rating.");
        return;
    }
    } else { //testing
        const idx = criteriaRatings.list.findIndex(item => item.id === r.id); //testing
        if (idx !== -1) criteriaRatings.list.splice(idx, 1); //testing
    } //testing
    criteriaRatings.editing_field = null;
    criteriaRatings.selected = null;
}

async function createCriteriaRating(data) {
    if (offline) {
        criteriaRatings.list.push({...data, id: Date.now()});
        lsFlush(lsKey('/api/criteria-ratings'), criteriaRatings.list);
        return;
    }

    if (!testing) {  //testing
    let saved;
    if (!supabase) {
        const userId = getCurrentUserId();
        const headers = { "Content-Type": "application/json" };
        if (userId) headers["X-User-Id"] = userId;
        const response = await fetch("/api/criteria-ratings", { method: "POST", headers, body: JSON.stringify(data) });
        if (!response.ok) throw new Error("Failed to save criteria rating");
        saved = await response.json();
    } else {
        const response = await fetch(sbUrl('/api/criteria-ratings'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
        if (!response.ok) throw new Error("Failed to save criteria rating");
        saved = (await response.json())[0];
    }
    criteriaRatings.list.push(saved);
    } else { //testing
        criteriaRatings.list.push({...data, id: Date.now()}); //testing
    } //testing
}

async function saveCriteriaRating(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        idea_id: parseInt(fd.get("idea_id"), 10),
        crit_id: parseInt(fd.get("crit_id"), 10),
        score:   Math.min(10, Math.max(0, parseInt(fd.get("score"), 10) || 0)),
    };

    if (offline) {
        criteriaRatings.list.push({...data, id: Date.now()});
        lsFlush(lsKey('/api/criteria-ratings'), criteriaRatings.list);
        criteriaRatings.adding = false;
        return;
    }

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/criteria-ratings", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save criteria rating");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/criteria-ratings'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save criteria rating");
            saved = (await response.json())[0];
        }
        criteriaRatings.list.push(saved);
        criteriaRatings.adding = false;
    } catch (err) {
        alert("Could not save criteria rating.");
    }
    } else { //testing
        criteriaRatings.list.push({...data, id: Date.now()}); //testing
        criteriaRatings.adding = false; //testing
    } //testing
}

function ensureCriteriaRatings() {
}

async function loadCriteriaRatings() {
    const list = document.getElementById("criteria-ratings-list");
    list.innerHTML = "<li>Loading criteria ratings...</li>";

    if (offline) {
        const stored = JSON.parse(localStorage.getItem(lsKey('/api/criteria-ratings')) || '[]');
        list.innerHTML = "";
        criteriaRatings.list = [];
        criteriaRatings.selected = null;
        stored.forEach(r => criteriaRatings.list.push(r));
        ensureCriteriaRatings();
        ideas._lv++;
        portfolioItems._lv++;
        milestones._lv++;
        return;
    }

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/criteria-ratings", { headers });
            if (!response.ok) throw new Error("Failed to fetch criteria ratings");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/criteria-ratings')}?order=idea_id,crit_id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch criteria ratings");
            fetched = await response.json();
        }


        list.innerHTML = "";
        criteriaRatings.list = [];
        criteriaRatings.selected = null;
        fetched.forEach(r => criteriaRatings.list.push(r));
        ensureCriteriaRatings();

    } catch (error) {
        list.innerHTML = "<li>Could not load criteria ratings.</li>";
    }
    } else { //testing
        criteriaRatings.list = []; //testing
        criteriaRatings.list.push( //testing
            {id:1, idea_id:1, crit_id:1, score:8}, //testing
            {id:2, idea_id:1, crit_id:2, score:7}, //testing
            {id:3, idea_id:1, crit_id:3, score:9}, //testing
            {id:4, idea_id:2, crit_id:1, score:6}, //testing
            {id:5, idea_id:3, crit_id:4, score:7}, //testing
            {id:6, idea_id:4, crit_id:5, score:8}  //testing
        ); //testing
    } //testing
    ensureCriteriaRatings();
    ideas._lv++;
    portfolioItems._lv++;
    milestones._lv++;
}
