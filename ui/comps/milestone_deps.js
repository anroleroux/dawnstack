function milestoneName(id) {
    const m = milestones.list.find(m => m.id === id);
    return m ? m.goal : '—';
}

function milestoneDepsTemplate(state) {
    const linkTemplate = (d) => {
        const mr = 'milestoneDeps', api = '/api/milestone-deps';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">Milestone dependency</span>
                <button class="back-btn" type="button" onclick="milestoneDeps.selected=null;milestoneDeps.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Milestone',   'milestone_id',  milestoneName(d.milestone_id),  'select', milestones.list.map(m => ({value: m.id, label: m.goal})))}
                ${editableField(mr, api, 'Depends on',  'depends_on_id', milestoneName(d.depends_on_id), 'select', milestones.list.map(m => ({value: m.id, label: m.goal})))}
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="deleteMilestoneDep(milestoneDeps.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveMilestoneDep(event)">
            <div class="item-card__header">
                <span class="item-card__category">New dependency</span>
                <button class="back-btn" type="button" onclick="milestoneDeps.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Milestone</label>
                    <select name="milestone_id" required>
                        <option value="">Select a milestone</option>
                        ${milestones.list.map(m => `<option value="${m.id}">${m.goal}</option>`).join("")}
                    </select>
                </div>
                <div class="add-form__field">
                    <label>Depends on</label>
                    <select name="depends_on_id" required>
                        <option value="">Select a milestone</option>
                        ${milestones.list.map(m => `<option value="${m.id}">${m.goal}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Save</button>
            </div>
        </form>
    `;

    const rowTemplate = (d, did) => `
        <div class="item-row" onclick="selectMilestoneDep(${did})">
            <div class="item-row__main">
                <span class="item-row__name">${milestoneName(d.milestone_id)}</span>
                <span class="item-row__category">depends on ${milestoneName(d.depends_on_id)}</span>
            </div>
        </div>
    `;

    if (state.selected) return linkTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="nav-btn" type="button" onclick="showPage('milestones')" style="margin-right:auto">Milestones</button>
            <button class="start-btn" type="button" onclick="milestoneDeps.adding=true">+ Add dependency</button>
        </div>
        ${state.list.map((d, did) => rowTemplate(d, did)).join("")}
    `;
}

var milestoneDeps = mount(
    document.getElementById("milestone-deps-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    milestoneDepsTemplate
);

function selectMilestoneDep(did) {
    milestoneDeps.selected = milestoneDeps.list[did];
}

async function deleteMilestoneDep(d) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/milestone-deps/${d.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/milestone-deps')}?id=eq.${d.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete dependency");
        const idx = milestoneDeps.list.findIndex(item => item.id === d.id);
        if (idx !== -1) milestoneDeps.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete dependency.");
        return;
    }
    } else { //testing
        const idx = milestoneDeps.list.findIndex(item => item.id === d.id); //testing
        if (idx !== -1) milestoneDeps.list.splice(idx, 1); //testing
    } //testing
    milestoneDeps.editing_field = null;
    milestoneDeps.selected = null;
    milestones._lv++;
}

async function saveMilestoneDep(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        milestone_id:  parseInt(fd.get("milestone_id"),  10),
        depends_on_id: parseInt(fd.get("depends_on_id"), 10),
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/milestone-deps", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save dependency");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/milestone-deps'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save dependency");
            saved = (await response.json())[0];
        }
        milestoneDeps.list.push(saved);
        milestoneDeps.adding = false;
    } catch (err) {
        alert("Could not save dependency.");
    }
    } else { //testing
        milestoneDeps.list.push({...data, id: Date.now()}); //testing
        milestoneDeps.adding = false; //testing
    } //testing
    milestones._lv++;
}

async function addMilestoneDep(e, milestoneId) {
    e.preventDefault();
    const dependsOnId = parseInt(new FormData(e.target).get("depends_on_id"), 10);
    if (!dependsOnId) return;
    const data = {milestone_id: milestoneId, depends_on_id: dependsOnId};

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/milestone-deps", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to add dependency");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/milestone-deps'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to add dependency");
            saved = (await response.json())[0];
        }
        milestoneDeps.list.push(saved);
    } catch (err) {
        alert("Could not add dependency.");
        return;
    }
    } else { //testing
        milestoneDeps.list.push({...data, id: Date.now()}); //testing
    } //testing
    milestones._lv++;
}

async function removeMilestoneDep(milestoneId, dependsOnId) {
    const d = milestoneDeps.list.find(d => d.milestone_id === milestoneId && d.depends_on_id === dependsOnId);
    if (!d) return;

    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/milestone-deps/${d.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/milestone-deps')}?id=eq.${d.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to remove dependency");
        const idx = milestoneDeps.list.findIndex(item => item.id === d.id);
        if (idx !== -1) milestoneDeps.list.splice(idx, 1);
    } catch (err) {
        alert("Could not remove dependency.");
        return;
    }
    } else { //testing
        const idx = milestoneDeps.list.findIndex(item => item.id === d.id); //testing
        if (idx !== -1) milestoneDeps.list.splice(idx, 1); //testing
    } //testing
    milestones._lv++;
}

async function loadMilestoneDeps() {
    const list = document.getElementById("milestone-deps-list");
    list.innerHTML = "<li>Loading dependencies...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/milestone-deps", { headers });
            if (!response.ok) throw new Error("Failed to fetch dependencies");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/milestone-deps')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch dependencies");
            fetched = await response.json();
        }

        if (!fetched.length) {
            list.innerHTML = "<li>No dependencies found.</li>";
            return;
        }

        list.innerHTML = "";
        milestoneDeps.list = [];
        milestoneDeps.selected = null;
        fetched.forEach(d => milestoneDeps.list.push(d));

    } catch (error) {
        list.innerHTML = "<li>Could not load dependencies.</li>";
    }
    } else { //testing
        milestoneDeps.list.push( //testing
            {id:1, milestone_id:2, depends_on_id:1}, //testing
            {id:2, milestone_id:5, depends_on_id:4}, //testing
            {id:3, milestone_id:5, depends_on_id:1}  //testing
        ); //testing
    } //testing
}
