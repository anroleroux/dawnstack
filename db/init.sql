create table attribute_groups (
    id          serial       primary key,
    name        varchar(100) not null,
    description text         not null default ''
);

create table attributes (
    id           serial       primary key,
    att_group_id integer      not null references attribute_groups(id),
    name         varchar(200) not null,
    description  text         not null default ''
);

create table ideas (
    id          serial       primary key,
    name        varchar(200) not null,
    description text         not null default ''
);

create table attribute_ratings (
    id      serial  primary key,
    idea_id integer not null references ideas(id),
    att_id  integer not null references attributes(id),
    score   integer not null default 5,
    unique (idea_id, att_id)
);

create table criteria (
    id          serial       primary key,
    name        varchar(200) not null,
    description text         not null default ''
);

create table criteria_ratings (
    id      serial  primary key,
    idea_id integer not null references ideas(id),
    crit_id integer not null references criteria(id),
    score   integer not null default 5,
    unique (idea_id, crit_id)
);

create type portfolio_item_type as enum ('product', 'service', 'project');

create table portfolio_items (
    id          serial              primary key,
    type        portfolio_item_type not null,
    name        varchar(200)        not null,
    description text                not null default ''
);

create table portfolio_item_ideas (
    id                serial  primary key,
    portfolio_item_id integer not null references portfolio_items(id),
    idea_id           integer not null references ideas(id),
    unique (portfolio_item_id, idea_id)
);

create table milestones (
    id                serial  primary key,
    portfolio_item_id integer not null references portfolio_items(id),
    goal              text    not null,
    date              date    not null
);

create table milestone_dependencies (
    id            serial  primary key,
    milestone_id  integer not null references milestones(id),
    depends_on_id integer not null references milestones(id),
    unique (milestone_id, depends_on_id)
);

create table tasks (
    id            serial  primary key,
    milestone_id  integer not null references milestones(id),
    description   text    not null,
    depends_on_id integer          references tasks(id)
);

-- Seed data

insert into attribute_groups (id, name, description) values
    (1, 'Strengths',  'Things you are particularly good at.'),
    (2, 'Wins',       'Past successes and achievements.'),
    (3, 'Weaknesses', 'Areas you want to improve.');

select setval('attribute_groups_id_seq', (select max(id) from attribute_groups));

insert into attributes (id, att_group_id, name, description) values
    (1, 1, 'Problem solving',       'Ability to break down and work through complex problems.'),
    (2, 1, 'Communication',         'Clear and effective written and verbal communication.'),
    (3, 2, 'Launched side project', 'Built and shipped a web app independently.'),
    (4, 2, 'Learned new framework', 'Picked up a new frontend framework quickly.'),
    (5, 3, 'Time management',       'Struggles with prioritising competing tasks.'),
    (6, 3, 'Public speaking',       'Nervous when presenting to large audiences.');

select setval('attributes_id_seq', (select max(id) from attributes));

insert into ideas (id, name, description) values
    (1, 'Launch a personal blog',     'Write about topics I''m passionate about to build an audience.'),
    (2, 'Build a recipe organiser',   'A simple app to save and tag recipes from around the web.'),
    (3, 'Create an online course',    'Package existing knowledge into a structured learning experience.'),
    (4, 'Freelance consulting',       'Offer expertise to small businesses on a project basis.'),
    (5, 'Open-source a side project', 'Release internal tooling publicly to grow reputation.');

select setval('ideas_id_seq', (select max(id) from ideas));

insert into attribute_ratings (id, idea_id, att_id, score) values
    (1, 1, 1, 7),
    (2, 1, 2, 9),
    (3, 2, 1, 8),
    (4, 3, 2, 8),
    (5, 4, 1, 6),
    (6, 5, 1, 9);

select setval('attribute_ratings_id_seq', (select max(id) from attribute_ratings));

insert into criteria (id, name, description) values
    (1, 'Impact',      'How significantly will this affect the target audience.'),
    (2, 'Confidence',  'How confident are we in our estimates.'),
    (3, 'Ease',        'How easy is it to implement.'),
    (4, 'Reach',       'How many people will this affect in a given period.'),
    (5, 'Feasibility', 'Technical and financial feasibility.');

select setval('criteria_id_seq', (select max(id) from criteria));

insert into criteria_ratings (id, idea_id, crit_id, score) values
    (1, 1, 1, 8),
    (2, 1, 2, 7),
    (3, 1, 3, 9),
    (4, 2, 1, 6),
    (5, 3, 4, 7),
    (6, 4, 5, 8);

select setval('criteria_ratings_id_seq', (select max(id) from criteria_ratings));

insert into portfolio_items (id, type, name, description) values
    (1, 'product', 'Personal Blog',    'A blog platform for sharing knowledge and building an audience.'),
    (2, 'product', 'Recipe Organiser', 'A web app for saving and tagging recipes.'),
    (3, 'service', 'Online Course',    'A structured learning experience for a target audience.'),
    (4, 'service', 'Consulting',       'Expert advice for small businesses on a project basis.');

select setval('portfolio_items_id_seq', (select max(id) from portfolio_items));

insert into portfolio_item_ideas (id, portfolio_item_id, idea_id) values
    (1, 1, 1),
    (2, 1, 2),
    (3, 2, 2),
    (4, 3, 3),
    (5, 4, 4);

select setval('portfolio_item_ideas_id_seq', (select max(id) from portfolio_item_ideas));

insert into milestones (id, portfolio_item_id, goal, date) values
    (1, 1, 'Launch MVP',        '2026-06-01'),
    (2, 1, 'Publish 10 posts',  '2026-07-01'),
    (3, 2, 'Import from CSV',   '2026-06-15'),
    (4, 3, 'Record module 1',   '2026-07-15'),
    (5, 3, 'Launch course',     '2026-09-01'),
    (6, 4, 'First paid client', '2026-08-01');

select setval('milestones_id_seq', (select max(id) from milestones));

insert into milestone_dependencies (id, milestone_id, depends_on_id) values
    (1, 2, 1),
    (2, 5, 4),
    (3, 5, 1);

select setval('milestone_dependencies_id_seq', (select max(id) from milestone_dependencies));
