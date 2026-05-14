function runGanttTests() {
    let passed = 0, failed = 0;

    function assert(name, cond) {
        if (cond) { console.log('  ✓ ' + name); passed++; }
        else       { console.error('  ✗ ' + name); failed++; }
    }

    console.group('Gantt scheduling tests');
    console.group('Happy-day: priority ordering and work duration');

    // High-PI (priority 9) has one milestone with no deadline and 3 tasks (6 days).
    // Low-PI  (priority 3) has one milestone with a deadline and no tasks (14 days).
    // Schedule starts 2026-01-01.
    // Expected: High milestone scheduled first → 2026-01-07 (6 days)
    //           Low milestone scheduled next  → 2026-01-21 (14 days after)
    const data = {
        portfolioItems: [
            {id: 1, name: 'Low-PI',  type: 'product'},
            {id: 2, name: 'High-PI', type: 'product'},
        ],
        portfolioItemIdeas: [
            {portfolio_item_id: 1, idea_id: 10},
            {portfolio_item_id: 2, idea_id: 20},
        ],
        attributeRatings: [
            {idea_id: 10, score: 3},
            {idea_id: 20, score: 9},
        ],
        criteriaRatings: [],
        milestones: [
            {id: 101, portfolio_item_id: 1, goal: 'Low milestone',  date: '2026-08-01'},
            {id: 201, portfolio_item_id: 2, goal: 'High milestone', date: null},
        ],
        tasks: [
            {id: 1, milestone_id: 201},
            {id: 2, milestone_id: 201},
            {id: 3, milestone_id: 201},
        ],
        deps: [],
    };

    const s = buildGanttSchedule(data, { today: '2026-01-01' });
    assert('schedule is not null',               s !== null);
    assert('two rows returned',                  s && s.rows.length === 2);
    assert('High-PI row is first (priority 9)',  s && s.rows[0].pi.id === 2);
    assert('Low-PI row is second (priority 3)',  s && s.rows[1].pi.id === 1);

    const highItem = s && s.rows[0].items[0];
    const lowItem  = s && s.rows[1].items[0];

    assert('undated milestone is scheduled',          highItem && highItem.scheduledDate instanceof Date);
    assert('undated milestone has no deadline',        highItem && highItem.deadline === null);
    assert('dated milestone has a deadline',           lowItem  && lowItem.deadline instanceof Date);
    const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    assert('High milestone: 3 tasks → 6 days from start', highItem && ymd(highItem.scheduledDate) === '2026-01-07');
    assert('Low milestone: no tasks → 14 days after',     lowItem  && ymd(lowItem.scheduledDate)  === '2026-01-21');

    console.groupEnd();
    console.groupEnd();
    console.log('Gantt tests: ' + passed + ' passed, ' + failed + ' failed');
}
