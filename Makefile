include make/tpl.mk

uidev: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist
	$(call compose,ui/layout.html,make/html.map,ui/dist/index.html)
	@echo "Built test version → ui/dist/index.html"

fsdev: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist
	sed -i 's/^const testing = true;/const testing = false;/' ui/dist/index.js
	$(call compose,ui/layout.html,make/html.map,ui/dist/index.html)
	@echo "Built test version → ui/dist/index.html"

build: ui/layout.html ui/dist/index.css ui/dist/index.js
	@mkdir -p ui/dist
	sed -i '/\/\/testing$$/d' ui/dist/index.js
	$(call compose,ui/layout.html,make/html.map,ui/dist/index.html)
	@echo "Built test version → ui/dist/index.html"

ui/dist/index.css: ui/layout.css
	@mkdir -p ui/dist
	$(call compose,ui/layout.css,make/css.map,ui/dist/index.css)
	@echo "Built test version → ui/dist/index.css"

ui/dist/index.js: ui/layout.js $(wildcard ui/comps/*.js)
	@mkdir -p ui/dist
	$(call compose,ui/layout.js,make/js.map,ui/dist/index.js)
	@echo "Built test version → ui/dist/index.js"

run: fsdev
	go run .

clean:
	rm -rf ui/dist
