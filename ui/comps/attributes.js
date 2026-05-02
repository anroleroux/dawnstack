function attributesTemplate(state) {
    const attributeTemplate = (p) => {
        const mr = 'attributes', api = '/api/attributes';
        return `
        <div class="product-card product-card--detail">
            <div class="product-card__header">
                <span class="product-card__category">${attributeGroupName(p.att_group_id)}</span>
                <button class="back-btn" type="button" onclick="attributes.selected=null;attributes.editing_field=null">&#8592; Back</button>
            </div>
            <div class="product-card__fields">
                ${editableField(mr, api, 'Name',            'name',        p.name,                           'text')}
                ${editableField(mr, api, 'Attribute group', 'att_group_id', attributeGroupName(p.att_group_id), 'select', attributeGroups.list.map(c => ({value: c.id, label: c.name})))}
                ${editableField(mr, api, 'Description',     'description', p.description,                   'text')}
            </div>
            <div class="product-card__actions">
                <button class="delete-btn" type="button" onclick="deleteAttribute(attributes.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="product-card product-card--detail" onsubmit="saveAttribute(event)">
            <div class="product-card__header">
                <span class="product-card__category">New attribute</span>
                <button class="back-btn" type="button" onclick="attributes.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Name</label>
                    <input name="name" type="text" required>
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
            <div class="product-card__actions">
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
        </div>
    `;

    if (state.selected) return attributeTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="attributes.adding=true">+ Add attribute</button>
        </div>
        ${state.list.map((p, pid) => rowTemplate(p, pid)).join("")}
    `;
}

var attributes = mount(
    document.getElementById("attributes-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    attributesTemplate
);

function selectAttribute(pid) {
    attributes.selected = attributes.list[pid];
}

async function deleteAttribute(p) {
    if (!testing) {  //testing
    try {
        const userId = getCurrentUserId();
        const headers = userId ? { "X-User-Id": userId } : {};
        const response = await fetch(`/api/attributes/${p.id}`, { method: "DELETE", headers });
        if (!response.ok) throw new Error("Failed to delete attribute");
        const idx = attributes.list.findIndex(item => item.id === p.id);
        if (idx !== -1) attributes.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete attribute.");
        return;
    }
    } else { //testing
        const idx = attributes.list.findIndex(item => item.id === p.id); //testing
        if (idx !== -1) attributes.list.splice(idx, 1); //testing
    } //testing
    attributes.editing_field = null;
    attributes.selected = null;
}

async function saveAttribute(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        name:        fd.get("name"),
        att_group_id: parseInt(fd.get("att_group_id"), 10),
        description: fd.get("description") || "",
    };

    if (!testing) {  //testing
    try {
        const userId = getCurrentUserId();
        const headers = { "Content-Type": "application/json" };
        if (userId) headers["X-User-Id"] = userId;
        const response = await fetch("/api/attributes", {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to save attribute");
        const saved = await response.json();
        attributes.list.push(saved);
        attributes.adding = false;
    } catch (err) {
        alert("Could not save attribute.");
    }
    } else { //testing
        attributes.list.push({...data, id: Date.now()}); //testing
        attributes.adding = false; //testing
    } //testing
}

async function loadAttributes() {
    const list = document.getElementById("attributes-list");
    list.innerHTML = "<li>Loading attributes...</li>";

    if (!testing) {  //testing
    try {
        const userId = getCurrentUserId();
        const headers = userId ? { "X-User-Id": userId } : {};
        const response = await fetch("/api/attributes", { headers });
        if (!response.ok) {
        throw new Error("Failed to fetch attributes");
        }
        const searchAttributes = await response.json();

        if (!searchAttributes.length) {
        list.innerHTML = "<li>No attributes found.</li>";
        return;
        }

        list.innerHTML = "";
        attributes.list = [];
        attributes.selected = null;
        searchAttributes.forEach((p) => {
        attributes.list.push(p);
        });

    } catch (error) {
        list.innerHTML = "<li>Could not load attributes.</li>";
    }
    } else { //testing
        attributes.list.push( //testing
            {id:1, name:"Problem solving",  att_group_id:1, description:"Ability to break down and work through complex problems."}, //testing
            {id:2, name:"Communication",    att_group_id:1, description:"Clear and effective written and verbal communication."}, //testing
            {id:3, name:"Launched side project", att_group_id:2, description:"Built and shipped a web app independently."}, //testing
            {id:4, name:"Learned new framework", att_group_id:2, description:"Picked up a new frontend framework quickly."}, //testing
            {id:5, name:"Time management",  att_group_id:3, description:"Struggles with prioritising competing tasks."}, //testing
            {id:6, name:"Public speaking",  att_group_id:3, description:"Nervous when presenting to large audiences."} //testing
        ); //testing
    } //testing
}
