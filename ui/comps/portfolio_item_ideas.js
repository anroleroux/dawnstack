function portfolioItemName(id) {
    const p = portfolioItems.list.find(p => p.id === id);
    return p ? p.name : '—';
}

function portfolioItemIdeasTemplate(state) {
    const linkTemplate = (r) => {
        const mr = 'portfolioItemIdeas', api = '/api/portfolio-item-ideas';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">Item idea link</span>
                <button class="back-btn" type="button" onclick="portfolioItemIdeas.selected=null;portfolioItemIdeas.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Portfolio item', 'portfolio_item_id', portfolioItemName(r.portfolio_item_id), 'select', portfolioItems.list.map(p => ({value: p.id, label: p.name})))}
                ${editableField(mr, api, 'Idea',           'idea_id',           ideaName(r.idea_id),                   'select', ideas.list.map(i => ({value: i.id, label: i.name})))}
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="deletePortfolioItemIdea(portfolioItemIdeas.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="savePortfolioItemIdea(event)">
            <div class="item-card__header">
                <span class="item-card__category">New item idea link</span>
                <button class="back-btn" type="button" onclick="portfolioItemIdeas.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Portfolio item</label>
                    <select name="portfolio_item_id" required>
                        <option value="">Select a portfolio item</option>
                        ${portfolioItems.list.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
                    </select>
                </div>
                <div class="add-form__field">
                    <label>Idea</label>
                    <select name="idea_id" required>
                        <option value="">Select an idea</option>
                        ${ideas.list.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Save</button>
            </div>
        </form>
    `;

    const rowTemplate = (r, rid) => `
        <div class="item-row" onclick="selectPortfolioItemIdea(${rid})">
            <div class="item-row__main">
                <span class="item-row__name">${portfolioItemName(r.portfolio_item_id)}</span>
                <span class="item-row__category">${ideaName(r.idea_id)}</span>
            </div>
        </div>
    `;

    if (state.selected) return linkTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="portfolioItemIdeas.adding=true">+ Link idea</button>
        </div>
        ${state.list.map((r, rid) => rowTemplate(r, rid)).join("")}
    `;
}

var portfolioItemIdeas = mount(
    document.getElementById("portfolio-item-ideas-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    portfolioItemIdeasTemplate
);

function selectPortfolioItemIdea(rid) {
    portfolioItemIdeas.selected = portfolioItemIdeas.list[rid];
}

async function deletePortfolioItemIdea(r) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/portfolio-item-ideas/${r.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/portfolio-item-ideas')}?id=eq.${r.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete item idea link");
        const idx = portfolioItemIdeas.list.findIndex(item => item.id === r.id);
        if (idx !== -1) portfolioItemIdeas.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete item idea link.");
        return;
    }
    } else { //testing
        const idx = portfolioItemIdeas.list.findIndex(item => item.id === r.id); //testing
        if (idx !== -1) portfolioItemIdeas.list.splice(idx, 1); //testing
    } //testing
    portfolioItemIdeas.editing_field = null;
    portfolioItemIdeas.selected = null;
}

async function addIdeaToPortfolioItem(e, portfolioItemId) {
    e.preventDefault();
    const ideaId = parseInt(new FormData(e.target).get("idea_id"), 10);
    if (!ideaId) return;
    const data = {portfolio_item_id: portfolioItemId, idea_id: ideaId};

    if (!testing) {  //testing
    try {
        let link;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/portfolio-item-ideas", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to add idea link");
            link = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/portfolio-item-ideas'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to add idea link");
            link = (await response.json())[0];
        }
        portfolioItemIdeas.list.push(link);
    } catch (err) {
        alert("Could not add idea.");
        return;
    }
    } else { //testing
        portfolioItemIdeas.list.push({...data, id: Date.now()}); //testing
    } //testing
    portfolioItems._lv++;
}

async function removeIdeaFromPortfolioItem(portfolioItemId, ideaId) {
    const r = portfolioItemIdeas.list.find(r => r.portfolio_item_id === portfolioItemId && r.idea_id === ideaId);
    if (!r) return;

    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/portfolio-item-ideas/${r.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/portfolio-item-ideas')}?id=eq.${r.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to remove idea link");
        const idx = portfolioItemIdeas.list.findIndex(item => item.id === r.id);
        if (idx !== -1) portfolioItemIdeas.list.splice(idx, 1);
    } catch (err) {
        alert("Could not remove idea.");
        return;
    }
    } else { //testing
        const idx = portfolioItemIdeas.list.findIndex(item => item.id === r.id); //testing
        if (idx !== -1) portfolioItemIdeas.list.splice(idx, 1); //testing
    } //testing
    portfolioItems._lv++;
}

async function savePortfolioItemIdea(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        portfolio_item_id: parseInt(fd.get("portfolio_item_id"), 10),
        idea_id:           parseInt(fd.get("idea_id"),           10),
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/portfolio-item-ideas", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save item idea link");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/portfolio-item-ideas'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save item idea link");
            saved = (await response.json())[0];
        }
        portfolioItemIdeas.list.push(saved);
        portfolioItemIdeas.adding = false;
    } catch (err) {
        alert("Could not save item idea link.");
    }
    } else { //testing
        portfolioItemIdeas.list.push({...data, id: Date.now()}); //testing
        portfolioItemIdeas.adding = false; //testing
    } //testing
}

async function loadPortfolioItemIdeas() {
    const list = document.getElementById("portfolio-item-ideas-list");
    list.innerHTML = "<li>Loading item idea links...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/portfolio-item-ideas", { headers });
            if (!response.ok) throw new Error("Failed to fetch item idea links");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/portfolio-item-ideas')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch item idea links");
            fetched = await response.json();
        }

        if (!fetched.length) {
            list.innerHTML = "<li>No item idea links found.</li>";
            return;
        }

        list.innerHTML = "";
        portfolioItemIdeas.list = [];
        portfolioItemIdeas.selected = null;
        fetched.forEach(r => portfolioItemIdeas.list.push(r));

    } catch (error) {
        list.innerHTML = "<li>Could not load item idea links.</li>";
    }
    } else { //testing
        portfolioItemIdeas.list.push( //testing
            {id:1, portfolio_item_id:1, idea_id:1}, //testing
            {id:2, portfolio_item_id:1, idea_id:2}, //testing
            {id:3, portfolio_item_id:2, idea_id:2}, //testing
            {id:4, portfolio_item_id:3, idea_id:3}, //testing
            {id:5, portfolio_item_id:4, idea_id:4}  //testing
        ); //testing
    } //testing
    portfolioItems._lv++;
}
