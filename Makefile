include make/tpl.mk

local: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist
	sed -i 's/const offline  = false/const offline  = true/' ui/dist/index.js
	$(call compose,ui/layout.html,make/map,ui/dist/index.html)
	@echo "Built local dev (localStorage) → ui/dist/index.html"

go: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist
	$(call compose,ui/layout.html,make/map,ui/dist/index.html)
	@echo "Built Go dev → ui/dist/index.html"

build: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist
	sed -i 's/const supabase = false/const supabase = true/' ui/dist/index.js
	sed -i 's|__SUPABASE_URL__|$(SUPABASE_URL)|g' ui/dist/index.js
	sed -i 's|__SUPABASE_PUBLISHABLE_KEY__|$(SUPABASE_PUBLISHABLE_KEY)|g' ui/dist/index.js
	$(call compose,ui/layout.html,make/map,ui/dist/index.html)
	@echo "Built Supabase prod → ui/dist/index.html"

ui/dist/index.css: ui/layout.css $(wildcard ui/comps/*/*.css)
	@mkdir -p ui/dist
	$(call compose,ui/layout.css,make/map,ui/dist/index.css)

ui/dist/index.js: ui/layout.js ui/reactivity.js $(wildcard ui/comps/*.js) $(wildcard ui/comps/*/*.js)
	@mkdir -p ui/dist
	$(call compose,ui/layout.js,make/map,ui/dist/index.js)

offline: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist-offline
	cp ui/dist/index.js ui/dist-offline/index.js
	sed -i '/\/\/offline-start$$/,/\/\/offline-end$$/d' ui/dist-offline/index.js
	sed -i '/\/\/offline$$/d' ui/dist-offline/index.js
	sed -i 's/const offline  = false/const offline  = true/' ui/dist-offline/index.js
	$(call compose,ui/layout.html,make/offline.map,ui/dist-offline/index.html)
	@echo "Built offline prod → ui/dist-offline/index.html"

run: go
	go run .

clean:
	rm -rf ui/dist
