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

    console.group('Multiple milestones within one portfolio item');

    // High-PI (priority 9) has THREE milestones, Low-PI (priority 3) has ONE.
    // Schedule starts 2026-01-01. Cursor accumulates globally.
    //
    //   M201: 2 tasks → 4 d  → scheduledDate 2026-01-05  (no deadline)
    //   M202: 5 tasks → 10 d → scheduledDate 2026-01-15  (no deadline)
    //   M203: 0 tasks → 14 d → scheduledDate 2026-01-29  (deadline 2026-04-01)
    //   M101: 1 task  → 2 d  → scheduledDate 2026-01-31  (deadline 2026-06-01)

    const data2 = {
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
            {id: 201, portfolio_item_id: 2, goal: 'Ship alpha',     date: null},
            {id: 202, portfolio_item_id: 2, goal: 'Ship beta',      date: null},
            {id: 203, portfolio_item_id: 2, goal: 'GA release',     date: '2026-04-01'},
            {id: 101, portfolio_item_id: 1, goal: 'First campaign', date: '2026-06-01'},
        ],
        tasks: [
            {id: 1, milestone_id: 201},
            {id: 2, milestone_id: 201},
            {id: 3, milestone_id: 202},
            {id: 4, milestone_id: 202},
            {id: 5, milestone_id: 202},
            {id: 6, milestone_id: 202},
            {id: 7, milestone_id: 202},
            {id: 8, milestone_id: 101},
        ],
        deps: [],
    };

    const s2 = buildGanttSchedule(data2, { today: '2026-01-01' });
    assert('schedule is not null',              s2 !== null);
    assert('two rows returned',                 s2 && s2.rows.length === 2);
    assert('High-PI row is first',              s2 && s2.rows[0].pi.id === 2);
    assert('High-PI row has 3 items',           s2 && s2.rows[0].items.length === 3);
    assert('Low-PI row has 1 item',             s2 && s2.rows[1].items.length === 1);

    const [m201, m202, m203] = s2 ? s2.rows[0].items : [];
    const [m101]             = s2 ? s2.rows[1].items : [];

    assert('M201 (2 tasks=4d): scheduled 2026-01-05',  m201 && ymd(m201.scheduledDate) === '2026-01-05');
    assert('M201 has no deadline',                      m201 && m201.deadline === null);
    assert('M202 (5 tasks=10d): scheduled 2026-01-15', m202 && ymd(m202.scheduledDate) === '2026-01-15');
    assert('M202 has no deadline',                      m202 && m202.deadline === null);
    assert('M203 (0 tasks=14d): scheduled 2026-01-29', m203 && ymd(m203.scheduledDate) === '2026-01-29');
    assert('M203 deadline is 2026-04-01',               m203 && m203.deadline instanceof Date && ymd(m203.deadline) === '2026-04-01');
    assert('M101 (1 task=2d): scheduled 2026-01-31',   m101 && ymd(m101.scheduledDate) === '2026-01-31');
    assert('M101 deadline is 2026-06-01',               m101 && m101.deadline instanceof Date && ymd(m101.deadline) === '2026-06-01');

    console.groupEnd();
    console.groupEnd();
    console.log('Gantt tests: ' + passed + ' passed, ' + failed + ' failed');
}
