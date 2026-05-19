function buildGanttSchedule(data, config = {}) {
    const { milestones, deps, portfolioItems, portfolioItemIdeas, attributeRatings, criteriaRatings, tasks, attributes, attributeGroups, criteriaList } = data;

    function ideaScore(ideaId) {
        const attrScores = attributeRatings
            .filter(r => r.idea_id === ideaId)
            .map(r => {
                const attr  = attributes?.find(a => a.id === r.att_id);
                const group = attributeGroups?.find(g => g.id === attr?.att_group_id);
                return r.score * (attr?.weight ?? 1) * (group?.weight ?? 1);
            });
        const critScores = criteriaRatings
            .filter(r => r.idea_id === ideaId)
            .map(r => {
                const crit = criteriaList?.find(c => c.id === r.crit_id);
                return r.score * (crit?.weight ?? 1);
            });
        const scores = [...attrScores, ...critScores];
        return scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    }

    function piPriority(piId) {
        const ideaIds = portfolioItemIdeas
            .filter(r => r.portfolio_item_id === piId)
            .map(r => r.idea_id);
        const scores = ideaIds.map(ideaScore).filter(s => s !== null);
        return scores.length ? Math.max(...scores) : 0;
    }

    // Phase 2 — Duration estimation
    const avgTaskDuration      = config.avgTaskDuration      ?? 2;
    const avgTasksPerMilestone = config.avgTasksPerMilestone ?? 7;

    function remainingDuration(milestoneId) {
        const mTasks   = tasks.filter(t => t.milestone_id === milestoneId);
        const incomplete = mTasks.filter(t => t.status !== 'completed').length;
        if (mTasks.length === 0) return avgTasksPerMilestone * avgTaskDuration;
        return incomplete * avgTaskDuration;
    }

    const warnings = [];
    const suggestions = [];

    // Phase 1.1 — Topological sort & cycle detection (Kahn's algorithm)
    const milestoneIds = milestones.map(m => m.id);
    const inDegree = Object.fromEntries(milestoneIds.map(id => [id, 0]));
    const adjList  = Object.fromEntries(milestoneIds.map(id => [id, []]));
    for (const dep of deps) {
        if (inDegree[dep.depends_on_id] !== undefined && inDegree[dep.milestone_id] !== undefined) {
            adjList[dep.depends_on_id].push(dep.milestone_id);
            inDegree[dep.milestone_id]++;
        }
    }
    const queue  = milestoneIds.filter(id => inDegree[id] === 0);
    const sorted = [];
    while (queue.length) {
        const id = queue.shift();
        sorted.push(id);
        for (const succ of adjList[id]) {
            if (--inDegree[succ] === 0) queue.push(succ);
        }
    }
    const cyclicIds = new Set(milestoneIds.filter(id => !sorted.includes(id)));
    if (cyclicIds.size > 0)
        warnings.push({ type: 'cycle', milestoneIds: [...cyclicIds] });

    // Dep elevation: propagate max priority from dependents back to prerequisites
    const dependents = Object.fromEntries(milestoneIds.map(id => [id, []]));
    for (const dep of deps) {
        if (!cyclicIds.has(dep.depends_on_id) && !cyclicIds.has(dep.milestone_id))
            dependents[dep.depends_on_id].push(dep.milestone_id);
    }
    const effectivePriority = Object.fromEntries(
        milestones.filter(m => !cyclicIds.has(m.id)).map(m => [m.id, piPriority(m.portfolio_item_id)])
    );
    for (let i = sorted.length - 1; i >= 0; i--) {
        const id = sorted[i];
        for (const did of dependents[id])
            effectivePriority[id] = Math.max(effectivePriority[id], effectivePriority[did] ?? 0);
    }

    const start = new Date(config.today || Date.now());
    start.setHours(0, 0, 0, 0);

    // Phase 1.5 — Priority topological sort: greedily pick highest effective-priority
    // ready milestone at each step to build the global flat sequence.
    const priInDegree  = Object.fromEntries(sorted.map(id => [id, 0]));
    const sortedIndex  = Object.fromEntries(sorted.map((id, i) => [id, i]));
    for (const dep of deps) {
        if (!cyclicIds.has(dep.depends_on_id) && !cyclicIds.has(dep.milestone_id))
            priInDegree[dep.milestone_id]++;
    }

    const readyQ = sorted.filter(id => priInDegree[id] === 0)
        .sort((a, b) => (effectivePriority[b] ?? 0) - (effectivePriority[a] ?? 0) || sortedIndex[a] - sortedIndex[b]);

    const sequence = [];
    while (readyQ.length) {
        const id = readyQ.shift();
        sequence.push(id);
        for (const succ of adjList[id]) {
            if (cyclicIds.has(succ)) continue;
            if (--priInDegree[succ] === 0) {
                const ep = effectivePriority[succ] ?? 0;
                const si = sortedIndex[succ];
                let k = 0;
                while (k < readyQ.length) {
                    const o = readyQ[k];
                    if (ep > (effectivePriority[o] ?? 0) || (ep === (effectivePriority[o] ?? 0) && si < sortedIndex[o])) break;
                    k++;
                }
                readyQ.splice(k, 0, succ);
            }
        }
    }

    // Build flat item list, excluding completed milestones (remainingDuration = 0)
    const milestoneById = Object.fromEntries(milestones.map(m => [m.id, m]));
    const seqItems = sequence
        .filter(id => remainingDuration(id) > 0)
        .map(id => {
            const m = milestoneById[id];
            return { m, scheduledDate: new Date(start), deadline: m.date ? new Date(m.date) : null };
        });

    if (!seqItems.length) return { rows: [], sequence: [], minDate: start, maxDate: start, months: [], deps, warnings, suggestions };

    // Deadline protection: move items earlier in seqItems to prevent avoidable
    // breaches, logging a suggestion for each priority/deadline trade-off.
    function simEnds(itemList) {
        let c = new Date(start);
        return itemList.map(item => {
            c = new Date(+c + remainingDuration(item.m.id) * 86400000);
            return { item, end: new Date(c) };
        });
    }

    let reordered = true;
    while (reordered) {
        reordered = false;
        const sim = simEnds(seqItems);
        for (const { item, end } of sim) {
            if (!item.deadline || end <= item.deadline) continue;
            const ri = seqItems.indexOf(item);
            const depIds = deps
                .filter(d => d.milestone_id === item.m.id && !cyclicIds.has(d.depends_on_id))
                .map(d => d.depends_on_id);
            for (let j = ri - 1; j >= 0; j--) {
                if (depIds.some(did => seqItems.findIndex(x => x.m.id === did) >= j)) break;
                const candidate = [...seqItems];
                const [moved] = candidate.splice(ri, 1);
                candidate.splice(j, 0, moved);
                const testSim = simEnds(candidate);
                const testEnd = testSim.find(e => e.item === item).end;
                if (testEnd <= item.deadline) {
                    const before = sim.filter(e => e.item.deadline && e.end > e.item.deadline).length;
                    const after  = testSim.filter(e => e.item.deadline && e.end > e.item.deadline).length;
                    if (after <= before) {
                        suggestions.push({ type: 'priority-deadline', milestoneId: item.m.id });
                        seqItems.splice(ri, 1);
                        seqItems.splice(j, 0, moved);
                        reordered = true;
                        break;
                    }
                }
            }
            if (reordered) break;
        }
    }

    // Phase 3 — Schedule simulation: walk flat sequence, assign dates
    let cursor = new Date(start);
    for (const item of seqItems) {
        cursor = new Date(+cursor + remainingDuration(item.m.id) * 86400000);
        item.scheduledDate = new Date(cursor);
        if (item.deadline && cursor > item.deadline)
            warnings.push({ type: 'deadline', milestoneId: item.m.id, deadline: item.deadline, scheduledDate: cursor });
    }

    // Reconstruct PI rows from flat sequence, preserving global order within each row
    const rowMap = new Map(portfolioItems.map(pi => [pi.id, { pi, priority: 0, items: [] }]));
    for (const item of seqItems)
        rowMap.get(item.m.portfolio_item_id)?.items.push(item);
    const rows = [...rowMap.values()].filter(r => r.items.length > 0);
    for (const row of rows)
        row.priority = Math.max(0, ...row.items.map(item => effectivePriority[item.m.id] ?? 0));
    rows.sort((a, b) => seqItems.indexOf(a.items[0]) - seqItems.indexOf(b.items[0]));

    const allDates = rows.flatMap(r => r.items.map(x => x.scheduledDate));
    const mn = new Date(Math.min(...allDates));
    const mx = new Date(Math.max(...allDates));
    const minDate = new Date(mn.getFullYear(), mn.getMonth(), 1);
    const maxDate = new Date(mx.getFullYear(), mx.getMonth() + 2, 1);

    const months = [];
    for (let d = new Date(minDate); d < maxDate; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
        months.push(new Date(d));

    return { rows, sequence: seqItems, minDate, maxDate, months, deps, warnings, suggestions };
}

const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function ganttChart() {
    const schedule = buildGanttSchedule({
        milestones:         milestones.list,
        deps:               milestoneDeps.list,
        portfolioItems:     portfolioItems.list,
        portfolioItemIdeas: portfolioItemIdeas.list,
        attributeRatings:   attributeRatings.list,
        criteriaRatings:    criteriaRatings.list,
        tasks:              tasks.list,
        attributes:         attrItems.list,
        attributeGroups:    attributeGroups.list,
        criteriaList:       criteria.list,
    }, getSettings());
    if (!schedule || !schedule.sequence.length) return '<p class="item-card__empty">No milestones to chart.</p>';

    const { rows, minDate, maxDate, months, deps: dList } = schedule;
    const allItems = rows.flatMap(r => r.items);

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const LABEL_W = 150, ROW_H = 72, HEADER_H = 30, PAD_X = 16, MR = 5, SVG_W = 800;
    const X0 = LABEL_W + PAD_X, X1 = SVG_W - PAD_X;
    const span = maxDate - minDate;
    const toX  = d => X0 + ((d - minDate) / span) * (X1 - X0);
    const rowY = i => HEADER_H + i * ROW_H + ROW_H / 2;
    const svgH = HEADER_H + rows.length * ROW_H + 10;

    let s = `<svg viewBox="0 0 ${SVG_W} ${svgH}" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;display:block;font-family:inherit;overflow:visible">
      <defs>
        <marker id="garr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 Z" fill="#6ea8d8"/>
        </marker>
      </defs>`;

    for (const mo of months) {
        const x = toX(mo).toFixed(1);
        s += `<line x1="${x}" y1="${HEADER_H - 4}" x2="${x}" y2="${svgH - 8}" stroke="#eee" stroke-width="1"/>
              <text x="${(+x + 4).toFixed(1)}" y="18" fill="#bbb" font-size="10">${MON[mo.getMonth()]} ${mo.getFullYear()}</text>`;
    }

    rows.forEach(({ pi, items }, i) => {
        const y = rowY(i);
        s += `<line x1="${LABEL_W}" y1="${y}" x2="${X1}" y2="${y}" stroke="#ebebeb" stroke-width="1"/>
              <text x="${LABEL_W - 8}" y="${y + 4}" text-anchor="end" fill="#555" font-size="12" font-weight="500">${esc(pi.name)}</text>`;
        items.forEach(({ m, scheduledDate }, j) => {
            const x  = toX(scheduledDate);
            const up = j % 2 === 0;
            s += `<rect x="${x.toFixed(1)}" y="${y - 6}" width="0" height="12" rx="3" fill="#e8f2fc" stroke="#c0d8f0" stroke-width="1"/>
                  <circle cx="${x.toFixed(1)}" cy="${y}" r="${MR}" fill="#4a90d9" stroke="#fff" stroke-width="2"/>
                  <text x="${x.toFixed(1)}" y="${up ? y - MR - 6  : y + MR + 14}" text-anchor="middle" fill="#333" font-size="11">${esc(m.goal)}</text>
                  <text x="${x.toFixed(1)}" y="${up ? y - MR - 16 : y + MR + 24}" text-anchor="middle" fill="#bbb" font-size="9">${fmtDate(scheduledDate)}</text>`;
        });
    });

    for (const dep of dList) {
        const src = allItems.find(x => x.m.id === dep.depends_on_id);
        const tgt = allItems.find(x => x.m.id === dep.milestone_id);
        if (!src || !tgt) continue;
        const ri = rows.findIndex(r => r.pi.id === src.m.portfolio_item_id);
        const rj = rows.findIndex(r => r.pi.id === tgt.m.portfolio_item_id);
        if (ri === -1 || rj === -1) continue;
        const x1 = toX(src.scheduledDate), y1 = rowY(ri);
        const x2 = toX(tgt.scheduledDate), y2 = rowY(rj);
        if (Math.abs(x1 - x2) < 1 && ri === rj) continue;
        const dx = Math.min(40, (x2 - x1) * 0.4 + 8);
        s += `<path d="M${(x1+MR).toFixed(1)},${y1} C${(x1+dx).toFixed(1)},${y1} ${(x2-dx).toFixed(1)},${y2} ${(x2-MR).toFixed(1)},${y2}"
                   fill="none" stroke="#6ea8d8" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#garr)"/>`;
    }

    return s + '</svg>';
}

function milestonesTemplate(state) {
    const milestoneTemplate = (p) => {
        const mr = 'milestones', api = '/api/milestones';
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">${portfolioItemName(p.portfolio_item_id)}</span>
                <button class="back-btn" type="button" onclick="milestones.selected=null;milestones.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Goal',           'goal',              p.goal,                                'text')}
                ${editableField(mr, api, 'Portfolio item', 'portfolio_item_id', portfolioItemName(p.portfolio_item_id), 'select', portfolioItems.list.map(i => ({value: i.id, label: i.name})))}
                ${editableField(mr, api, 'Date',           'date',              p.date,                                'text')}
            </div>
            <div class="item-card__section">
                <span class="item-card__section-label">Dependencies</span>
                ${milestoneDeps.list
                    .filter(d => d.milestone_id === p.id)
                    .map(d => `
                <div class="editable-field">
                    <span class="editable-field__value">${milestoneName(d.depends_on_id)}</span>
                    <button class="delete-btn" type="button" onclick="removeMilestoneDep(${p.id},${d.depends_on_id})">Remove</button>
                </div>`).join("") || '<p class="item-card__empty">No dependencies.</p>'}
                <form class="editable-field editable-field--editing" onsubmit="addMilestoneDep(event,${p.id})">
                    <select class="editable-field__input" name="depends_on_id" required>
                        <option value="">Add dependency...</option>
                        ${milestones.list
                            .filter(m => m.id !== p.id && !milestoneDeps.list.some(d => d.milestone_id === p.id && d.depends_on_id === m.id))
                            .map(m => `<option value="${m.id}">${m.goal} (${portfolioItemName(m.portfolio_item_id)})</option>`).join("")}
                    </select>
                    <div class="editable-field__btns">
                        <button class="save-field-btn" type="submit">Add</button>
                    </div>
                </form>
            </div>
            <div class="item-card__section">
                <span class="item-card__section-label">Tasks</span>
                ${tasks.list
                    .filter(t => t.milestone_id === p.id)
                    .map(t => `
                <div class="editable-field">
                    ${taskStatusBadge(t.status)}
                    <span class="editable-field__value">${t.description}</span>
                </div>`).join("") || '<p class="item-card__empty">No tasks.</p>'}
                <form class="editable-field editable-field--editing" onsubmit="addTaskToMilestone(event,${p.id})">
                    <input class="editable-field__input" name="description" type="text" placeholder="New task..." required>
                    <div class="editable-field__btns">
                        <button class="save-field-btn" type="submit">Add</button>
                    </div>
                </form>
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="cascadeDeleteMilestone(milestones.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveMilestone(event)">
            <div class="item-card__header">
                <span class="item-card__category">New milestone</span>
                <button class="back-btn" type="button" onclick="milestones.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Goal</label>
                    <input name="goal" type="text" required>
                </div>
                <div class="add-form__field">
                    <label>Portfolio item</label>
                    <select name="portfolio_item_id" required>
                        <option value="">Select a portfolio item</option>
                        ${portfolioItems.list.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}
                    </select>
                </div>
                <div class="add-form__field">
                    <label>Date</label>
                    <input name="date" type="date" required>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Save</button>
            </div>
        </form>
    `;

    const rowTemplate = (p, pid) => {
        const score = portfolioItemTopPriority(p.portfolio_item_id);
        const scoreDisplay = score !== null ? score.toFixed(1) : '—';
        return `
        <div class="item-row" onclick="selectMilestone(${pid})">
            <div class="item-row__main">
                <span class="item-row__name">${p.goal}</span>
                <span class="item-row__category">${portfolioItemName(p.portfolio_item_id)}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${scoreDisplay}</span>
                <span class="item-row__category">${p.date}</span>
            </div>
        </div>
    `;};

    if (state.selected) return milestoneTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    if (state.view === 'chart') return `
        <div class="items-toolbar">
            <button class="nav-btn" type="button" onclick="milestones.view='list'">&#8592; List</button>
        </div>
        ${ganttChart()}
    `;
    return `
        <div class="items-toolbar">
            <button class="nav-btn" type="button" onclick="milestones.view='chart'">Chart</button>
            <button class="start-btn" type="button" onclick="milestones.adding=true">+ Add milestone</button>
        </div>
        ${[...state.list]
            .map((p, i) => ({p, i, score: portfolioItemTopPriority(p.portfolio_item_id) ?? -1}))
            .sort((a, b) => b.score - a.score)
            .map(({p, i}) => rowTemplate(p, i)).join("")}
    `;
}

var milestones = mount(
    document.getElementById("milestones-list"),
    {list: [], selected: null, adding: false, editing_field: null, _lv: 0, view: 'list'},
    milestonesTemplate
);

function selectMilestone(pid) {
    milestones.selected = milestones.list[pid];
}

async function deleteMilestone(p) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/milestones/${p.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/milestones')}?id=eq.${p.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete milestone");
        const idx = milestones.list.findIndex(item => item.id === p.id);
        if (idx !== -1) milestones.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete milestone.");
        return;
    }
    } else { //testing
        const idx = milestones.list.findIndex(item => item.id === p.id); //testing
        if (idx !== -1) milestones.list.splice(idx, 1); //testing
    } //testing
    milestones.editing_field = null;
    milestones.selected = null;
}

async function saveMilestone(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        goal:              fd.get("goal"),
        portfolio_item_id: parseInt(fd.get("portfolio_item_id"), 10),
        date:              fd.get("date"),
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/milestones", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save milestone");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/milestones'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save milestone");
            saved = (await response.json())[0];
        }
        milestones.list.push(saved);
        milestones.adding = false;
    } catch (err) {
        alert("Could not save milestone.");
    }
    } else { //testing
        milestones.list.push({...data, id: Date.now()}); //testing
        milestones.adding = false; //testing
    } //testing
}

async function addTaskToMilestone(e, milestoneId) {
    e.preventDefault();
    const description = new FormData(e.target).get("description");
    const data = {description, milestone_id: milestoneId, depends_on_id: null};

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = {"Content-Type": "application/json"};
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/tasks", {method: "POST", headers, body: JSON.stringify(data)});
            if (!response.ok) throw new Error("Failed to save task");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/tasks'), {method: "POST", headers: sbHeaders(true), body: JSON.stringify(data)});
            if (!response.ok) throw new Error("Failed to save task");
            saved = (await response.json())[0];
        }
        tasks.list.push(saved);
    } catch (err) {
        alert("Could not add task.");
        return;
    }
    } else { //testing
        tasks.list.push({...data, id: Date.now(), status: 'pending', created_at: new Date().toISOString(), started_at: null, completed_at: null}); //testing
    } //testing
    milestones._lv++;
}

async function loadMilestones() {
    const list = document.getElementById("milestones-list");
    list.innerHTML = "<li>Loading milestones...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/milestones", { headers });
            if (!response.ok) throw new Error("Failed to fetch milestones");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/milestones')}?order=date,id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch milestones");
            fetched = await response.json();
        }


        list.innerHTML = "";
        milestones.list = [];
        milestones.selected = null;
        fetched.forEach(p => milestones.list.push(p));

    } catch (error) {
        list.innerHTML = "<li>Could not load milestones.</li>";
    }
    } else { //testing
        milestones.list.push( //testing
            {id:1, portfolio_item_id:1, goal:"Launch MVP",        date:"2026-06-01"}, //testing
            {id:2, portfolio_item_id:1, goal:"Publish 10 posts",  date:"2026-07-01"}, //testing
            {id:3, portfolio_item_id:2, goal:"Import from CSV",   date:"2026-06-15"}, //testing
            {id:4, portfolio_item_id:3, goal:"Record module 1",   date:"2026-07-15"}, //testing
            {id:5, portfolio_item_id:3, goal:"Launch course",     date:"2026-09-01"}, //testing
            {id:6, portfolio_item_id:4, goal:"First paid client", date:"2026-08-01"}  //testing
        ); //testing
    } //testing
}
