# Milestone Scheduling Algorithm

## Overview

The algorithm produces a **live, ordered queue of milestones** representing the best sequence of work from the current moment onward. It recalculates every time it runs. Completed milestones and tasks disappear from the schedule naturally. The output is the queue itself, plus a set of warnings (deadlines that will be missed) and suggestions (opportunities to better honour priority without cost to deadlines).

The schedule is **strictly sequential** — one milestone at a time, no parallelism.

---

## Inputs

- **Milestones** — each with:
  - A unique ID
  - A list of dependency milestone IDs (forming a DAG)
  - A priority value (higher = more important)
  - An optional deadline date
  - A list of assigned tasks (each with a completion status and a duration timestamp)
- **Global tracked averages:**
  - `avgTaskDuration` — average time to complete a single task across all milestones
  - `avgTasksPerMilestone` — average number of tasks per milestone
- **Current time T₀**

---

## Phase 1 — Sequencing

This phase takes the raw set of unscheduled milestones and produces a single ordered sequence. Deadlines are checked inline throughout and violations are logged as suggestions when encountered.

---

### Step 1.1 — Topological Sort & Cycle Detection

1. Model all milestones and their dependencies as a directed graph where an edge A → B means "A must be completed before B can start".
2. Perform a topological sort on the graph (e.g. Kahn's algorithm or DFS-based).
3. If a cycle is detected, flag all milestones involved in the cycle as a **configuration error** and exclude them from the rest of the algorithm. Log a warning for each.
4. The result is a valid partial order over all non-cyclic milestones.

---

### Step 1.2 — Identify Disconnected Parts

1. Treat the DAG as an undirected graph temporarily (ignore edge direction).
2. Find all **connected components** — groups of milestones that are linked to each other by at least one dependency path, directly or indirectly.
3. Each connected component is a **part**. Milestones in different parts have absolutely no dependency relationship with each other.
4. Parts will be scheduled independently first, then merged in Step 1.8.

---

### Step 1.3 — Find the Critical Chain per Part

For each part:

1. Enumerate all **root nodes** — milestones with no dependencies within the part.
2. Enumerate all **leaf nodes** — milestones with no dependents within the part.
3. For every root-to-leaf path in the part, compute the **cumulative estimated duration** of all milestones along that path (duration estimation is defined in Phase 2, but use it here as a lookup — run Phase 2 first if needed, or treat it as a sub-call).
4. The path with the **greatest cumulative duration** is the **critical chain** for that part.
5. If two paths tie on duration, prefer the one containing the highest priority milestone.

---

### Step 1.4 — Compute Part Priority

For each part:

1. Inspect every milestone that lies **on the critical chain** of that part.
2. The **part priority** is the **highest priority value** found among those milestones.
3. This single value represents the urgency of the entire part for scheduling purposes.

---

### Step 1.5 — Highest Part Priority Critical Chain Scheduling

1. Sort all parts in **descending order of part priority**.
2. For each part in this order, place its **critical chain nodes** into the growing global sequence, maintaining their internal dependency order (i.e. the topological order within the chain).
3. The result after this step is a sequence containing only the critical chain nodes of all parts, ordered by part priority, with higher-priority parts' chains appearing earlier.

---

### Step 1.6 — Off-Chain Node Insertion

After the critical chains are placed, weave in the remaining milestones (those connected to a part but not on its critical chain). Iterate through every node currently in the sequence and call `addOffChainNode(node)` on it.

---

#### `addOffChainNode(node)`

This function inspects the direct neighbours of `node` in the original DAG and attempts to insert any unscheduled ones into the sequence at the best priority-respecting position.

**A — Predecessors (nodes that must come BEFORE `node`)**

1. Collect all direct predecessors of `node` in the DAG that are **not yet in the sequence**.
2. For each such predecessor:
   a. Find the candidate insertion position by starting immediately before `node` in the sequence and scanning **forward toward the front**.
   b. Move the insertion point forward past any node whose priority is **lower** than the predecessor being inserted.
   c. Insert the predecessor at the position where the node immediately before it has priority **higher than or equal** to the predecessor (i.e. do not leapfrog a higher-priority node).
   d. Shift all nodes from the insertion point up to (but not including) `node` one position later.
   e. For each shifted node that has a deadline, check whether its new `estimatedEnd` (recalculated by simulation) would exceed its deadline. If any shifted node's deadline is breached by the shift, **stop moving forward** and place the predecessor at the current candidate position. Log a **suggestion** noting that a better priority ordering was possible but avoided to protect a deadline.
   f. Recursively call `addOffChainNode(predecessor)` for the newly inserted node.

**B — Successors (nodes that must come AFTER `node`)**

1. Collect all direct successors of `node` in the DAG that are **not yet in the sequence**.
2. For each such successor:
   a. Find the candidate insertion position by starting immediately after `node` in the sequence and scanning **forward toward the back**.
   b. Move the insertion point forward past any node whose priority is **lower** than the successor being inserted.
   c. Insert the successor at the position where the node immediately before it has priority **higher than or equal** to the successor.
   d. Shift all nodes from the insertion point onward one position later.
   e. For each shifted node that has a deadline, check whether its new `estimatedEnd` would exceed its deadline. If any shifted node's deadline is breached, **stop moving forward** and place the successor at the current candidate position. Log a **suggestion**.
   f. Recursively call `addOffChainNode(successor)` for the newly inserted node.

---

### Step 1.7 — Repeat for Remaining Parts

Steps 1.3 through 1.6 are performed for each part in descending part priority order. After this step, every milestone from every part is in the sequence, but the parts still sit as contiguous blocks relative to each other.

---

### Step 1.8 — Cross-Part Condensation

Merge the part blocks into a single unified sequence by folding each subsequent part's nodes into the sequence built so far.

For each part (starting from the **second** part in priority order), iterate through its nodes **in their current sequence order** and for each node:

1. Start at the **back** of the existing sequence (excluding nodes from the current part) and scan **forward toward the front**.
2. Find the position where the node immediately before it has priority **higher than or equal** to the current node — insert here.
3. Shift everything from the insertion point onward one position later.
4. For each shifted node that has a deadline, check whether the shift causes its `estimatedEnd` to exceed its deadline. If so, **stop moving forward** and place the node at the current candidate position. Log a **suggestion**.

> Note: Since parts are by definition disconnected, there are no dependency constraints to enforce during condensation. A node from part 2 may freely leapfrog any node from part 1 as long as priority and deadline rules allow.

---

## Phase 2 — Duration Estimation

Compute the **remaining estimated duration** for each milestone. This is used both during Phase 1 (for critical chain calculation) and Phase 3 (for simulation).

For each milestone:

1. Count the number of **incomplete tasks** assigned to it. Call this `incompleteTasks`.
2. If `incompleteTasks > 0`:
   ```
   remainingDuration = incompleteTasks × avgTaskDuration
   ```
3. If the milestone has **no tasks at all**:
   ```
   remainingDuration = avgTasksPerMilestone × avgTaskDuration
   ```
4. Completed tasks are excluded — they contribute no remaining duration.
5. Store `remainingDuration` on each milestone for use in subsequent phases.

> `avgTaskDuration` and `avgTasksPerMilestone` are global running averages updated whenever tasks are created or completed.

---

## Phase 3 — Schedule Simulation

Walk the ordered sequence produced by Phase 1 and assign concrete estimated timestamps to each milestone.

1. Set a running cursor `cursor = T₀` (current time).
2. For each milestone in sequence order:
   a. Set `milestone.estimatedStart = cursor`.
   b. Set `milestone.estimatedEnd = cursor + milestone.remainingDuration`.
   c. Advance `cursor = milestone.estimatedEnd`.
   d. If the milestone has a deadline and `milestone.estimatedEnd > deadline`:
      - Mark the milestone as **deadline breached**.
      - Log a **warning** identifying the milestone, its deadline, and by how much it will be exceeded.
3. The result is a fully time-stamped sequence of milestones from T₀ onward.

---

## Phase 4 — Output

Collect everything produced across all phases into the final result.

1. **Ordered milestone queue** — the sequenced list with `estimatedStart` and `estimatedEnd` per milestone.
2. **Warnings** — deduplicated list of:
   - Cycle detection errors (Phase 1.1)
   - Deadline breaches (Phase 3)
3. **Suggestions** — deduplicated list of priority-improvement opportunities logged during insertion steps (Phases 1.6 and 1.8), each identifying:
   - Which milestone could be moved
   - What it would need to displace
   - What deadline constraint is preventing it

---

## Key Invariants

- A milestone never appears before any of its dependencies in the final sequence.
- A milestone never appears more than once in the sequence.
- Deadline protection always takes precedence over priority improvement during insertion.
- The schedule is stateless between runs — it always recalculates fully from T₀.