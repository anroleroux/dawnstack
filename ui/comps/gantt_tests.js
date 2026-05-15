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

    // ── Rule 3 (deferred, NOT YET IMPLEMENTED) ───────────────────────────────
    // Dependencies inherit the priority of their dependents.
    // A lower-priority PI that sits early in a cross-PI chain must be elevated
    // to the effective priority of the highest downstream milestone and therefore
    // scheduled BEFORE the high-priority items that depend on it.
    //
    // Four-PI linear chain (start 2026-01-01):
    //
    //   PI-Seed  (priority 1)  M101  1 task = 2 d
    //       ↓ dep
    //   PI-Root  (priority 3)  M201  2 tasks = 4 d
    //       ↓ dep
    //   PI-Trunk (priority 6)  M301  3 tasks = 6 d
    //       ↓ dep
    //   PI-Fruit (priority 9)  M401  4 tasks = 8 d
    //       ↓ dep (within PI)
    //                          M402  2 tasks = 4 d
    //
    // With rule 3, effective priorities: Seed=9, Root=9, Trunk=9, Fruit=9.
    // Scheduling order respects deps: M101→M201→M301→M401→M402.
    // Expected scheduledDates:
    //   M101 2026-01-03  (+2d)
    //   M201 2026-01-07  (+4d)
    //   M301 2026-01-13  (+6d)
    //   M401 2026-01-21  (+8d)
    //   M402 2026-01-25  (+4d)
    //
    // WITHOUT rule 3 (current behaviour), PI-Fruit is scheduled first and
    // all assertions below about cross-PI ordering and dates WILL FAIL.
    // ─────────────────────────────────────────────────────────────────────────
    console.group('Cross-PI dependency chain — rule 3 dep elevation (deferred)');

    const data3 = {
        portfolioItems: [
            {id: 1, name: 'PI-Seed',  type: 'product'},
            {id: 2, name: 'PI-Root',  type: 'product'},
            {id: 3, name: 'PI-Trunk', type: 'product'},
            {id: 4, name: 'PI-Fruit', type: 'product'},
        ],
        portfolioItemIdeas: [
            {portfolio_item_id: 1, idea_id: 11},
            {portfolio_item_id: 2, idea_id: 12},
            {portfolio_item_id: 3, idea_id: 13},
            {portfolio_item_id: 4, idea_id: 14},
        ],
        attributeRatings: [
            {idea_id: 11, score: 1},
            {idea_id: 12, score: 3},
            {idea_id: 13, score: 6},
            {idea_id: 14, score: 9},
        ],
        criteriaRatings: [],
        milestones: [
            {id: 101, portfolio_item_id: 1, goal: 'Seed work',   date: null},
            {id: 201, portfolio_item_id: 2, goal: 'Root work',   date: null},
            {id: 301, portfolio_item_id: 3, goal: 'Trunk work',  date: null},
            {id: 401, portfolio_item_id: 4, goal: 'Fruit alpha', date: null},
            {id: 402, portfolio_item_id: 4, goal: 'Fruit beta',  date: null},
        ],
        tasks: [
            {id: 1,  milestone_id: 101},
            {id: 2,  milestone_id: 201},
            {id: 3,  milestone_id: 201},
            {id: 4,  milestone_id: 301},
            {id: 5,  milestone_id: 301},
            {id: 6,  milestone_id: 301},
            {id: 7,  milestone_id: 401},
            {id: 8,  milestone_id: 401},
            {id: 9,  milestone_id: 401},
            {id: 10, milestone_id: 401},
            {id: 11, milestone_id: 402},
            {id: 12, milestone_id: 402},
        ],
        deps: [
            {id: 1, milestone_id: 201, depends_on_id: 101},
            {id: 2, milestone_id: 301, depends_on_id: 201},
            {id: 3, milestone_id: 401, depends_on_id: 301},
            {id: 4, milestone_id: 402, depends_on_id: 401},
        ],
    };

    const s3 = buildGanttSchedule(data3, { today: '2026-01-01' });
    assert('schedule is not null',   s3 !== null);
    assert('four rows returned',     s3 && s3.rows.length === 4);

    const findItem3 = id => s3 ? s3.rows.flatMap(r => r.items).find(x => x.m.id === id) : null;
    const rowIdx3   = piId => s3 ? s3.rows.findIndex(r => r.pi.id === piId) : -1;

    const mSeed   = findItem3(101);
    const mRoot   = findItem3(201);
    const mTrunk  = findItem3(301);
    const mFruitA = findItem3(401);
    const mFruitB = findItem3(402);

    // Dep-elevated rows: PI-Seed (lowest own priority) must precede PI-Fruit (highest)
    assert('PI-Seed row precedes PI-Fruit row (dep elevation)',
        rowIdx3(1) !== -1 && rowIdx3(4) !== -1 && rowIdx3(1) < rowIdx3(4));
    assert('PI-Root row precedes PI-Trunk row',
        rowIdx3(2) !== -1 && rowIdx3(3) !== -1 && rowIdx3(2) < rowIdx3(3));

    // Milestone scheduledDates must respect the dependency chain
    assert('M101 scheduled before M201 (Seed→Root dep)',
        mSeed && mRoot && mSeed.scheduledDate < mRoot.scheduledDate);
    assert('M201 scheduled before M301 (Root→Trunk dep)',
        mRoot && mTrunk && mRoot.scheduledDate < mTrunk.scheduledDate);
    assert('M301 scheduled before M401 (Trunk→Fruit dep)',
        mTrunk && mFruitA && mTrunk.scheduledDate < mFruitA.scheduledDate);
    assert('M401 scheduled before M402 (within PI-Fruit)',
        mFruitA && mFruitB && mFruitA.scheduledDate < mFruitB.scheduledDate);

    // Exact dates (chain order, once rule 3 is implemented)
    assert('M101 (1 task=2d): 2026-01-03',   mSeed   && ymd(mSeed.scheduledDate)   === '2026-01-03');
    assert('M201 (2 tasks=4d): 2026-01-07',  mRoot   && ymd(mRoot.scheduledDate)   === '2026-01-07');
    assert('M301 (3 tasks=6d): 2026-01-13',  mTrunk  && ymd(mTrunk.scheduledDate)  === '2026-01-13');
    assert('M401 (4 tasks=8d): 2026-01-21',  mFruitA && ymd(mFruitA.scheduledDate) === '2026-01-21');
    assert('M402 (2 tasks=4d): 2026-01-25',  mFruitB && ymd(mFruitB.scheduledDate) === '2026-01-25');

    console.groupEnd();
    console.groupEnd();
    console.log('Gantt tests: ' + passed + ' passed, ' + failed + ' failed');
}
