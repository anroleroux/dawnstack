# Dawnstack

A minimal flat-file web app with a custom Make-based template composition
build system. It helps the user determine what to work on, how to prioritize it
and how to plan it.

## Description

It starts with the WHO section where the user enters strengths, wins
and/or weaknesses. The HOW section is where ideas are listed and rated
based on criteria from the WHO section and other criteria like ICE, RICE
and other feasibility criteria. The Portfolio section is the WHAT and is
where the user lists products, services and projects. Each portfilio item
is listed with a name, description and the ideas it relates to. Next is
the Milestones section. Milestones are planned out for each portfolio item.
The milestones have goals (to be achived) and a date. Milestone can also
be dependant on milestones in other porfolio items. Finally there is the
tasks section where milestone goals are broken down into tasks that must
deliver presentable value to stakeholders. They can also be marked to be
dependant on other tasks in the porfolio item.

## Data Structure

```text
ATTRIBUTES
  id           PK
  att_group_id FK → ATTRIBUTE_GROUPS.id
  description  TEXT

ATTRIBUTE_GROUPS
  id           PK
  name         TEXT (strength, win, weakness)
  description  TEXT

IDEAS
  id           PK
  name         TEXT
  description  TEXT

ATTRIBUTE_RATINGS
  id           PK
  idea_id      FK → IDEAS.id
  att_id       FK → ATTRIBUTES.id
  score        INT

CRITERIA
  id           PK
  name         TEXT (e.g. ICE_impact, RICE_reach, feasibility)
  description  TEXT

CRITERIA_RATINGS
  id           PK
  idea_id      FK → IDEAS.id
  crit_id      FK → CRITERIA.id
  score        INT

PORTFOLIO_ITEMS
  id           PK
  type         ENUM(product, service, project)
  name         TEXT
  description  TEXT

PORTFOLIO_ITEMS_IDEAS
  portfolio_item_id  FK → PORTFOLIO_ITEMS.id
  idea_id            FK → IDEAS.id

MILESTONES
  id                PK
  portfolio_item_id FK → PORTFOLIO_ITEMS.id
  goal              TEXT
  date              DATE

MILESTONE_DEPENDANCIES
  id                PK
  milestone_id      FK → MILESTONES.id
  depends_on_id     FK → MILESTONES.id

TASKS
  id            PK
  milestone_id  FK → MILESTONES.id
  description   TEXT
  depends_on_id FK → TASKS.id            -- nullable; within the same portfolio item
```

## Build

```sh
make uidev    # build with testing=true (local dev, mock data)
make fsdev    # build with testing=false (production-like, real API)
make clean    # remove ui/dist/
```

Output lands in `ui/dist/` (index.html, index.css, index.js). **Never edit dist files directly** — they are generated and will be overwritten on the next build.

## Source layout

```text
ui/layout.html      HTML shell with {{placeholder}} markers
ui/layout.css       CSS source (compiled → ui/dist/index.css)
ui/layout.js        JS entry; includes {{reactivity-js}} and {{products-js}}
ui/reactivity.js    Proxy-based reactive state + mount() helper
ui/comps/           Component JS files
  attributes.js     Attributes list + detail view  → ATTRIBUTES
  categories.js     Attribute groups list + detail → ATTRIBUTE_GROUPS
make/
  tpl.mk            compose() macro — awk-based placeholder substitution
  html.map          placeholder → file mappings for HTML
  css.map           placeholder → file mappings for CSS
  js.map            placeholder → file mappings for JS
```

## Template system

Map files (e.g. `make/js.map`) define `{{placeholder}}:path/to/file` pairs. The `compose` macro replaces each placeholder line in the template with the contents of the mapped file, preserving indentation.

## Go server

`main.go` at the project root. Uses stdlib `net/http` (Go 1.22+ method+path routing) and `database/sql` with `github.com/lib/pq`.

```sh
make run          # builds ui/dist with testing=false, then go run .
go run .          # run server only (expects ui/dist already built)
```

All other routes fall through to `http.FileServer` serving `ui/dist/`.

Endpoints:

| Method | Path                           | Notes                            |
| ------ | ------------------------------ | -------------------------------- |
| GET    | /api/attribute-groups          |                                  |
| POST   | /api/attribute-groups          |                                  |
| PUT    | /api/attribute-groups/{id}     | full update                      |
| DELETE | /api/attribute-groups/{id}     |                                  |
| GET    | /api/attributes                |                                  |
| POST   | /api/attributes                |                                  |
| PATCH  | /api/attributes/{id}           | field allowlist                  |
| DELETE | /api/attributes/{id}           |                                  |
| GET    | /api/ideas                     |                                  |
| POST   | /api/ideas                     |                                  |
| PATCH  | /api/ideas/{id}                | field allowlist                  |
| DELETE | /api/ideas/{id}                |                                  |
| GET    | /api/attribute-ratings         |                                  |
| POST   | /api/attribute-ratings         |                                  |
| PATCH  | /api/attribute-ratings/{id}    | field allowlist                  |
| DELETE | /api/attribute-ratings/{id}    |                                  |
| GET    | /api/criteria                  |                                  |
| POST   | /api/criteria                  |                                  |
| PUT    | /api/criteria/{id}             | full update                      |
| DELETE | /api/criteria/{id}             |                                  |
| GET    | /api/criteria-ratings          |                                  |
| POST   | /api/criteria-ratings          |                                  |
| PATCH  | /api/criteria-ratings/{id}     | field allowlist                  |
| DELETE | /api/criteria-ratings/{id}     |                                  |
| GET    | /api/portfolio-items           |                                  |
| POST   | /api/portfolio-items           |                                  |
| PATCH  | /api/portfolio-items/{id}      | field allowlist                  |
| DELETE | /api/portfolio-items/{id}      |                                  |
| GET    | /api/portfolio-item-ideas      |                                  |
| POST   | /api/portfolio-item-ideas      |                                  |
| PATCH  | /api/portfolio-item-ideas/{id} | field allowlist                  |
| DELETE | /api/portfolio-item-ideas/{id} |                                  |
| GET    | /api/milestones                |                                  |
| POST   | /api/milestones                |                                  |
| PATCH  | /api/milestones/{id}           | field allowlist; date YYYY-MM-DD |
| DELETE | /api/milestones/{id}           |                                  |
| GET    | /api/milestone-deps            |                                  |
| POST   | /api/milestone-deps            |                                  |
| PATCH  | /api/milestone-deps/{id}       | field allowlist                  |
| DELETE | /api/milestone-deps/{id}       |                                  |

Database connection defaults to `postgres://lp:lp@localhost:5432/lp?sslmode=disable`; override with `DATABASE_URL`.

## Database

```sh
docker compose up -d   # starts postgres:16-alpine on port 5432
```

Schema and seed data in `db/init.sql` (runs automatically on first container start).

## Adding a model

To add a new model, three files need to be touched:

**1. Create `ui/comps/<model>.js`** with four parts in order:

- **Template function** `<model>Template(state)` returning HTML strings for three states:
  - Detail card (single item), using `editableField(mr, api, ...)` for inline editing
  - Add form (bound to `save<Model>(event)` on submit)
  - Row list (default, iterates `state.list`)
- **Mount call** binding the component to a DOM element:

  ```js
  var modelItems = mount(
      document.getElementById("model-list"),
      {list: [], selected: null, adding: false, editing_field: null},
      modelTemplate
  );
  ```

- **CRUD functions** — `select<Model>(pid)`, `delete<Model>(p)`, `save<Model>(e)`, each with `if (!testing) { ... } else { //testing stub }` blocks
- **Load function** — `load<Model>s()` with a real fetch path and a testing block that pushes mock objects into `modelItems.list`

**2. Add a line to `make/js.map`:**

```text
{{model-name-js}}:ui/comps/model_name.js
```

**3. In `ui/layout.js`:**

- Add the placeholder comment where the component should be injected:

  ```js
  /* {{model-name-js}} */
  ```
  
- Call `load<Model>s()` inside the `DOMContentLoaded` listener

## Testing flag

`ui/layout.js` sets `const testing = true;` for local dev. `make fsdev` flips it to `false` via sed before composing. `make build` strips testing code from `ui/dist/index.js` in two passes:

- **Per-line:** any line ending with `//testing` is deleted.
- **Block:** a range from a line ending with `//testing-start` to a line ending with `//testing-end` (both inclusive) is deleted. Use this when only the boundary lines need to be marked:

  ```js
  } else { //testing-start
      const mock = getMockData();
      milestones.list.push(...mock);
  } //testing-end
  ```

## Scheduling rules

These rules govern how `buildGanttSchedule()` in `ui/comps/milestones.js` models time.

1. **Milestone date is a deadline (BY date).** The date field is the latest the milestone must be complete — not a target start or exact placement. It is a constraint, not a position. Higher-priority work is scheduled first; lower-priority work fills slack inside the deadline window of higher-priority work.
2. **Schedule by portfolio item priority.** Milestones belonging to the highest-priority portfolio item are scheduled first. Portfolio item priority is the highest idea score among all ideas linked to that item (`portfolioItemTopPriority`).
3. **Dependencies inherit the priority of their dependents.** If a lower-priority milestone is a dependency (direct or transitive) of a higher-priority milestone, it is elevated to that higher priority for scheduling purposes. A milestone's effective priority is the maximum of its own priority and all milestones that depend on it.
4. **Milestones require work time before their deadline.** Each milestone has an associated work duration (in days) that must fit between the preceding milestone and the deadline. Currently a fixed placeholder value `x`; later driven by the sum of task estimates. There must be enough calendar gap between milestones for this work to be completed — scheduling must not place two milestones so close together that the work window collapses.
5. **Infeasible schedules are surfaced visually.** When required work cannot fit between deadlines (work blocks overlap), the affected milestones are highlighted in red on the Gantt chart. The schedule is never silently compressed.
6. **Milestone WIP limit.** At most N milestones may be actively in progress at the same time. Work toward multiple milestones is interleaved (tasks from different milestones are interspersed in the schedule), not sequential. Milestones beyond the WIP limit queue behind completing ones.
7. **Task WIP limit.** At most M tasks may be scheduled concurrently at any point in time. The scheduler fills available WIP slots as fully as possible (bin-packing) rather than placing tasks sequentially. Tasks from different in-progress milestones compete for the same slots, subject to their milestone's priority and deadline.
