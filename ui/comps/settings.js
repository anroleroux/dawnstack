const SETTINGS_KEY = 'dawnstack_settings';
const SETTINGS_DEFAULTS = {milestoneWip: 2, taskWip: 1, geminiApiKey: '', populateAttributeRatings: false, populateCriteriaRatings: false};

function getSettings() {
    try {
        return Object.assign({}, SETTINGS_DEFAULTS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    } catch { return {...SETTINGS_DEFAULTS}; }
}

function settingsTemplate(state) {
    return `
    <form class="item-card item-card--detail" onsubmit="saveSettingsForm(event)">
        <div class="add-form">
            <div class="add-form__field--row">
                <div class="add-form__field">
                    <label>Milestone WIP limit</label>
                    <input name="milestoneWip" type="number" min="1" max="20" step="1" value="${state.milestoneWip}" required>
                </div>
                <div class="add-form__field">
                    <label>Task WIP limit</label>
                    <input name="taskWip" type="number" min="1" max="20" step="1" value="${state.taskWip}" required>
                </div>
            </div>
            <div class="add-form__field">
                <label>Gemini API key</label>
                <input name="geminiApiKey" type="password" value="${state.geminiApiKey}" autocomplete="off" placeholder="AIza…">
            </div>
            <div class="add-form__field">
                <label class="settings-toggle">
                    <input name="populateAttributeRatings" type="checkbox" ${state.populateAttributeRatings ? 'checked' : ''}>
                    Populate attribute ratings via Gemini
                </label>
            </div>
            <div class="add-form__field">
                <label class="settings-toggle">
                    <input name="populateCriteriaRatings" type="checkbox" ${state.populateCriteriaRatings ? 'checked' : ''}>
                    Populate criteria ratings via Gemini
                </label>
            </div>
        </div>
        <div class="item-card__actions">
            <button class="start-btn" type="submit">Save</button>
            ${state.saved ? '<span style="margin-left:8px">Saved.</span>' : ''}
        </div>
    </form>`;
}

var appSettings = mount(
    document.getElementById('settings-form'),
    {...getSettings(), saved: false},
    settingsTemplate
);

function saveSettingsForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const milestoneWip             = Math.max(1, parseInt(fd.get('milestoneWip'), 10) || 3);
    const taskWip                  = Math.max(1, parseInt(fd.get('taskWip'),      10) || 2);
    const geminiApiKey             = fd.get('geminiApiKey') || '';
    const populateAttributeRatings = fd.get('populateAttributeRatings') === 'on';
    const populateCriteriaRatings  = fd.get('populateCriteriaRatings')  === 'on';
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({milestoneWip, taskWip, geminiApiKey, populateAttributeRatings, populateCriteriaRatings}));
    appSettings.milestoneWip             = milestoneWip;
    appSettings.taskWip                  = taskWip;
    appSettings.geminiApiKey             = geminiApiKey;
    appSettings.populateAttributeRatings = populateAttributeRatings;
    appSettings.populateCriteriaRatings  = populateCriteriaRatings;
    appSettings.saved = true;
    milestones._lv++;
    setTimeout(() => { appSettings.saved = false; }, 2000);
}
