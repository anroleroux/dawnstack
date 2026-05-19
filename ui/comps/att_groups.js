function attributeGroupsTemplate(state) {
    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveAttributeGroup(event)">
            <div class="item-card__header">
                <span class="item-card__category">New attribute group</span>
                <button class="back-btn" type="button" onclick="attributeGroups.adding=false">&#8592; Cancel</button>
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
        <form class="item-card item-card--detail" onsubmit="updateAttributeGroup(event)">
            <div class="item-card__header">
                <span class="item-card__category">Edit attribute group</span>
                <button class="back-btn" type="button" onclick="attributeGroups.editing=null">&#8592; Cancel</button>
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
            </div>
        </form>
    `;

    const rowTemplate = (c) => `
        <div class="item-row">
            <div class="item-row__main">
                <span class="item-row__name">${c.name}</span>
                <span class="item-row__category">${c.description || ''}</span>
            </div>
            <div class="row-actions">
                <span class="item-row__score">${c.weight ?? 1}×</span>
                <button class="edit-btn" type="button" onclick="editAttributeGroup(${c.id})">Edit</button>
                <button class="delete-btn" type="button" onclick="cascadeDeleteAttributeGroup(${c.id})">Delete</button>
            </div>
        </div>
    `;

    if (state.adding)  return addFormTemplate();
    if (state.editing) return editFormTemplate(state.editing);
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="attributeGroups.adding=true">+ Add attribute group</button>
        </div>
        ${state.list.map((c) => rowTemplate(c)).join("")}
    `;
}

var attributeGroups = mount(
    document.getElementById("att_groups-list"),
    {list: [], adding: false, editing: null},
    attributeGroupsTemplate
);

function editAttributeGroup(id) {
    attributeGroups.editing = attributeGroups.list.find(c => c.id === id);
}

function attributeGroupName(id) {
    const c = attributeGroups.list.find(c => c.id === id);
    return c ? c.name : '—';
}

async function deleteAttributeGroup(id) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/attribute-groups/${id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/attribute-groups')}?id=eq.${id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete attribute group");
        const idx = attributeGroups.list.findIndex(c => c.id === id);
        if (idx !== -1) attributeGroups.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete attribute group.");
        return;
    }
    } else { //testing
        const idx = attributeGroups.list.findIndex(c => c.id === id); //testing
        if (idx !== -1) attributeGroups.list.splice(idx, 1); //testing
    } //testing
}

async function saveAttributeGroup(e) {
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
            const response = await fetch("/api/attribute-groups", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save attribute group");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/attribute-groups'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save attribute group");
            saved = (await response.json())[0];
        }
        attributeGroups.list.push(saved);
        attributeGroups.adding = false;
    } catch (err) {
        alert("Could not save attribute group.");
    }
    } else { //testing
        attributeGroups.list.push({...data, id: Date.now()}); //testing
        attributeGroups.adding = false; //testing
    } //testing
}

async function updateAttributeGroup(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
        id:          attributeGroups.editing.id,
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
            const response = await fetch(`/api/attribute-groups/${updated.id}`, { method: "PUT", headers, body: JSON.stringify(updated) });
            if (!response.ok) throw new Error("Failed to update attribute group");
            saved = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/attribute-groups')}?id=eq.${updated.id}`, {
                method: "PATCH", headers: sbHeaders(true),
                body: JSON.stringify({ name: updated.name, description: updated.description }),
            });
            if (!response.ok) throw new Error("Failed to update attribute group");
            saved = (await response.json())[0];
        }
        const idx = attributeGroups.list.findIndex(c => c.id === saved.id);
        if (idx !== -1) attributeGroups.list[idx] = saved;
    } catch (err) {
        alert("Could not update attribute group.");
        return;
    }
    } else { //testing
        const idx = attributeGroups.list.findIndex(c => c.id === updated.id); //testing
        if (idx !== -1) attributeGroups.list[idx] = updated; //testing
    } //testing
    attributeGroups.editing = null;
}

async function loadAttributeGroups() {
    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/attribute-groups", { headers });
            if (!response.ok) throw new Error("Failed to fetch attribute groups");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/attribute-groups')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch attribute groups");
            fetched = await response.json();
        }
        attributeGroups.list = [];
        fetched.forEach(c => attributeGroups.list.push(c));
    } catch (error) {
        document.getElementById("attribute-groups-list").innerHTML = "<p>Could not load attribute groups.</p>";
    }
    } else { //testing
        attributeGroups.list.push( //testing
            {id:1, name:"Strengths",  description:"Things you are particularly good at.", weight:1}, //testing
            {id:2, name:"Wins",       description:"Past successes and achievements.",      weight:1}, //testing
            {id:3, name:"Weaknesses", description:"Areas you want to improve.",            weight:1} //testing
        ); //testing
    } //testing
}
