function ideaPriority(ideaId) {
    const attrScores = attributeRatings.list
        .filter(r => r.idea_id === ideaId)
        .map(r => {
            const attr  = attrItems.list.find(a => a.id === r.att_id);
            const group = attributeGroups.list.find(g => g.id === attr?.att_group_id);
            return r.score * (attr?.weight ?? 1) * (group?.weight ?? 1);
        });
    const critScores = criteriaRatings.list
        .filter(r => r.idea_id === ideaId)
        .map(r => {
            const crit = criteria.list.find(c => c.id === r.crit_id);
            return r.score * (crit?.weight ?? 1);
        });
    const scores = [...attrScores, ...critScores];
    if (!scores.length) return '—';
    return (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1);
}

function ideasTemplate(state) {
    const ideaTemplate = (p) => {
        const mr = 'ideas', api = '/api/ideas';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">Idea &mdash; priority: ${ideaPriority(p.id)}</span>
                <button class="back-btn" type="button" onclick="ideas.selected=null;ideas.editing_field=null;ideas.editing_rating=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Name',        'name',        p.name,        'text')}
                ${editableField(mr, api, 'Description', 'description', p.description, 'text')}
            </div>
            <div class="item-card__section">
                <span class="item-card__section-label">Attribute ratings</span>
                ${(() => {
                    const rows = attrItems.list.map(a => {
                        const r  = attributeRatings.list.find(r => r.idea_id === p.id && r.att_id === a.id);
                        const er = ideas.editing_rating;
                        if (er && er.kind === 'attr' && er.refId === a.id) return `
                <div class="editable-field editable-field--editing">
                    <label class="editable-field__label">${a.name}</label>
                    <input class="editable-field__input" type="number" min="0" max="10" step="1" value="${er._draft}" oninput="ideas.editing_rating._draft=this.value">
                    <div class="editable-field__btns">
                        <button class="save-field-btn" type="button" onclick="saveRatingEdit('attr',${a.id},${p.id})">Save</button>
                        <button class="cancel-field-btn" type="button" onclick="cancelRatingEdit()">Cancel</button>
                    </div>
                </div>`;
                        if (!r) return `
                <div class="editable-field">
                    <span class="editable-field__label">${a.name}</span>
                    <span class="editable-field__value" style="opacity:0.35">—</span>
                    <button class="edit-field-btn" type="button" onclick="beginRatingEdit('attr',${a.id},0)">+</button>
                </div>`;
                        return `
                <div class="editable-field">
                    <span class="editable-field__label">${a.name}</span>
                    <span class="editable-field__value">${r.score}</span>
                    <button class="edit-field-btn" type="button" onclick="beginRatingEdit('attr',${a.id},${r.score})">&#9998;</button>
                </div>`;
                    }).join("");
                    return rows || '<p class="item-card__empty">No attributes defined.</p>';
                })()}
            </div>
            <div class="item-card__section">
                <span class="item-card__section-label">Criteria ratings</span>
                ${(() => {
                    const rows = criteria.list.map(c => {
                        const r  = criteriaRatings.list.find(r => r.idea_id === p.id && r.crit_id === c.id);
                        const er = ideas.editing_rating;
                        if (er && er.kind === 'crit' && er.refId === c.id) return `
                <div class="editable-field editable-field--editing">
                    <label class="editable-field__label">${c.name}</label>
                    <input class="editable-field__input" type="number" min="0" max="10" step="1" value="${er._draft}" oninput="ideas.editing_rating._draft=this.value">
                    <div class="editable-field__btns">
                        <button class="save-field-btn" type="button" onclick="saveRatingEdit('crit',${c.id},${p.id})">Save</button>
                        <button class="cancel-field-btn" type="button" onclick="cancelRatingEdit()">Cancel</button>
                    </div>
                </div>`;
                        if (!r) return `
                <div class="editable-field">
                    <span class="editable-field__label">${c.name}</span>
                    <span class="editable-field__value" style="opacity:0.35">—</span>
                    <button class="edit-field-btn" type="button" onclick="beginRatingEdit('crit',${c.id},0)">+</button>
                </div>`;
                        return `
                <div class="editable-field">
                    <span class="editable-field__label">${c.name}</span>
                    <span class="editable-field__value">${r.score}</span>
                    <button class="edit-field-btn" type="button" onclick="beginRatingEdit('crit',${c.id},${r.score})">&#9998;</button>
                </div>`;
                    }).join("");
                    return rows || '<p class="item-card__empty">No criteria defined.</p>';
                })()}
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="cascadeDeleteIdea(ideas.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveIdea(event)">
            <div class="item-card__header">
                <span class="item-card__category">New idea</span>
                <button class="back-btn" type="button" onclick="ideas.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Name</label>
                    <input name="name" type="text" required>
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
        <div class="item-row" onclick="selectIdea(${pid})">
            <div class="item-row__main">
                <span class="item-row__name">${p.name}</span>
                <span class="item-row__category">${p.description || ''}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${ideaPriority(p.id)}</span>
            </div>
        </div>
    `;

    if (state.selected) return ideaTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="ideas.adding=true">+ Add idea</button>
        </div>
        ${[...state.list]
            .map((p, pid) => ({p, pid, score: ideaPriority(p.id) === '—' ? -1 : parseFloat(ideaPriority(p.id))}))
            .sort((a, b) => b.score - a.score)
            .map(({p, pid}) => rowTemplate(p, pid)).join("")}
    `;
}

var ideas = mount(
    document.getElementById("ideas-list"),
    {list: [], selected: null, adding: false, editing_field: null, editing_rating: null, _lv: 0},
    ideasTemplate
);

function selectIdea(pid) {
    ideas.selected = ideas.list[pid];
}

async function deleteIdea(p) {
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/ideas/${p.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/ideas')}?id=eq.${p.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete idea");
        const idx = ideas.list.findIndex(item => item.id === p.id);
        if (idx !== -1) ideas.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete idea.");
        return;
    }
    ideas.editing_field = null;
    ideas.editing_rating = null;
    ideas.selected = null;
}

function beginRatingEdit(kind, refId, score) {
    ideas.editing_rating = {kind, refId, _draft: String(score)};
}

function cancelRatingEdit() {
    ideas.editing_rating = null;
}

async function saveRatingEdit(kind, refId, ideaId) {
    const score = Math.min(10, Math.max(0, parseInt(ideas.editing_rating._draft, 10) || 0));
    const isCrit = kind === 'crit';
    const list   = isCrit ? criteriaRatings : attributeRatings;
    const existing = list.list.find(r => r.idea_id === ideaId && (isCrit ? r.crit_id : r.att_id) === refId);
    const api    = isCrit ? '/api/criteria-ratings' : '/api/attribute-ratings';
    const fkKey  = isCrit ? 'crit_id' : 'att_id';

    if (offline) {
        if (existing && existing.id) {
            existing.score = score;
        } else if (existing) {
            existing.id = Date.now();
            existing.score = score;
        } else {
            list.list.push({id: Date.now(), idea_id: ideaId, [fkKey]: refId, score});
        }
        lsFlush(lsKey(api), list.list);
        ideas.editing_rating = null;
        return;
    }

    try {
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            if (existing && existing.id) {
                const res = await fetch(`${api}/${existing.id}`, {
                    method: "PATCH", headers, body: JSON.stringify({score}),
                });
                if (!res.ok) throw new Error("Failed to update rating");
                existing.score = score;
            } else {
                const res = await fetch(api, {
                    method: "POST", headers,
                    body: JSON.stringify({idea_id: ideaId, [fkKey]: refId, score}),
                });
                if (!res.ok) throw new Error("Failed to create rating");
                const created = await res.json();
                if (existing) Object.assign(existing, created);
                else list.list.push(created);
            }
        } else {
            if (existing && existing.id) {
                const res = await fetch(`${sbUrl(api)}?id=eq.${existing.id}`, {
                    method: "PATCH", headers: sbHeaders(true), body: JSON.stringify({score}),
                });
                if (!res.ok) throw new Error("Failed to update rating");
                existing.score = score;
            } else {
                const res = await fetch(sbUrl(api), {
                    method: "POST", headers: sbHeaders(true),
                    body: JSON.stringify({idea_id: ideaId, [fkKey]: refId, score}),
                });
                if (!res.ok) throw new Error("Failed to create rating");
                const created = (await res.json())[0];
                if (existing) Object.assign(existing, created);
                else list.list.push(created);
            }
        }
    } catch (err) {
        alert("Could not save rating.");
        return;
    }

    ideas.editing_rating = null;
}

async function saveIdea(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        name:        fd.get("name"),
        description: fd.get("description") || "",
    };

    if (offline) {
        const saved = {...data, id: Date.now()};
        ideas.list.push(saved);
        lsFlush(lsKey('/api/ideas'), ideas.list);
        ideas.adding = false;
        return;
    }

    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/ideas", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save idea");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/ideas'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save idea");
            saved = (await response.json())[0];
        }
        ideas.list.push(saved);
        ideas.adding = false;
        populateAttributeRatingsWithGemini(saved);
        populateCriteriaRatingsWithGemini(saved);
    } catch (err) {
        alert("Could not save idea.");
    }
}

async function loadIdeas() {
    const list = document.getElementById("ideas-list");
    list.innerHTML = "<li>Loading ideas...</li>";

    if (offline) {
        const stored = JSON.parse(localStorage.getItem(lsKey('/api/ideas')) || '[]');
        list.innerHTML = "";
        ideas.list = [];
        ideas.selected = null;
        stored.forEach(p => ideas.list.push(p));
        ensureAttributeRatings();
        ensureCriteriaRatings();
        return;
    }

    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/ideas", { headers });
            if (!response.ok) throw new Error("Failed to fetch ideas");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/ideas')}?order=id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch ideas");
            fetched = await response.json();
        }


        list.innerHTML = "";
        ideas.list = [];
        ideas.selected = null;
        fetched.forEach(p => ideas.list.push(p));
        ensureAttributeRatings();
        ensureCriteriaRatings();

    } catch (error) {
        list.innerHTML = "<li>Could not load ideas.</li>";
    }
}
