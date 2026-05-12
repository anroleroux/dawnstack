function runGanttTests() {
    let passed = 0, failed = 0;

    function assert(name, cond) {
        if (cond) { console.log('  ✓ ' + name); passed++; }
        else       { console.error('  ✗ ' + name); failed++; }
    }

    // Replaces all reactive list state with mock data, runs fn(), then restores.
    function withMockState(mocks, fn) {
        const stores = { milestones, milestoneDeps, portfolioItems, portfolioItemIdeas, attributeRatings, criteriaRatings };
        const saved  = {};
        Object.keys(stores).forEach(k => {
            saved[k] = [...stores[k].list];
            stores[k].list.length = 0;
            (mocks[k] || []).forEach(x => stores[k].list.push(x));
        });
        try { return fn(); } finally {
            Object.keys(stores).forEach(k => {
                stores[k].list.length = 0;
                saved[k].forEach(x => stores[k].list.push(x));
            });
        }
    }

    console.group('Gantt scheduling tests');

    // Rule 6: two milestones on different portfolio items with overlapping work
    // windows should be scheduled after each other when MILESTONE_WIP = 1.
    console.group('Rule 6: milestone WIP limit');
    withMockState({
        portfolioItems:     [{id:101, name:'High-PI', type:'product'}, {id:102, name:'Low-PI', type:'product'}],
        portfolioItemIdeas: [{id:1, portfolio_item_id:101, idea_id:1001}, {id:2, portfolio_item_id:102, idea_id:1002}],
        attributeRatings:   [{id:1, idea_id:1001, att_id:1, score:9}, {id:2, idea_id:1002, att_id:1, score:3}],
        criteriaRatings:    [],
        milestones: [
            {id:201, portfolio_item_id:101, goal:'High milestone', date:'2026-08-15'},
            {id:202, portfolio_item_id:102, goal:'Low milestone',  date:'2026-08-22'},
        ],
        milestoneDeps: [],
    }, () => {
        // WORK_DAYS=14: M-201 workStart=Aug 1, M-202 workStart=Aug 8 → 7-day overlap
        const s = buildGanttSchedule({ milestoneWip: 1, taskWip: 1 });
        assert('schedule is not null', s !== null);
        const allItems = s ? s.rows.flatMap(r => r.items) : [];
        const high = allItems.find(x => x.m.id === 201);
        const low  = allItems.find(x => x.m.id === 202);
        assert('high-priority milestone is scheduled (not wipExceeded)', high && !high.wipExceeded);
        assert('low-priority milestone is deferred (wipExceeded)',        low  &&  low.wipExceeded);
    });
    console.groupEnd();

    // Rules 6+7: two milestones on the SAME portfolio item with overlapping work
    // windows both fit when MILESTONE_WIP = 2, and TASK_WIP = 1 means their tasks
    // are interleaved one-at-a-time within the overlap period.
    console.group('Rules 6+7: concurrent milestones with task interleaving');
    withMockState({
        portfolioItems:     [{id:101, name:'PI', type:'product'}],
        portfolioItemIdeas: [{id:1, portfolio_item_id:101, idea_id:1001}],
        attributeRatings:   [{id:1, idea_id:1001, att_id:1, score:7}],
        criteriaRatings:    [],
        milestones: [
            {id:301, portfolio_item_id:101, goal:'M-early', date:'2026-09-01'},
            {id:302, portfolio_item_id:101, goal:'M-late',  date:'2026-09-08'},
        ],
        milestoneDeps: [],
    }, () => {
        // WORK_DAYS=14: M-301 workStart=Aug 18, M-302 workStart=Aug 25
        // Overlap window: Aug 25–Sep 1 (7 days) — both milestones in progress
        const s = buildGanttSchedule({ milestoneWip: 2, taskWip: 1 });
        assert('schedule is not null', s !== null);
        const allItems = s ? s.rows.flatMap(r => r.items) : [];
        const m1 = allItems.find(x => x.m.id === 301);
        const m2 = allItems.find(x => x.m.id === 302);
        assert('first milestone fits within WIP limit (not wipExceeded)',  m1 && !m1.wipExceeded);
        assert('second milestone fits within WIP limit (not wipExceeded)', m2 && !m2.wipExceeded);
        assert('work windows overlap (both milestones in progress simultaneously)',
            m1 && m2 && m2.workStart < m1.date && m1.workStart < m2.date);
        assert('task WIP limit is 1 (tasks interleaved one at a time)', s && s.TASK_WIP === 1);
    });
    console.groupEnd();

    console.groupEnd();
    console.log('Gantt tests: ' + passed + ' passed, ' + failed + ' failed');
    portfolioItems._lv++;
}
