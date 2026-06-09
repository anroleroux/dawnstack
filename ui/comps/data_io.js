function exportData() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('unlog_'));
    const data = {};
    for (const k of keys) {
        try { data[k] = JSON.parse(localStorage.getItem(k)); }
        catch { data[k] = localStorage.getItem(k); }
    }
    const json = JSON.stringify({version: 1, exported: new Date().toISOString(), data}, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unlog-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const parsed = JSON.parse(ev.target.result);
            const data = parsed.data || parsed;
            for (const [k, v] of Object.entries(data)) {
                if (k.startsWith('unlog_')) {
                    localStorage.setItem(k, JSON.stringify(v));
                }
            }
            location.reload();
        } catch {
            alert('Could not import: invalid file format.');
        }
    };
    reader.readAsText(file);
}

if (offline) {
    document.getElementById('nav-io').hidden = false;
}
