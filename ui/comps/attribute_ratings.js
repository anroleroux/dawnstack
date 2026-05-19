function ideaName(id) {
    const i = ideas.list.find(i => i.id === id);
    return i ? i.name : '—';
}

function attributeName(id) {
    const a = attrItems.list.find(a => a.id === id);
    return a ? a.name : '—';
}

function attributeRatingsTemplate(state) {
    const ratingTemplate = (r) => {
        const mr = 'attributeRatings', api = '/api/attribute-ratings';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">Attribute rating</span>
                <button class="back-btn" type="button" onclick="attributeRatings.selected=null;attributeRatings.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Idea',      'idea_id', ideaName(r.idea_id),      'select', ideas.list.map(i => ({value: i.id, label: i.name})))}
                ${editableField(mr, api, 'Attribute', 'att_id',  attributeName(r.att_id),  'select', attrItems.list.map(a => ({value: a.id, label: a.name})))}
                ${editableField(mr, api, 'Score',     'score',   String(r.score),          'score')}
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="deleteAttributeRating(attributeRatings.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveAttributeRating(event)">
            <div class="item-card__header">
                <span class="item-card__category">New attribute rating</span>
                <button class="back-btn" type="button" onclick="attributeRatings.adding=false">&#8592; Cancel</button>
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
                    <label>Attribute</label>
                    <select name="att_id" required>
                        <option value="">Select an attribute</option>
                        ${attrItems.list.map(a => `<option value="${a.id}">${a.name}</option>`).join("")}
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
        <div class="item-row" onclick="selectAttributeRating(${rid})">
            <div class="item-row__main">
                <span class="item-row__name">${ideaName(r.idea_id)}</span>
                <span class="item-row__category">${attributeName(r.att_id)}</span>
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
            <button class="start-btn" type="button" onclick="attributeRatings.adding=true">+ Add rating</button>
        </div>
        ${state.list.map((r, rid) => rowTemplate(r, rid)).join("")}
    `;
}

var attributeRatings = mount(
    document.getElementById("attribute-ratings-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    attributeRatingsTemplate
);

function selectAttributeRating(rid) {
    attributeRatings.selected = attributeRatings.list[rid];
}

async function deleteAttributeRating(r) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/attribute-ratings/${r.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/attribute-ratings')}?id=eq.${r.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete attribute rating");
        const idx = attributeRatings.list.findIndex(item => item.id === r.id);
        if (idx !== -1) attributeRatings.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete attribute rating.");
        return;
    }
    } else { //testing
        const idx = attributeRatings.list.findIndex(item => item.id === r.id); //testing
        if (idx !== -1) attributeRatings.list.splice(idx, 1); //testing
    } //testing
    attributeRatings.editing_field = null;
    attributeRatings.selected = null;
}

async function saveAttributeRating(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        idea_id: parseInt(fd.get("idea_id"), 10),
        att_id:  parseInt(fd.get("att_id"),  10),
        score:   Math.min(10, Math.max(0, parseInt(fd.get("score"), 10) || 0)),
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/attribute-ratings", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save attribute rating");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/attribute-ratings'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save attribute rating");
            saved = (await response.json())[0];
        }
        attributeRatings.list.push(saved);
        attributeRatings.adding = false;
    } catch (err) {
        alert("Could not save attribute rating.");
    }
    } else { //testing
        attributeRatings.list.push({...data, id: Date.now()}); //testing
        attributeRatings.adding = false; //testing
    } //testing
}

function ensureAttributeRatings() {
}

async function loadAttributeRatings() {
    const list = document.getElementById("attribute-ratings-list");
    list.innerHTML = "<li>Loading attribute ratings...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/attribute-ratings", { headers });
            if (!response.ok) throw new Error("Failed to fetch attribute ratings");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/attribute-ratings')}?order=idea_id,att_id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch attribute ratings");
            fetched = await response.json();
        }


        list.innerHTML = "";
        attributeRatings.list = [];
        attributeRatings.selected = null;
        fetched.forEach(r => attributeRatings.list.push(r));
        ensureAttributeRatings();

    } catch (error) {
        list.innerHTML = "<li>Could not load attribute ratings.</li>";
    }
    } else { //testing
        attributeRatings.list = []; //testing
        attributeRatings.list.push( //testing
            {id:1, idea_id:1, att_id:1, score:7}, //testing
            {id:2, idea_id:1, att_id:2, score:9}, //testing
            {id:3, idea_id:2, att_id:1, score:8}, //testing
            {id:4, idea_id:3, att_id:2, score:8}, //testing
            {id:5, idea_id:4, att_id:1, score:6}, //testing
            {id:6, idea_id:5, att_id:1, score:9}  //testing
        ); //testing
    } //testing
    ensureAttributeRatings();
    ideas._lv++;
    portfolioItems._lv++;
}
