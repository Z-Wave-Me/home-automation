#!/bin/bash

compileJS() {
	local IFILE=$1
	local OFILE=$2
	local OPT_LEVEL=$3
	URL=$(wget -q https://closure-compiler.appspot.com/compile --post-data 'output_format=json&output_info=compiled_code&output_info=warnings&output_info=errors&output_info=statistics&compilation_level='${OPT_LEVEL}'&warning_level=verbose&output_file_name='${OFILE}'.js&js_code='$(hexdump -v -e '/1 "%02x"' ${IFILE}.js | sed 's/\(..\)/%\1/g') -O - | python -c "import sys, json; print json.load(sys.stdin)['outputFilePath']")
	wget -q https://closure-compiler.appspot.com/${URL} -O ${OFILE}.js
}

compileJS postRender-with-comments postRender SIMPLE_OPTIMIZATIONS
