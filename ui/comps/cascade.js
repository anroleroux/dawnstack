async function apiDelete(endpoint, id) {
    if (!supabase) {
        const userId = getCurrentUserId();
        const headers = userId ? { "X-User-Id": userId } : {};
        const r = await fetch(`${endpoint}/${id}`, { method: "DELETE", headers });
        if (!r.ok) throw new Error(`DELETE ${endpoint}/${id} failed`);
    } else {
        const r = await fetch(`${sbUrl(endpoint)}?id=eq.${id}`, { method: "DELETE", headers: sbHeaders() });
        if (!r.ok) throw new Error(`DELETE ${endpoint}/${id} failed`);
    }
}

function removeFromStore(store, id) {
    store.list = store.list.filter(x => x.id !== id);
}

function showCascadeConfirm(title, groups) {
    return new Promise(resolve => {
        let modal = document.getElementById('cascade-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cascade-modal';
            document.body.appendChild(modal);
        }

        const extras = groups.filter(g => g.items.length > 0);
        const listHtml = extras.map(g => {
            const n = g.items.length;
            const previewItems = g.preview
                ? g.items.slice(0, 3).map(g.preview).filter(Boolean)
                : [];
            const preview = previewItems.length ? ': ' + previewItems.join(', ') : '';
            return `<li>${n} ${g.label}${preview}</li>`;
        }).join('');

        modal.innerHTML = `
            <div class="cascade-backdrop" onclick="cascadeCancel()"></div>
            <div class="cascade-dialog">
                <p class="cascade-dialog__title">${title}</p>
                ${extras.length ? `<p class="cascade-dialog__warning">This will also permanently delete:</p><ul class="cascade-dialog__list">${listHtml}</ul>` : ''}
                <div class="cascade-dialog__actions">
                    <button class="back-btn" onclick="cascadeCancel()">Cancel</button>
                    <button class="delete-btn" onclick="cascadeConfirm()">Delete${extras.length ? ' all' : ''}</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        window._cascadeResolve = resolve;
    });
}

function cascadeCancel() {
    const modal = document.getElementById('cascade-modal');
    if (modal) modal.style.display = 'none';
    if (window._cascadeResolve) { window._cascadeResolve(false); window._cascadeResolve = null; }
}

function cascadeConfirm() {
    const modal = document.getElementById('cascade-modal');
    if (modal) modal.style.display = 'none';
    if (window._cascadeResolve) { window._cascadeResolve(true); window._cascadeResolve = null; }
}

async function cascadeDeleteAttributeGroup(id) {
    const group = attributeGroups.list.find(c => c.id === id);
    if (!group) return;
    const groupAttrs = attrItems.list.filter(a => a.att_group_id === id);
    const attrIds = groupAttrs.map(a => a.id);
    const attrRatings = attributeRatings.list.filter(r => attrIds.includes(r.att_id));

    const confirmed = await showCascadeConfirm(`Delete "${group.name}"?`, [
        {label: 'attributes', items: groupAttrs, preview: a => a.name || null},
        {label: 'attribute ratings', items: attrRatings},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const r of attrRatings) await apiDelete('/api/attribute-ratings', r.id);
        for (const a of groupAttrs) await apiDelete('/api/attributes', a.id);
        await apiDelete('/api/attribute-groups', id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const r of attrRatings) removeFromStore(attributeRatings, r.id);
    for (const a of groupAttrs) removeFromStore(attrItems, a.id);
    removeFromStore(attributeGroups, id);
    attributeGroups.editing = null;
    if (offline) {
        lsFlush(lsKey('/api/attribute-ratings'), attributeRatings.list);
        lsFlush(lsKey('/api/attributes'), attrItems.list);
        lsFlush(lsKey('/api/attribute-groups'), attributeGroups.list);
    }
}

async function cascadeDeleteAttribute(p) {
    const attrRatings = attributeRatings.list.filter(r => r.att_id === p.id);

    const confirmed = await showCascadeConfirm(`Delete "${p.name}"?`, [
        {label: 'attribute ratings', items: attrRatings},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const r of attrRatings) await apiDelete('/api/attribute-ratings', r.id);
        await apiDelete('/api/attributes', p.id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const r of attrRatings) removeFromStore(attributeRatings, r.id);
    removeFromStore(attrItems, p.id);
    attrItems.editing_field = null;
    attrItems.selected = null;
    if (offline) {
        lsFlush(lsKey('/api/attribute-ratings'), attributeRatings.list);
        lsFlush(lsKey('/api/attributes'), attrItems.list);
    }
}

async function cascadeDeleteIdea(p) {
    const attRatings = attributeRatings.list.filter(r => r.idea_id === p.id);
    const critRatings = criteriaRatings.list.filter(r => r.idea_id === p.id);
    const piLinks = portfolioItemIdeas.list.filter(r => r.idea_id === p.id);

    const confirmed = await showCascadeConfirm(`Delete "${p.name}"?`, [
        {label: 'attribute ratings', items: attRatings},
        {label: 'criteria ratings', items: critRatings},
        {label: 'portfolio links', items: piLinks},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const r of attRatings) await apiDelete('/api/attribute-ratings', r.id);
        for (const r of critRatings) await apiDelete('/api/criteria-ratings', r.id);
        for (const l of piLinks) await apiDelete('/api/portfolio-item-ideas', l.id);
        await apiDelete('/api/ideas', p.id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const r of attRatings) removeFromStore(attributeRatings, r.id);
    for (const r of critRatings) removeFromStore(criteriaRatings, r.id);
    for (const l of piLinks) removeFromStore(portfolioItemIdeas, l.id);
    removeFromStore(ideas, p.id);
    ideas.editing_field = null;
    ideas.editing_rating = null;
    ideas.selected = null;
    if (offline) {
        lsFlush(lsKey('/api/attribute-ratings'), attributeRatings.list);
        lsFlush(lsKey('/api/criteria-ratings'), criteriaRatings.list);
        lsFlush(lsKey('/api/portfolio-item-ideas'), portfolioItemIdeas.list);
        lsFlush(lsKey('/api/ideas'), ideas.list);
    }
}

async function cascadeDeleteCriterion(id) {
    const crit = criteria.list.find(c => c.id === id);
    if (!crit) return;
    const critRatings = criteriaRatings.list.filter(r => r.crit_id === id);

    const confirmed = await showCascadeConfirm(`Delete "${crit.name}"?`, [
        {label: 'criteria ratings', items: critRatings},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const r of critRatings) await apiDelete('/api/criteria-ratings', r.id);
        await apiDelete('/api/criteria', id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const r of critRatings) removeFromStore(criteriaRatings, r.id);
    removeFromStore(criteria, id);
    criteria.editing = null;
    if (offline) {
        lsFlush(lsKey('/api/criteria-ratings'), criteriaRatings.list);
        lsFlush(lsKey('/api/criteria'), criteria.list);
    }
}

async function cascadeDeletePortfolioItem(p) {
    const piMilestones = milestones.list.filter(m => m.portfolio_item_id === p.id);
    const msIds = new Set(piMilestones.map(m => m.id));
    const msDeps = milestoneDeps.list.filter(d => msIds.has(d.milestone_id) || msIds.has(d.depends_on_id));
    const msTasks = tasks.list.filter(t => msIds.has(t.milestone_id));
    const msTaskIds = new Set(msTasks.map(t => t.id));
    const depTasks = tasks.list.filter(t => t.depends_on_id && msTaskIds.has(t.depends_on_id) && !msTaskIds.has(t.id));
    const allTasks = [...new Map([...msTasks, ...depTasks].map(t => [t.id, t])).values()];
    const piLinks = portfolioItemIdeas.list.filter(r => r.portfolio_item_id === p.id);

    const confirmed = await showCascadeConfirm(`Delete "${p.name}"?`, [
        {label: 'portfolio-idea links', items: piLinks},
        {label: 'milestones', items: piMilestones, preview: m => m.goal.slice(0, 40)},
        {label: 'milestone dependencies', items: msDeps},
        {label: 'tasks', items: allTasks, preview: t => t.description.slice(0, 40)},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const t of allTasks) await apiDelete('/api/tasks', t.id);
        for (const d of msDeps) await apiDelete('/api/milestone-deps', d.id);
        for (const m of piMilestones) await apiDelete('/api/milestones', m.id);
        for (const l of piLinks) await apiDelete('/api/portfolio-item-ideas', l.id);
        await apiDelete('/api/portfolio-items', p.id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const t of allTasks) removeFromStore(tasks, t.id);
    for (const d of msDeps) removeFromStore(milestoneDeps, d.id);
    for (const m of piMilestones) removeFromStore(milestones, m.id);
    for (const l of piLinks) removeFromStore(portfolioItemIdeas, l.id);
    removeFromStore(portfolioItems, p.id);
    portfolioItems.editing_field = null;
    portfolioItems.selected = null;
    milestones.editing_field = null;
    if (milestones.selected && msIds.has(milestones.selected.id)) milestones.selected = null;
    tasks.editing_field = null;
    if (tasks.selected && msTaskIds.has(tasks.selected.id)) tasks.selected = null;
    if (offline) {
        lsFlush(lsKey('/api/tasks'), tasks.list);
        lsFlush(lsKey('/api/milestone-deps'), milestoneDeps.list);
        lsFlush(lsKey('/api/milestones'), milestones.list);
        lsFlush(lsKey('/api/portfolio-item-ideas'), portfolioItemIdeas.list);
        lsFlush(lsKey('/api/portfolio-items'), portfolioItems.list);
    }
}

async function cascadeDeleteMilestone(p) {
    const msDeps = milestoneDeps.list.filter(d => d.milestone_id === p.id || d.depends_on_id === p.id);
    const msTasks = tasks.list.filter(t => t.milestone_id === p.id);
    const msTaskIds = new Set(msTasks.map(t => t.id));
    const depTasks = tasks.list.filter(t => t.depends_on_id && msTaskIds.has(t.depends_on_id) && !msTaskIds.has(t.id));
    const allTasks = [...new Map([...msTasks, ...depTasks].map(t => [t.id, t])).values()];

    const confirmed = await showCascadeConfirm(`Delete "${p.goal}"?`, [
        {label: 'milestone dependencies', items: msDeps},
        {label: 'tasks', items: allTasks, preview: t => t.description.slice(0, 40)},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const t of allTasks) await apiDelete('/api/tasks', t.id);
        for (const d of msDeps) await apiDelete('/api/milestone-deps', d.id);
        await apiDelete('/api/milestones', p.id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const t of allTasks) removeFromStore(tasks, t.id);
    for (const d of msDeps) removeFromStore(milestoneDeps, d.id);
    removeFromStore(milestones, p.id);
    milestones.editing_field = null;
    milestones.selected = null;
    tasks.editing_field = null;
    if (tasks.selected && msTaskIds.has(tasks.selected.id)) tasks.selected = null;
    if (offline) {
        lsFlush(lsKey('/api/tasks'), tasks.list);
        lsFlush(lsKey('/api/milestone-deps'), milestoneDeps.list);
        lsFlush(lsKey('/api/milestones'), milestones.list);
    }
}

async function cascadeDeleteTask(t) {
    const depTasks = tasks.list.filter(x => x.depends_on_id === t.id);

    const confirmed = await showCascadeConfirm(`Delete "${t.description}"?`, [
        {label: 'dependent tasks', items: depTasks, preview: x => x.description.slice(0, 40)},
    ]);
    if (!confirmed) return;

    if (!offline) {
    if (!testing) {  //testing
    try {
        for (const dt of depTasks) await apiDelete('/api/tasks', dt.id);
        await apiDelete('/api/tasks', t.id);
    } catch (err) {
        alert("Could not complete deletion.");
        return;
    }
    } //testing
    }

    for (const dt of depTasks) removeFromStore(tasks, dt.id);
    removeFromStore(tasks, t.id);
    tasks.editing_field = null;
    tasks.selected = null;
    if (offline) lsFlush(lsKey('/api/tasks'), tasks.list);
}
