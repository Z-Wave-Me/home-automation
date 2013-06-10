CS_TPL_COMPILER=node_modules/.bin/nunjucks-precompile
CS_TPL_SRC_DIR=./webapp/templates/client_side
PUB_DIR=./webapp/static
PUB_JS_DIR=$(PUB_DIR)/js
CS_TPL_DST_FILE=$(PUB_JS_DIR)/_templates.js

clean:
	rm -rf $(CS_TPL_DST_FILE)

build:
	$(CS_TPL_COMPILER) $(CS_TPL_SRC_DIR) > $(CS_TPL_DST_FILE)
