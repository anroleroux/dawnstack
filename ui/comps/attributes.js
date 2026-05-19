function attrItemsTemplate(state) {
    const attributeTemplate = (p) => {
        const mr = 'attrItems', api = '/api/attributes';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">${attributeGroupName(p.att_group_id)}</span>
                <button class="back-btn" type="button" onclick="attrItems.selected=null;attrItems.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Name',            'name',        p.name,                           'text')}
                ${editableField(mr, api, 'Attribute group', 'att_group_id', attributeGroupName(p.att_group_id), 'select', attributeGroups.list.map(c => ({value: c.id, label: c.name})))}
                ${editableField(mr, api, 'Description',     'description', p.description,                   'text')}
                ${editableField(mr, api, 'Weight',          'weight',      p.weight ?? 1,                   'text')}
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="cascadeDeleteAttribute(attrItems.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveAttribute(event)">
            <div class="item-card__header">
                <span class="item-card__category">New attribute</span>
                <button class="back-btn" type="button" onclick="attrItems.adding=false">&#8592; Cancel</button>
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
                    <label>Attribute group</label>
                    <select name="att_group_id" required>
                        <option value="">Select an attribute group</option>
                        ${attributeGroups.list.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
                    </select>
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

    const rowTemplate = (p, pid) => `
        <div class="item-row" onclick="selectAttribute(${pid})">
            <div class="item-row__main">
                <span class="item-row__name">${p.name}</span>
                <span class="item-row__category">${attributeGroupName(p.att_group_id)}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${p.weight ?? 1}×</span>
            </div>
        </div>
    `;

    if (state.selected) return attributeTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="attrItems.adding=true">+ Add attribute</button>
        </div>
        ${state.list.map((p, pid) => rowTemplate(p, pid)).join("")}
    `;
}

var attrItems = mount(
    document.getElementById("attributes-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    attrItemsTemplate
);

function selectAttribute(pid) {
    attrItems.selected = attrItems.list[pid];
}

async function deleteAttribute(p) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/attributes/${p.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/attributes')}?id=eq.${p.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete attribute");
        const idx = attrItems.list.findIndex(item => item.id === p.id);
        if (idx !== -1) attrItems.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete attribute.");
        return;
    }
    } else { //testing
        const idx = attrItems.list.findIndex(item => item.id === p.id); //testing
        if (idx !== -1) attrItems.list.splice(idx, 1); //testing
    } //testing
    attrItems.editing_field = null;
    attrItems.selected = null;
}

async function saveAttribute(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        name:         fd.get("name"),
        att_group_id: parseInt(fd.get("att_group_id"), 10),
        description:  fd.get("description") || "",
        weight:       parseFloat(fd.get("weight")) || 1,
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/attributes", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save attribute");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/attributes'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save attribute");
            saved = (await response.json())[0];
        }
        attrItems.list.push(saved);
        attrItems.adding = false;
    } catch (err) {
        alert("Could not save attribute.");
    }
    } else { //testing
        attrItems.list.push({...data, id: Date.now()}); //testing
        attrItems.adding = false; //testing
    } //testing
}

async function loadAttributes() {
    const list = document.getElementById("attributes-list");
    list.innerHTML = "<li>Loading attributes...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/attributes", { headers });
            if (!response.ok) throw new Error("Failed to fetch attributes");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/attributes')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch attributes");
            fetched = await response.json();
        }


        list.innerHTML = "";
        attrItems.list = [];
        attrItems.selected = null;
        fetched.forEach(p => attrItems.list.push(p));
        ensureAttributeRatings();

    } catch (error) {
        list.innerHTML = "<li>Could not load attributes.</li>";
    }
    } else { //testing
        attrItems.list.push( //testing
            {id:1, name:"Problem solving",       att_group_id:1, description:"Ability to break down and work through complex problems.", weight:1}, //testing
            {id:2, name:"Communication",         att_group_id:1, description:"Clear and effective written and verbal communication.",       weight:1}, //testing
            {id:3, name:"Launched side project", att_group_id:2, description:"Built and shipped a web app independently.",                 weight:1}, //testing
            {id:4, name:"Learned new framework", att_group_id:2, description:"Picked up a new frontend framework quickly.",                weight:1}, //testing
            {id:5, name:"Time management",       att_group_id:3, description:"Struggles with prioritising competing tasks.",               weight:1}, //testing
            {id:6, name:"Public speaking",       att_group_id:3, description:"Nervous when presenting to large audiences.",               weight:1} //testing
        ); //testing
        ensureAttributeRatings(); //testing
    } //testing
}
