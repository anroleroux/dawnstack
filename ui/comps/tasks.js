function taskName(id) {
    const t = tasks.list.find(t => t.id === id);
    return t ? t.description : '—';
}

function taskStatusBadge(status) {
    const colors = {
        pending: { bg: '#f5f5f5', color: '#888'    },
        busy:    { bg: '#fff8e1', color: '#f59e0b'  },
        done:    { bg: '#e6f4ea', color: '#2d7a3a'  },
    };
    const c = colors[status] || colors.pending;
    return `<span style="font-size:0.78rem;background:${c.bg};color:${c.color};border-radius:4px;padding:0.2rem 0.5rem;">${status}</span>`;
}

function tasksTemplate(state) {
    const taskTemplate = (t) => {
        const mr = 'tasks', api = '/api/tasks';
        const depOptions = [{value: '', label: 'None'}].concat(
            tasks.list
                .filter(x => x.id !== t.id)
                .map(x => ({value: x.id, label: x.description.slice(0, 60)}))
        );
        return `
        <div class="item-card item-card--detail">
            <div class="item-card__header">
                <span class="item-card__category">${milestoneName(t.milestone_id)} &mdash; ${taskStatusBadge(t.status)}</span>
                <button class="back-btn" type="button" onclick="tasks.selected=null;tasks.editing_field=null">&#8592; Back</button>
            </div>
            <div class="item-card__fields">
                ${editableField(mr, api, 'Description',  'description',  t.description,                'text')}
                ${editableField(mr, api, 'Milestone',    'milestone_id', milestoneName(t.milestone_id), 'select', milestones.list.map(m => ({value: m.id, label: m.goal})))}
                ${editableField(mr, api, 'Status',       'status',       t.status,                      'select', [
                    {value: 'pending', label: 'Pending'},
                    {value: 'busy',    label: 'Busy'},
                    {value: 'done',    label: 'Done'},
                ])}
                ${editableField(mr, api, 'Depends on',   'depends_on_id', taskName(t.depends_on_id),   'select', depOptions)}
            </div>
            <div class="item-card__section">
                <span class="item-card__section-label">Timestamps</span>
                <div class="editable-field">
                    <label class="editable-field__label">Created</label>
                    <span class="editable-field__value">${t.created_at || '—'}</span>
                </div>
                <div class="editable-field">
                    <label class="editable-field__label">Started</label>
                    <span class="editable-field__value">${t.started_at || '—'}</span>
                </div>
                <div class="editable-field">
                    <label class="editable-field__label">Completed</label>
                    <span class="editable-field__value">${t.completed_at || '—'}</span>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="delete-btn" type="button" onclick="cascadeDeleteTask(tasks.selected)">Delete</button>
            </div>
        </div>
        `;
    };

    const addFormTemplate = () => `
        <form class="item-card item-card--detail" onsubmit="saveTask(event)">
            <div class="item-card__header">
                <span class="item-card__category">New task</span>
                <button class="back-btn" type="button" onclick="tasks.adding=false">&#8592; Cancel</button>
            </div>
            <div class="add-form">
                <div class="add-form__field">
                    <label>Description</label>
                    <input name="description" type="text" required>
                </div>
                <div class="add-form__field">
                    <label>Milestone</label>
                    <select name="milestone_id" required>
                        <option value="">Select a milestone</option>
                        ${milestones.list.map(m => `<option value="${m.id}">${m.goal}</option>`).join("")}
                    </select>
                </div>
                <div class="add-form__field">
                    <label>Depends on (optional)</label>
                    <select name="depends_on_id">
                        <option value="">None</option>
                        ${tasks.list.map(t => `<option value="${t.id}">${t.description.slice(0, 60)}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="item-card__actions">
                <button class="start-btn" type="submit">Save</button>
            </div>
        </form>
    `;

    const rowTemplate = (t, tid) => `
        <div class="item-row" onclick="selectTask(${tid})">
            <div class="item-row__main">
                <span class="item-row__name">${t.description}</span>
                <span class="item-row__category">${milestoneName(t.milestone_id)}</span>
            </div>
            <div class="item-row__meta">
                ${taskStatusBadge(t.status)}
            </div>
        </div>
    `;

    if (state.selected) return taskTemplate(state.selected);
    if (state.adding)   return addFormTemplate();
    return `
        <div class="items-toolbar">
            <button class="start-btn" type="button" onclick="tasks.adding=true">+ Add task</button>
        </div>
        ${state.list.map((t, tid) => rowTemplate(t, tid)).join("")}
    `;
}

var tasks = mount(
    document.getElementById("tasks-list"),
    {list: [], selected: null, adding: false, editing_field: null},
    tasksTemplate
);

function selectTask(tid) {
    tasks.selected = tasks.list[tid];
}

async function deleteTask(t) {
    if (!testing) {  //testing
    try {
        let response;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            response = await fetch(`/api/tasks/${t.id}`, { method: "DELETE", headers });
        } else {
            response = await fetch(`${sbUrl('/api/tasks')}?id=eq.${t.id}`, { method: "DELETE", headers: sbHeaders() });
        }
        if (!response.ok) throw new Error("Failed to delete task");
        const idx = tasks.list.findIndex(item => item.id === t.id);
        if (idx !== -1) tasks.list.splice(idx, 1);
    } catch (err) {
        alert("Could not delete task.");
        return;
    }
    } else { //testing
        const idx = tasks.list.findIndex(item => item.id === t.id); //testing
        if (idx !== -1) tasks.list.splice(idx, 1); //testing
    } //testing
    tasks.editing_field = null;
    tasks.selected = null;
}

async function saveTask(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const depRaw = fd.get("depends_on_id");
    const data = {
        description:   fd.get("description"),
        milestone_id:  parseInt(fd.get("milestone_id"), 10),
        depends_on_id: depRaw ? parseInt(depRaw, 10) : null,
    };

    if (!testing) {  //testing
    try {
        let saved;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = { "Content-Type": "application/json" };
            if (userId) headers["X-User-Id"] = userId;
            const response = await fetch("/api/tasks", { method: "POST", headers, body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save task");
            saved = await response.json();
        } else {
            const response = await fetch(sbUrl('/api/tasks'), { method: "POST", headers: sbHeaders(true), body: JSON.stringify(data) });
            if (!response.ok) throw new Error("Failed to save task");
            saved = (await response.json())[0];
        }
        tasks.list.push(saved);
        tasks.adding = false;
    } catch (err) {
        alert("Could not save task.");
    }
    } else { //testing
        tasks.list.push({...data, id: Date.now(), status: 'pending', created_at: new Date().toISOString(), started_at: null, completed_at: null}); //testing
        tasks.adding = false; //testing
    } //testing
}

async function loadTasks() {
    const list = document.getElementById("tasks-list");
    list.innerHTML = "<li>Loading tasks...</li>";

    if (!testing) {  //testing
    try {
        let fetched;
        if (!supabase) {
            const userId = getCurrentUserId();
            const headers = userId ? { "X-User-Id": userId } : {};
            const response = await fetch("/api/tasks", { headers });
            if (!response.ok) throw new Error("Failed to fetch tasks");
            fetched = await response.json();
        } else {
            const response = await fetch(`${sbUrl('/api/tasks')}?order=milestone_id,id`, { headers: sbHeaders() });
            if (!response.ok) throw new Error("Failed to fetch tasks");
            fetched = await response.json();
        }
        list.innerHTML = "";
        tasks.list = [];
        tasks.selected = null;
        fetched.forEach(t => tasks.list.push(t));
    } catch (error) {
        list.innerHTML = "<li>Could not load tasks.</li>";
    }
    } else { //testing
        tasks.list.push( //testing
            {id:1, milestone_id:1, description:"Set up hosting and domain",  depends_on_id:null, status:"done",    created_at:"2026-05-01T10:00:00Z", started_at:"2026-05-01T10:00:00Z", completed_at:"2026-05-03T14:00:00Z"}, //testing
            {id:2, milestone_id:1, description:"Build landing page",          depends_on_id:1,    status:"busy",   created_at:"2026-05-03T09:00:00Z", started_at:"2026-05-03T14:00:00Z", completed_at:null}, //testing
            {id:3, milestone_id:1, description:"Write first blog post",        depends_on_id:null, status:"pending",created_at:"2026-05-06T08:00:00Z", started_at:null,                  completed_at:null}, //testing
            {id:4, milestone_id:2, description:"Draft post schedule",          depends_on_id:null, status:"pending",created_at:"2026-05-08T11:00:00Z", started_at:null,                  completed_at:null}, //testing
            {id:5, milestone_id:3, description:"Build CSV import parser",      depends_on_id:null, status:"busy",   created_at:"2026-05-05T09:00:00Z", started_at:"2026-05-05T09:00:00Z",completed_at:null}, //testing
            {id:6, milestone_id:4, description:"Write module 1 script",        depends_on_id:null, status:"pending",created_at:"2026-05-09T08:00:00Z", started_at:null,                  completed_at:null}  //testing
        ); //testing
    } //testing
    milestones._lv++;
}
