function ganttChart() {
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const LABEL_W = 150, ROW_H = 72, HEADER_H = 30, PAD_X = 16, MR = 5, SVG_W = 800;
    const X0 = LABEL_W + PAD_X, X1 = SVG_W - PAD_X;
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Effective date: max(own date, all deps' effective dates). Memoised; cycle-safe.
    const memo = new Map();
    function computeDate(id, anc = new Set()) {
        if (memo.has(id)) return memo.get(id);
        if (anc.has(id)) return null;
        const m = milestones.list.find(m => m.id === id);
        if (!m || !m.date) { memo.set(id, null); return null; }
        const own = new Date(m.date);
        const next = new Set(anc); next.add(id);
        const r = milestoneDeps.list
            .filter(d => d.milestone_id === id)
            .reduce((lat, d) => {
                const dd = computeDate(d.depends_on_id, next);
                return dd && dd > lat ? dd : lat;
            }, own);
        memo.set(id, r);
        return r;
    }

    // One row per portfolio item that has at least one datable milestone
    const rows = portfolioItems.list
        .map(pi => ({
            pi,
            items: milestones.list
                .filter(m => m.portfolio_item_id === pi.id)
                .map(m => ({ m, date: computeDate(m.id) }))
                .filter(x => x.date)
                .sort((a, b) => a.date - b.date),
        }))
        .filter(r => r.items.length);

    if (!rows.length) return '<p class="item-card__empty">No milestones to chart.</p>';

    const allDates = rows.flatMap(r => r.items.map(x => x.date));
    const mn = new Date(Math.min(...allDates));
    const mx = new Date(Math.max(...allDates));
    // X-axis: start of earliest month → 2 months after latest
    const minD = new Date(mn.getFullYear(), mn.getMonth(), 1);
    const maxD = new Date(mx.getFullYear(), mx.getMonth() + 2, 1);
    const span = maxD - minD;

    const toX  = d => X0 + ((d - minD) / span) * (X1 - X0);
    const rowY = i => HEADER_H + i * ROW_H + ROW_H / 2;
    const svgH = HEADER_H + rows.length * ROW_H + 10;

    const months = [];
    for (let d = new Date(minD); d < maxD; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
        months.push(new Date(d));

    let s = `<svg viewBox="0 0 ${SVG_W} ${svgH}" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;display:block;font-family:inherit;overflow:visible">
      <defs>
        <marker id="garr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 Z" fill="#6ea8d8"/>
        </marker>
      </defs>`;

    // Month gridlines + labels
    for (const mo of months) {
        const x = toX(mo).toFixed(1);
        s += `<line x1="${x}" y1="${HEADER_H - 4}" x2="${x}" y2="${svgH - 8}" stroke="#eee" stroke-width="1"/>
              <text x="${(+x + 4).toFixed(1)}" y="18" fill="#bbb" font-size="10">${MON[mo.getMonth()]} ${mo.getFullYear()}</text>`;
    }

    // Lanes, labels, milestone markers
    rows.forEach(({ pi, items }, i) => {
        const y = rowY(i);
        s += `<line x1="${LABEL_W}" y1="${y}" x2="${X1}" y2="${y}" stroke="#ebebeb" stroke-width="1"/>
              <text x="${LABEL_W - 8}" y="${y + 4}" text-anchor="end" fill="#555" font-size="12" font-weight="500">${esc(pi.name)}</text>`;
        items.forEach(({ m, date }, j) => {
            const x  = toX(date).toFixed(1);
            const up = j % 2 === 0;
            s += `<circle cx="${x}" cy="${y}" r="${MR}" fill="#4a90d9" stroke="#fff" stroke-width="2"/>
                  <text x="${x}" y="${up ? y - MR - 6  : y + MR + 14}" text-anchor="middle" fill="#333" font-size="11">${esc(m.goal)}</text>
                  <text x="${x}" y="${up ? y - MR - 16 : y + MR + 24}" text-anchor="middle" fill="#bbb" font-size="9">${date.toISOString().slice(0, 10)}</text>`;
        });
    });

    // Dependency arrows (dashed bezier from source marker edge to target marker edge)
    for (const dep of milestoneDeps.list) {
        const src = milestones.list.find(m => m.id === dep.depends_on_id);
        const tgt = milestones.list.find(m => m.id === dep.milestone_id);
        if (!src || !tgt) continue;
        const ri = rows.findIndex(r => r.pi.id === src.portfolio_item_id);
        const rj = rows.findIndex(r => r.pi.id === tgt.portfolio_item_id);
        if (ri === -1 || rj === -1) continue;
        const x1 = toX(computeDate(src.id)), y1 = rowY(ri);
        const x2 = toX(computeDate(tgt.id)), y2 = rowY(rj);
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
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="deleteMilestone(milestones.selected)">Delete</button>
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

    const rowTemplate = (p, pid) => `
        <div class="item-row" onclick="selectMilestone(${pid})">
            <div class="item-row__main">
                <span class="item-row__name">${p.goal}</span>
                <span class="item-row__category">${portfolioItemName(p.portfolio_item_id)}</span>
            </div>
            <div class="item-row__meta">
                <span class="item-row__score">${p.date}</span>
            </div>
        </div>
    `;

    if (state.selected) return milestoneTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    if (state.view === 'chart') return `
        <div class="items-toolbar">
            <button class="nav-btn" type="button" onclick="showPage('milestone-deps')" style="margin-right:auto">Dependencies</button>
            <button class="nav-btn" type="button" onclick="milestones.view='list'">&#8592; List</button>
        </div>
        ${ganttChart()}
    `;
    return `
        <div class="items-toolbar">
            <button class="nav-btn" type="button" onclick="showPage('milestone-deps')" style="margin-right:auto">Dependencies</button>
            <button class="nav-btn" type="button" onclick="milestones.view='chart'">Chart</button>
            <button class="start-btn" type="button" onclick="milestones.adding=true">+ Add milestone</button>
        </div>
        ${state.list.map((p, pid) => rowTemplate(p, pid)).join("")}
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
        const userId = getCurrentUserId();
        const headers = userId ? { "X-User-Id": userId } : {};
        const response = await fetch(`/api/milestones/${p.id}`, { method: "DELETE", headers });
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
        const userId = getCurrentUserId();
        const headers = { "Content-Type": "application/json" };
        if (userId) headers["X-User-Id"] = userId;
        const response = await fetch("/api/milestones", {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to save milestone");
        const saved = await response.json();
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

async function loadMilestones() {
    const list = document.getElementById("milestones-list");
    list.innerHTML = "<li>Loading milestones...</li>";

    if (!testing) {  //testing
    try {
        const userId = getCurrentUserId();
        const headers = userId ? { "X-User-Id": userId } : {};
        const response = await fetch("/api/milestones", { headers });
        if (!response.ok) {
        throw new Error("Failed to fetch milestones");
        }
        const fetched = await response.json();

        if (!fetched.length) {
        list.innerHTML = "<li>No milestones found.</li>";
        return;
        }

        list.innerHTML = "";
        milestones.list = [];
        milestones.selected = null;
        fetched.forEach((p) => {
        milestones.list.push(p);
        });

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
