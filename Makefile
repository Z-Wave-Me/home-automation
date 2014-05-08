IMG := $(shell find ./htdocs/public/img/ -name '*')
FONTS := $(shell find ./htdocs/public/css/fonts/ -name '*')

GZIP := gzip -f
OUTPUT_FOLDER := ./htdocs/build
CSS_FOLDER := $(OUTPUT_FOLDER)/css
JS_FOLDER := $(OUTPUT_FOLDER)/js


assets: js css index img fonts
dev: clean dev_index

dev_index: ./htdocs/templates/index.html
	node build/build_html.js ./htdocs/templates/index.html ./htdocs/index.html

index: ./htdocs/templates/index.html
	NODE_ENV=production node build/build_html.js ./htdocs/templates/index.html ./htdocs/index.html

js: ./build/require_js_build.js
	./node_modules/.bin/r.js -o ./build/require_js_build.js
	$(GZIP) $(JS_FOLDER)/main.js

css: ./htdocs/public/less/*.less
	mkdir -p $(CSS_FOLDER)
	./node_modules/.bin/lessc htdocs/public/less/all.less > $(CSS_FOLDER)/all.css
	$(GZIP) $(CSS_FOLDER)/all.css

img: $(IMG)
	cp -r ./htdocs/public/img $(OUTPUT_FOLDER)

fonts: $(FONTS)
	cp -r ./htdocs/public/css/fonts $(CSS_FOLDER)
	find htdocs/build/css/fonts/ -type f ! -name '*.gz' | xargs $(GZIP)

clean:
	rm ./htdocs/build -fr
	git checkout ./htdocs/index.html
