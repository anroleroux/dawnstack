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
                <button class="delete-btn" type="button" onclick="cascadeDeleteAttributeGroup(attributeGroups.editing.id)">Delete</button>
            </div>
        </form>
    `;

    const rowTemplate = (c) => `
        <div class="item-row" onclick="editAttributeGroup(${c.id})">
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
}

async function saveAttributeGroup(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        name:        fd.get("name"),
        description: fd.get("description") || "",
        weight:      parseFloat(fd.get("weight")) || 1,
    };

    if (offline) {
        const newItem = {...data, id: Date.now()};
        attributeGroups.list.push(newItem);
        lsFlush(lsKey('/api/attribute-groups'), attributeGroups.list);
        attributeGroups.adding = false;
        return;
    }

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

    if (offline) {
        const idx = attributeGroups.list.findIndex(c => c.id === updated.id);
        if (idx !== -1) attributeGroups.list[idx] = updated;
        lsFlush(lsKey('/api/attribute-groups'), attributeGroups.list);
        attributeGroups.editing = null;
        return;
    }

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
    attributeGroups.editing = null;
}

async function loadAttributeGroups() {
    if (offline) {
        const stored = JSON.parse(localStorage.getItem(lsKey('/api/attribute-groups')) || '[]');
        attributeGroups.list = [];
        stored.forEach(c => attributeGroups.list.push(c));
        return;
    }

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
}
