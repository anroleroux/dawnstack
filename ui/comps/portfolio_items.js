function portfolioItemPriority(portfolioItemId) {
    const ideaIds = portfolioItemIdeas.list
        .filter(r => r.portfolio_item_id === portfolioItemId)
        .map(r => r.idea_id);
    if (!ideaIds.length) return '—';
    const scores = ideaIds
        .map(id => ideaPriority(id))
        .filter(p => p !== '—')
        .map(Number);
    if (!scores.length) return '—';
    return (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1);
}

const portfolioItemTypes = [
    {value: 'product', label: 'Product'},
    {value: 'service', label: 'Service'},
    {value: 'project', label: 'Project'},
];

function portfolioItemsTemplate(state) {
    const itemTemplate = (p) => {
        const mr = 'portfolioItems', api = '/api/portfolio-items';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">${p.type}</span>
                <button class="back-btn" type="button" onclick="portfolioItems.selected=null;portfolioItems.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Name',        'name',        p.name,        'text')}
                ${editableField(mr, api, 'Type',        'type',        p.type,        'select', portfolioItemTypes)}
                ${editableField(mr, api, 'Description', 'description', p.description, 'text')}
            </div>
            <div class="item-card__section">
                <span class="item-card__section-label">Related ideas</span>
                ${portfolioItemIdeas.list
                    .filter(r => r.portfolio_item_id === p.id)
                    .map(r => `
                <div class="editable-field">
                    <span class="editable-field__value">${ideaName(r.idea_id)}</span>
                    <button class="delete-btn" type="button" onclick="removeIdeaFromPortfolioItem(${p.id},${r.idea_id})">Remove</button>
                </div>`).join("") || '<p class="item-card__empty">No related ideas.</p>'}
                <form class="editable-field editable-field--editing" onsubmit="addIdeaToPortfolioItem(event,${p.id})">
                    <select class="editable-field__input" name="idea_id" required>
                        <option value="">Link an idea...</option>
                        ${ideas.list
                            .filter(i => !portfolioItemIdeas.list.some(r => r.portfolio_item_id === p.id && r.idea_id === i.id))
                            .map(i => `<option value="${i.id}">${i.name}</option>`).join("")}
                    </select>
                    <div class="editable-field__btns">
                        <button class="save-field-btn" type="submit">Add</button>
                    </div>
                </form>
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="deletePortfolioItem(portfolioItems.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="savePortfolioItem(event)">
            <div class="item-card__header">
                <span class="item-card__category">New portfolio item</span>
                <button class="back-btn" type="button" onclick="portfolioItems.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Name</label>
                    <input name="name" type="text" required>
                </div>
                <div class="add-form__field">
                    <label>Type</label>
                    <select name="type" required>
                        ${portfolioItemTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join("")}
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
        <div class="item-row" onclick="selectPortfolioItem(${pid})">
            <div class="item-row__main">
                <span class="item-row__name">${p.name}</span>
                <span class="item-row__category">${p.type}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${portfolioItemPriority(p.id)}</span>
            </div>
        </div>
    `;

    if (state.selected) return itemTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="nav-btn" type="button" onclick="showPage('portfolio-item-ideas')" style="margin-right:auto">Item Ideas</button>
            <button class="start-btn" type="button" onclick="portfolioItems.adding=true">+ Add item</button>
        </div>
        ${state.list.map((p, pid) => rowTemplate(p, pid)).join("")}
    `;
}

var portfolioItems = mount(
    document.getElementById("portfolio-items-list"),
    {list: [], selected: null, adding: false, editing_field: null, _lv: 0},
    portfolioItemsTemplate
);

function selectPortfolioItem(pid) {
    portfolioItems.selected = portfolioItems.list[pid];
}

async function deletePortfolioItem(p) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/portfolio-items/${p.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/portfolio-items')}?id=eq.${p.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete portfolio item");
        const idx = portfolioItems.list.findIndex(item => item.id === p.id);
        if (idx !== -1) portfolioItems.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete portfolio item.");
        return;
    }
    } else { //testing
        const idx = portfolioItems.list.findIndex(item => item.id === p.id); //testing
        if (idx !== -1) portfolioItems.list.splice(idx, 1); //testing
    } //testing
    portfolioItems.editing_field = null;
    portfolioItems.selected = null;
}

async function savePortfolioItem(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        name:        fd.get("name"),
        type:        fd.get("type"),
        description: fd.get("description") || "",
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/portfolio-items", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save portfolio item");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/portfolio-items'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save portfolio item");
            saved = (await response.json())[0];
        }
        portfolioItems.list.push(saved);
        portfolioItems.adding = false;
    } catch (err) {
        alert("Could not save portfolio item.");
    }
    } else { //testing
        portfolioItems.list.push({...data, id: Date.now()}); //testing
        portfolioItems.adding = false; //testing
    } //testing
}

async function loadPortfolioItems() {
    const list = document.getElementById("portfolio-items-list");
    list.innerHTML = "<li>Loading portfolio items...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/portfolio-items", { headers });
            if (!response.ok) throw new Error("Failed to fetch portfolio items");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/portfolio-items')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch portfolio items");
            fetched = await response.json();
        }

        if (!fetched.length) {
            list.innerHTML = "<li>No portfolio items found.</li>";
            return;
        }

        list.innerHTML = "";
        portfolioItems.list = [];
        portfolioItems.selected = null;
        fetched.forEach(p => portfolioItems.list.push(p));

    } catch (error) {
        list.innerHTML = "<li>Could not load portfolio items.</li>";
    }
    } else { //testing
        portfolioItems.list.push( //testing
            {id:1, name:"Personal Blog",    type:"product", description:"A blog platform for sharing knowledge and building an audience."}, //testing
            {id:2, name:"Recipe Organiser", type:"product", description:"A web app for saving and tagging recipes."}, //testing
            {id:3, name:"Online Course",    type:"service", description:"A structured learning experience for a target audience."}, //testing
            {id:4, name:"Consulting",       type:"service", description:"Expert advice for small businesses on a project basis."} //testing
        ); //testing
    } //testing
}
