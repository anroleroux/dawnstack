function criteriaTemplate(state) {
    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveCriterion(event)">
            <div class="item-card__header">
                <span class="item-card__category">New criterion</span>
                <button class="back-btn" type="button" onclick="criteria.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field--row">
                    <div class="add-form__field">
                        <label>Name</label>
                        <input name="name" type="text" required>
                    </div>
                    <div class="add-form__field" style="max-width:80px">
                        <label>Weight</label>
                        <input name="weight" type="number" min="0" step="0.1" value="1" required>
                    </div>
                </div>
                <div class="add-form__field">
                    <label>Description</label>
                    <textarea name="description"></textarea>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Save</button>
            </div>
        </form>
    `;

    const editFormTemplate = (c) => `
        <form class="item-card item-card--detail" onsubmit="updateCriterion(event)">
            <div class="item-card__header">
                <span class="item-card__category">Edit criterion</span>
                <button class="back-btn" type="button" onclick="criteria.editing=null">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field--row">
                    <div class="add-form__field">
                        <label>Name</label>
                        <input name="name" type="text" value="${c.name}" required>
                    </div>
                    <div class="add-form__field" style="max-width:80px">
                        <label>Weight</label>
                        <input name="weight" type="number" min="0" step="0.1" value="${c.weight ?? 1}" required>
                    </div>
                </div>
                <div class="add-form__field">
                    <label>Description</label>
                    <textarea name="description">${c.description || ''}</textarea>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Update</button>
                <button class="delete-btn" type="button" onclick="cascadeDeleteCriterion(criteria.editing.id)">Delete</button>
            </div>
        </form>
    `;

    const rowTemplate = (c) => `
        <div class="item-row" onclick="editCriterion(${c.id})">
            <div class="item-row__main">
                <span class="item-row__name">${c.name}</span>
                <span class="item-row__category">${c.description || ''}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${c.weight ?? 1}×</span>
            </div>
        </div>
    `;

    if (state.adding)  return addFormTemplate();
    if (state.editing) return editFormTemplate(state.editing);
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="criteria.adding=true">+ Add criterion</button>
        </div>
        ${state.list.map((c) => rowTemplate(c)).join("")}
    `;
}

var criteria = mount(
    document.getElementById("criteria-list"),
    {list: [], adding: false, editing: null},
    criteriaTemplate
);

function editCriterion(id) {
    criteria.editing = criteria.list.find(c => c.id === id);
}

function criterionName(id) {
    const c = criteria.list.find(c => c.id === id);
    return c ? c.name : '—';
}

async function deleteCriterion(id) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/criteria/${id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/criteria')}?id=eq.${id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete criterion");
        const idx = criteria.list.findIndex(c => c.id === id);
        if (idx !== -1) criteria.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete criterion.");
        return;
    }
    } else { //testing
        const idx = criteria.list.findIndex(c => c.id === id); //testing
        if (idx !== -1) criteria.list.splice(idx, 1); //testing
    } //testing
}

async function saveCriterion(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        name:        fd.get("name"),
        description: fd.get("description") || "",
        weight:      parseFloat(fd.get("weight")) || 1,
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/criteria", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save criterion");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/criteria'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save criterion");
            saved = (await response.json())[0];
        }
        criteria.list.push(saved);
        criteria.adding = false;
    } catch (err) {
        alert("Could not save criterion.");
    }
    } else { //testing
        criteria.list.push({...data, id: Date.now()}); //testing
        criteria.adding = false; //testing
    } //testing
}

async function updateCriterion(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
        id:          criteria.editing.id,
        name:        fd.get("name"),
        description: fd.get("description") || "",
        weight:      parseFloat(fd.get("weight")) || 1,
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch(`/api/criteria/${updated.id}`, { method: "PUT", headers, body: JSON.stringify(updated) });
            if (!response.ok) throw new Error("Failed to update criterion");
            saved = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/criteria')}?id=eq.${updated.id}`, {
                method: "PATCH", headers: sbHeaders(true),
                body: JSON.stringify({ name: updated.name, description: updated.description }),
            });
            if (!response.ok) throw new Error("Failed to update criterion");
            saved = (await response.json())[0];
        }
        const idx = criteria.list.findIndex(c => c.id === saved.id);
        if (idx !== -1) criteria.list[idx] = saved;
    } catch (err) {
        alert("Could not update criterion.");
        return;
    }
    } else { //testing
        const idx = criteria.list.findIndex(c => c.id === updated.id); //testing
        if (idx !== -1) criteria.list[idx] = updated; //testing
    } //testing
    criteria.editing = null;
}

async function loadCriteria() {
    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/criteria", { headers });
            if (!response.ok) throw new Error("Failed to fetch criteria");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/criteria')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch criteria");
            fetched = await response.json();
        }
        criteria.list = [];
        fetched.forEach(c => criteria.list.push(c));
        ensureCriteriaRatings();
    } catch (error) {
        document.getElementById("criteria-list").innerHTML = "<p>Could not load criteria.</p>";
    }
    } else { //testing
        criteria.list.push( //testing
            {id:1, name:"Impact",      description:"How significantly will this affect the target audience.", weight:1}, //testing
            {id:2, name:"Confidence",  description:"How confident are we in our estimates.",                  weight:1}, //testing
            {id:3, name:"Ease",        description:"How easy is it to implement.",                            weight:1}, //testing
            {id:4, name:"Reach",       description:"How many people will this affect in a given period.",     weight:1}, //testing
            {id:5, name:"Feasibility", description:"Technical and financial feasibility.",                    weight:1} //testing
        ); //testing
        ensureCriteriaRatings(); //testing
    } //testing
}
