package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	_ "github.com/lib/pq"
)

// ── Types ─────────────────────────────────────────────────────────────────────

type AttributeGroup struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
}

type Attribute struct {
	ID          int     `json:"id"`
	AttGroupID  int     `json:"att_group_id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
}

type Idea struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type AttributeRating struct {
	ID     int `json:"id"`
	IdeaID int `json:"idea_id"`
	AttID  int `json:"att_id"`
	Score  int `json:"score"`
}

type Criterion struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
}

type CriteriaRating struct {
	ID     int `json:"id"`
	IdeaID int `json:"idea_id"`
	CritID int `json:"crit_id"`
	Score  int `json:"score"`
}

type PortfolioItem struct {
	ID          int    `json:"id"`
	Type        string `json:"type"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type PortfolioItemIdea struct {
	ID              int `json:"id"`
	PortfolioItemID int `json:"portfolio_item_id"`
	IdeaID          int `json:"idea_id"`
}

type Milestone struct {
	ID              int    `json:"id"`
	PortfolioItemID int    `json:"portfolio_item_id"`
	Goal            string `json:"goal"`
	Date            *string `json:"date"`
}

type MilestoneDep struct {
	ID          int `json:"id"`
	MilestoneID int `json:"milestone_id"`
	DependsOnID int `json:"depends_on_id"`
}

type Task struct {
	ID          int     `json:"id"`
	MilestoneID int     `json:"milestone_id"`
	Description string  `json:"description"`
	DependsOnID *int    `json:"depends_on_id"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"created_at"`
	StartedAt   *string `json:"started_at"`
	CompletedAt *string `json:"completed_at"`
}

var db *sql.DB

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func pathID(r *http.Request) (int, error) {
	return strconv.Atoi(r.PathValue("id"))
}

// patchRow builds an UPDATE from a partial JSON body.
// table and allowed are compile-time constants, not user input.
// scan must call writeJSON on success and return nil, or return the error.
func patchRow(w http.ResponseWriter, r *http.Request, table string, allowed []string, ret string, scan func(*sql.Row) error) {
	id, err := pathID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	allow := make(map[string]bool, len(allowed))
	for _, a := range allowed {
		allow[a] = true
	}
	type kv struct {
		col string
		val any
	}
	var fields []kv
	for k, v := range body {
		if allow[k] {
			fields = append(fields, kv{k, v})
		}
	}
	if len(fields) == 0 {
		http.Error(w, "no valid fields", http.StatusBadRequest)
		return
	}
	clauses := make([]string, len(fields))
	args := make([]any, len(fields))
	for i, f := range fields {
		clauses[i] = fmt.Sprintf("%s=$%d", f.col, i+1)
		args[i] = f.val
	}
	args = append(args, id)
	q := fmt.Sprintf("update %s set %s where id=$%d returning %s",
		table, strings.Join(clauses, ", "), len(args), ret)
	row := db.QueryRowContext(r.Context(), q, args...)
	if err := scan(row); err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func deleteRow(w http.ResponseWriter, r *http.Request, table string) {
	id, err := pathID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	res, err := db.ExecContext(r.Context(),
		fmt.Sprintf("delete from %s where id=$1", table), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://portfolium:portfolium@localhost:5432/portfolium?sslmode=disable"
	}
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err = db.Ping(); err != nil {
		log.Fatal("db:", err)
	}

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("ui/dist")))

	mux.HandleFunc("GET /api/attribute-groups", listAttributeGroups)
	mux.HandleFunc("POST /api/attribute-groups", createAttributeGroup)
	mux.HandleFunc("PUT /api/attribute-groups/{id}", updateAttributeGroup)
	mux.HandleFunc("DELETE /api/attribute-groups/{id}", deleteAttributeGroup)

	mux.HandleFunc("GET /api/attributes", listAttributes)
	mux.HandleFunc("POST /api/attributes", createAttribute)
	mux.HandleFunc("PATCH /api/attributes/{id}", patchAttribute)
	mux.HandleFunc("DELETE /api/attributes/{id}", deleteAttribute)

	mux.HandleFunc("GET /api/ideas", listIdeas)
	mux.HandleFunc("POST /api/ideas", createIdea)
	mux.HandleFunc("PATCH /api/ideas/{id}", patchIdea)
	mux.HandleFunc("DELETE /api/ideas/{id}", deleteIdea)

	mux.HandleFunc("GET /api/attribute-ratings", listAttributeRatings)
	mux.HandleFunc("POST /api/attribute-ratings", createAttributeRating)
	mux.HandleFunc("PATCH /api/attribute-ratings/{id}", patchAttributeRating)
	mux.HandleFunc("DELETE /api/attribute-ratings/{id}", deleteAttributeRating)

	mux.HandleFunc("GET /api/criteria", listCriteria)
	mux.HandleFunc("POST /api/criteria", createCriterion)
	mux.HandleFunc("PUT /api/criteria/{id}", updateCriterion)
	mux.HandleFunc("DELETE /api/criteria/{id}", deleteCriterion)

	mux.HandleFunc("GET /api/criteria-ratings", listCriteriaRatings)
	mux.HandleFunc("POST /api/criteria-ratings", createCriteriaRating)
	mux.HandleFunc("PATCH /api/criteria-ratings/{id}", patchCriteriaRating)
	mux.HandleFunc("DELETE /api/criteria-ratings/{id}", deleteCriteriaRating)

	mux.HandleFunc("GET /api/portfolio-items", listPortfolioItems)
	mux.HandleFunc("POST /api/portfolio-items", createPortfolioItem)
	mux.HandleFunc("PATCH /api/portfolio-items/{id}", patchPortfolioItem)
	mux.HandleFunc("DELETE /api/portfolio-items/{id}", deletePortfolioItem)

	mux.HandleFunc("GET /api/portfolio-item-ideas", listPortfolioItemIdeas)
	mux.HandleFunc("POST /api/portfolio-item-ideas", createPortfolioItemIdea)
	mux.HandleFunc("PATCH /api/portfolio-item-ideas/{id}", patchPortfolioItemIdea)
	mux.HandleFunc("DELETE /api/portfolio-item-ideas/{id}", deletePortfolioItemIdea)

	mux.HandleFunc("GET /api/milestones", listMilestones)
	mux.HandleFunc("POST /api/milestones", createMilestone)
	mux.HandleFunc("PATCH /api/milestones/{id}", patchMilestone)
	mux.HandleFunc("DELETE /api/milestones/{id}", deleteMilestone)

	mux.HandleFunc("GET /api/milestone-deps", listMilestoneDeps)
	mux.HandleFunc("POST /api/milestone-deps", createMilestoneDep)
	mux.HandleFunc("PATCH /api/milestone-deps/{id}", patchMilestoneDep)
	mux.HandleFunc("DELETE /api/milestone-deps/{id}", deleteMilestoneDep)

	mux.HandleFunc("GET /api/tasks",          listTasks)
	mux.HandleFunc("POST /api/tasks",         createTask)
	mux.HandleFunc("PATCH /api/tasks/{id}",   patchTask)
	mux.HandleFunc("DELETE /api/tasks/{id}",  deleteTask)

	addr := ":8080"
	log.Printf("listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

// ── Attribute Groups ──────────────────────────────────────────────────────────

func listAttributeGroups(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, name, description, weight from attribute_groups order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]AttributeGroup, 0)
	for rows.Next() {
		var g AttributeGroup
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.Weight); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, g)
	}
	writeJSON(w, out)
}

func createAttributeGroup(w http.ResponseWriter, r *http.Request) {
	var g AttributeGroup
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into attribute_groups (name, description, weight) values ($1, $2, $3)
		 returning id, name, description, weight`,
		g.Name, g.Description, g.Weight,
	).Scan(&g.ID, &g.Name, &g.Description, &g.Weight)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, g)
}

func updateAttributeGroup(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var g AttributeGroup
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err = db.QueryRowContext(r.Context(),
		`update attribute_groups set name=$1, description=$2, weight=$3 where id=$4
		 returning id, name, description, weight`,
		g.Name, g.Description, g.Weight, id,
	).Scan(&g.ID, &g.Name, &g.Description, &g.Weight)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, g)
}

func deleteAttributeGroup(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "attribute_groups")
}

// ── Attributes ────────────────────────────────────────────────────────────────

func listAttributes(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, att_group_id, name, description, weight from attributes order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]Attribute, 0)
	for rows.Next() {
		var a Attribute
		if err := rows.Scan(&a.ID, &a.AttGroupID, &a.Name, &a.Description, &a.Weight); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, a)
	}
	writeJSON(w, out)
}

func createAttribute(w http.ResponseWriter, r *http.Request) {
	var a Attribute
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into attributes (att_group_id, name, description, weight) values ($1, $2, $3, $4)
		 returning id, att_group_id, name, description, weight`,
		a.AttGroupID, a.Name, a.Description, a.Weight,
	).Scan(&a.ID, &a.AttGroupID, &a.Name, &a.Description, &a.Weight)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, a)
}

func patchAttribute(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "attributes",
		[]string{"att_group_id", "name", "description", "weight"},
		"id, att_group_id, name, description, weight",
		func(row *sql.Row) error {
			var a Attribute
			if err := row.Scan(&a.ID, &a.AttGroupID, &a.Name, &a.Description, &a.Weight); err != nil {
				return err
			}
			writeJSON(w, a)
			return nil
		})
}

func deleteAttribute(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "attributes")
}

// ── Ideas ─────────────────────────────────────────────────────────────────────

func listIdeas(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, name, description from ideas order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]Idea, 0)
	for rows.Next() {
		var p Idea
		if err := rows.Scan(&p.ID, &p.Name, &p.Description); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, p)
	}
	writeJSON(w, out)
}

func createIdea(w http.ResponseWriter, r *http.Request) {
	var p Idea
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into ideas (name, description) values ($1, $2)
		 returning id, name, description`,
		p.Name, p.Description,
	).Scan(&p.ID, &p.Name, &p.Description)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, p)
}

func patchIdea(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "ideas",
		[]string{"name", "description"},
		"id, name, description",
		func(row *sql.Row) error {
			var p Idea
			if err := row.Scan(&p.ID, &p.Name, &p.Description); err != nil {
				return err
			}
			writeJSON(w, p)
			return nil
		})
}

func deleteIdea(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "ideas")
}

// ── Attribute Ratings ─────────────────────────────────────────────────────────

func listAttributeRatings(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, idea_id, att_id, score from attribute_ratings order by idea_id, att_id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]AttributeRating, 0)
	for rows.Next() {
		var ar AttributeRating
		if err := rows.Scan(&ar.ID, &ar.IdeaID, &ar.AttID, &ar.Score); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, ar)
	}
	writeJSON(w, out)
}

func createAttributeRating(w http.ResponseWriter, r *http.Request) {
	var ar AttributeRating
	if err := json.NewDecoder(r.Body).Decode(&ar); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into attribute_ratings (idea_id, att_id, score) values ($1, $2, $3)
		 returning id, idea_id, att_id, score`,
		ar.IdeaID, ar.AttID, ar.Score,
	).Scan(&ar.ID, &ar.IdeaID, &ar.AttID, &ar.Score)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, ar)
}

func patchAttributeRating(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "attribute_ratings",
		[]string{"idea_id", "att_id", "score"},
		"id, idea_id, att_id, score",
		func(row *sql.Row) error {
			var ar AttributeRating
			if err := row.Scan(&ar.ID, &ar.IdeaID, &ar.AttID, &ar.Score); err != nil {
				return err
			}
			writeJSON(w, ar)
			return nil
		})
}

func deleteAttributeRating(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "attribute_ratings")
}

// ── Criteria ──────────────────────────────────────────────────────────────────

func listCriteria(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, name, description, weight from criteria order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]Criterion, 0)
	for rows.Next() {
		var c Criterion
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Weight); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, c)
	}
	writeJSON(w, out)
}

func createCriterion(w http.ResponseWriter, r *http.Request) {
	var c Criterion
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into criteria (name, description, weight) values ($1, $2, $3)
		 returning id, name, description, weight`,
		c.Name, c.Description, c.Weight,
	).Scan(&c.ID, &c.Name, &c.Description, &c.Weight)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, c)
}

func updateCriterion(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var c Criterion
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err = db.QueryRowContext(r.Context(),
		`update criteria set name=$1, description=$2, weight=$3 where id=$4
		 returning id, name, description, weight`,
		c.Name, c.Description, c.Weight, id,
	).Scan(&c.ID, &c.Name, &c.Description, &c.Weight)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, c)
}

func deleteCriterion(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "criteria")
}

// ── Criteria Ratings ──────────────────────────────────────────────────────────

func listCriteriaRatings(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, idea_id, crit_id, score from criteria_ratings order by idea_id, crit_id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]CriteriaRating, 0)
	for rows.Next() {
		var cr CriteriaRating
		if err := rows.Scan(&cr.ID, &cr.IdeaID, &cr.CritID, &cr.Score); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, cr)
	}
	writeJSON(w, out)
}

func createCriteriaRating(w http.ResponseWriter, r *http.Request) {
	var cr CriteriaRating
	if err := json.NewDecoder(r.Body).Decode(&cr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into criteria_ratings (idea_id, crit_id, score) values ($1, $2, $3)
		 returning id, idea_id, crit_id, score`,
		cr.IdeaID, cr.CritID, cr.Score,
	).Scan(&cr.ID, &cr.IdeaID, &cr.CritID, &cr.Score)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, cr)
}

func patchCriteriaRating(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "criteria_ratings",
		[]string{"idea_id", "crit_id", "score"},
		"id, idea_id, crit_id, score",
		func(row *sql.Row) error {
			var cr CriteriaRating
			if err := row.Scan(&cr.ID, &cr.IdeaID, &cr.CritID, &cr.Score); err != nil {
				return err
			}
			writeJSON(w, cr)
			return nil
		})
}

func deleteCriteriaRating(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "criteria_ratings")
}

// ── Portfolio Items ───────────────────────────────────────────────────────────

func listPortfolioItems(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, type, name, description from portfolio_items order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]PortfolioItem, 0)
	for rows.Next() {
		var p PortfolioItem
		if err := rows.Scan(&p.ID, &p.Type, &p.Name, &p.Description); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, p)
	}
	writeJSON(w, out)
}

func createPortfolioItem(w http.ResponseWriter, r *http.Request) {
	var p PortfolioItem
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into portfolio_items (type, name, description) values ($1, $2, $3)
		 returning id, type, name, description`,
		p.Type, p.Name, p.Description,
	).Scan(&p.ID, &p.Type, &p.Name, &p.Description)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, p)
}

func patchPortfolioItem(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "portfolio_items",
		[]string{"type", "name", "description"},
		"id, type, name, description",
		func(row *sql.Row) error {
			var p PortfolioItem
			if err := row.Scan(&p.ID, &p.Type, &p.Name, &p.Description); err != nil {
				return err
			}
			writeJSON(w, p)
			return nil
		})
}

func deletePortfolioItem(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "portfolio_items")
}

// ── Portfolio Item Ideas ──────────────────────────────────────────────────────

func listPortfolioItemIdeas(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, portfolio_item_id, idea_id from portfolio_item_ideas order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]PortfolioItemIdea, 0)
	for rows.Next() {
		var pi PortfolioItemIdea
		if err := rows.Scan(&pi.ID, &pi.PortfolioItemID, &pi.IdeaID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, pi)
	}
	writeJSON(w, out)
}

func createPortfolioItemIdea(w http.ResponseWriter, r *http.Request) {
	var pi PortfolioItemIdea
	if err := json.NewDecoder(r.Body).Decode(&pi); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into portfolio_item_ideas (portfolio_item_id, idea_id) values ($1, $2)
		 returning id, portfolio_item_id, idea_id`,
		pi.PortfolioItemID, pi.IdeaID,
	).Scan(&pi.ID, &pi.PortfolioItemID, &pi.IdeaID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, pi)
}

func patchPortfolioItemIdea(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "portfolio_item_ideas",
		[]string{"portfolio_item_id", "idea_id"},
		"id, portfolio_item_id, idea_id",
		func(row *sql.Row) error {
			var pi PortfolioItemIdea
			if err := row.Scan(&pi.ID, &pi.PortfolioItemID, &pi.IdeaID); err != nil {
				return err
			}
			writeJSON(w, pi)
			return nil
		})
}

func deletePortfolioItemIdea(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "portfolio_item_ideas")
}

// ── Milestones ────────────────────────────────────────────────────────────────

func listMilestones(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, portfolio_item_id, goal, to_char(date, 'YYYY-MM-DD')
		 from milestones order by date, id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]Milestone, 0)
	for rows.Next() {
		var m Milestone
		if err := rows.Scan(&m.ID, &m.PortfolioItemID, &m.Goal, &m.Date); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, m)
	}
	writeJSON(w, out)
}

func createMilestone(w http.ResponseWriter, r *http.Request) {
	var m Milestone
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into milestones (portfolio_item_id, goal, date) values ($1, $2, $3)
		 returning id, portfolio_item_id, goal, to_char(date, 'YYYY-MM-DD')`,
		m.PortfolioItemID, m.Goal, m.Date,
	).Scan(&m.ID, &m.PortfolioItemID, &m.Goal, &m.Date)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, m)
}

func patchMilestone(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "milestones",
		[]string{"portfolio_item_id", "goal", "date"},
		"id, portfolio_item_id, goal, to_char(date, 'YYYY-MM-DD')",
		func(row *sql.Row) error {
			var m Milestone
			if err := row.Scan(&m.ID, &m.PortfolioItemID, &m.Goal, &m.Date); err != nil {
				return err
			}
			writeJSON(w, m)
			return nil
		})
}

func deleteMilestone(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "milestones")
}

// ── Milestone Dependencies ────────────────────────────────────────────────────

func listMilestoneDeps(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select id, milestone_id, depends_on_id from milestone_dependencies order by id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]MilestoneDep, 0)
	for rows.Next() {
		var d MilestoneDep
		if err := rows.Scan(&d.ID, &d.MilestoneID, &d.DependsOnID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, d)
	}
	writeJSON(w, out)
}

func createMilestoneDep(w http.ResponseWriter, r *http.Request) {
	var d MilestoneDep
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err := db.QueryRowContext(r.Context(),
		`insert into milestone_dependencies (milestone_id, depends_on_id) values ($1, $2)
		 returning id, milestone_id, depends_on_id`,
		d.MilestoneID, d.DependsOnID,
	).Scan(&d.ID, &d.MilestoneID, &d.DependsOnID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, d)
}

func patchMilestoneDep(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "milestone_dependencies",
		[]string{"milestone_id", "depends_on_id"},
		"id, milestone_id, depends_on_id",
		func(row *sql.Row) error {
			var d MilestoneDep
			if err := row.Scan(&d.ID, &d.MilestoneID, &d.DependsOnID); err != nil {
				return err
			}
			writeJSON(w, d)
			return nil
		})
}

func deleteMilestoneDep(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "milestone_dependencies")
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

const taskCols = `id, milestone_id, description, depends_on_id, status,
	to_char(created_at,  'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	to_char(started_at,  'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	to_char(completed_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

func scanTask(t *Task, dep *sql.NullInt64, sta, com *sql.NullString) {
	if dep.Valid { v := int(dep.Int64); t.DependsOnID = &v }
	if sta.Valid { t.StartedAt   = &sta.String }
	if com.Valid { t.CompletedAt = &com.String }
}

func listTasks(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(),
		`select `+taskCols+` from tasks order by milestone_id, id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := make([]Task, 0)
	for rows.Next() {
		var t Task
		var dep     sql.NullInt64
		var sta,com sql.NullString
		if err := rows.Scan(&t.ID, &t.MilestoneID, &t.Description, &dep,
			&t.Status, &t.CreatedAt, &sta, &com); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		scanTask(&t, &dep, &sta, &com)
		out = append(out, t)
	}
	writeJSON(w, out)
}

func createTask(w http.ResponseWriter, r *http.Request) {
	var t Task
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var dep sql.NullInt64
	if t.DependsOnID != nil { dep = sql.NullInt64{Int64: int64(*t.DependsOnID), Valid: true} }

	var depOut     sql.NullInt64
	var sta, com   sql.NullString
	err := db.QueryRowContext(r.Context(),
		`insert into tasks (milestone_id, description, depends_on_id)
		 values ($1, $2, $3)
		 returning `+taskCols,
		t.MilestoneID, t.Description, dep,
	).Scan(&t.ID, &t.MilestoneID, &t.Description, &depOut,
		&t.Status, &t.CreatedAt, &sta, &com)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	scanTask(&t, &depOut, &sta, &com)
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, t)
}

func patchTask(w http.ResponseWriter, r *http.Request) {
	patchRow(w, r, "tasks",
		[]string{"milestone_id", "description", "depends_on_id", "status"},
		taskCols,
		func(row *sql.Row) error {
			var t Task
			var dep     sql.NullInt64
			var sta,com sql.NullString
			if err := row.Scan(&t.ID, &t.MilestoneID, &t.Description, &dep,
				&t.Status, &t.CreatedAt, &sta, &com); err != nil {
				return err
			}
			scanTask(&t, &dep, &sta, &com)
			writeJSON(w, t)
			return nil
		})
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	deleteRow(w, r, "tasks")
}
