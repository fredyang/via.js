src_dir = src
nice_to_have = src/nice-to-have-extensions
build_dir = build
prefix = .
dist_dir = ${prefix}/dist




node_engine ?= `which node nodejs`
version = $(shell cat version.txt)
date=$(shell git log -1 --pretty=format:%ad)

core_files = ${src_dir}/modelProxy.js\
			${src_dir}/eventSubscription.js\
			${src_dir}/declarative.js\
			${src_dir}/template.js\
			${src_dir}/must-have-extensions.js\

extensions = ${nice_to_have}/validation.js\
			${nice_to_have}/queryableListView.js\
			${nice_to_have}/alignableListView.js\
			${nice_to_have}/editableListView.js\
			${nice_to_have}/history.js\
			${nice_to_have}/tabs.js\
			${nice_to_have}/loadapp.js\

all:src_files = ${core_files}\
			${extensions}\
			${src_dir}/outro.txt

all:uglyfy_output = ${dist_dir}/via.all.uglyfy.min.js
all:closure_output = ${dist_dir}/via.all.min.js
all:out_js = ${dist_dir}/via.all.js
all:debug_js = ${dist_dir}/via.all.debug.js

core:src_files = ${core_files}\
				${src_dir}/outro.txt
				
core:uglyfy_output = ${dist_dir}/via.uglyfy.min.js
core:closure_output = ${dist_dir}/via.min.js
core:out_js = ${dist_dir}/via.js
core:debug_js = ${dist_dir}/via.debug.js


default: 
		@@make all
		@@make core

all: merge closure debug after_merge jslint
core: merge closure debug after_merge


merge:
	@@mkdir -p ${dist_dir}
	
	@@cat ${src_files} | sed -e '/\/\/#merge/,/\/\/#end_merge/d' -e '/\/\/#debug/,/\/\/#end_debug/d' -e '/[ \t]*log[ \t]*(.*)/d' > ${out_js}.tmp
	@@echo merging source file to ${out_js} 
	@@cat ${src_dir}/license.txt ${out_js}.tmp | \
    	                    sed "s/@version/${version}/" | \
    						sed "s/@date/${date}/" > ${out_js}

							
closure:	
	@@java -jar ${build_dir}/compiler.jar  --js ${out_js}.tmp  --js_output_file ${closure_output}.tmp
	
	@@echo minifying source file to  ${closure_output} using closure compiler
	
	@@cat ${src_dir}/license-min.txt ${closure_output}.tmp | \
	                    sed "s/@version/${version}/" | \
						sed "s/@date/${date}/" > ${closure_output}
	
	@@rm -f ${closure_output}.tmp

uglyfy:
	@@${node_engine} ${build_dir}/uglify.js --unsafe ${out_js}.tmp > ${uglyfy_output}.tmp
	@@${node_engine} ${build_dir}/post-compile.js ${uglyfy_output}.tmp > ${uglyfy_output}.tmp2
	@@rm -f ${uglyfy_output}.tmp
	@@echo minifying source file to ${uglyfy_output} using Uglify JS
	@@cat ${src_dir}/license.txt ${uglyfy_output}.tmp2 | \
	                    sed "s/@version/${version}/" | \
						sed "s/@date/${date}/" > ${uglyfy_output}
	@@rm -f ${uglyfy_output}.tmp2

debug:
	@@cat ${src_files} | sed -e '/\/\/#merge/,/\/\/#end_merge/d' > ${debug_js}.tmp;
	@@echo merging debug source file to ${debug_js}
	@@cat ${src_dir}/license.txt ${debug_js}.tmp | \
    	                    sed "s/@version/${version}/" | \
    						sed "s/@date/${date}/" > ${debug_js}
	@@rm -f ${debug_js}.tmp

after_merge:
	@@rm -f ${out_js}.tmp

jslint:
	@@${node_engine} build/jslint-check.js 
   
clean:
	@@echo "Removing Distribution directory:" ${dist_dir}
	@@rm -rf ${dist_dir}

delete:
	@@echo "Removing all files in directory:" ${dist_dir}
	@@rm  ${dist_dir}/*.*

