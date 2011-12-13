src_dir = src
build_dir = build
prefix = .
dist_dir = ${prefix}/dist




node_engine ?= `which node nodejs`
version = $(shell cat version.txt)
date=$(shell git log -1 --pretty=format:%ad)

core_files = ${src_dir}/01-core-proxy.js\
			${src_dir}/02-core-model-event.js\
			${src_dir}/03-core-view-event.js


feature_files = ${src_dir}/04-feature-declarative.js\
			${src_dir}/05-feature-template.js\
			${src_dir}/06-feature-template-engine-registration.js\
			${src_dir}/07-feature-common-handlers.js\

addon_files = ${src_dir}/08-addon-validation.js\
			${src_dir}/09-addon-list-query.js\
			${src_dir}/10-addon-list-edit.js\
			${src_dir}/11-addon-app.js

all:src_files = ${core_files}\
			${feature_files}\
			${addon_files}\
			${src_dir}/99-tail.txt

all:uglyfy_output = ${dist_dir}/viaProxy.all.uglyfy.min.js
all:closure_output = ${dist_dir}/viaProxy.all.closure.min.js
all:out_js = ${dist_dir}/viaProxy.all.js
all:debug_js = ${dist_dir}/viaProxy.all.debug.js

core:src_files = ${core_files}\
				${src_dir}/99-tail.txt
				
core:uglyfy_output = ${dist_dir}/via.core.uglyfy.min.js
core:closure_output = ${dist_dir}/via.core.closure.min.js
core:out_js = ${dist_dir}/via.core.js
core:debug_js = ${dist_dir}/via.core.debug.js

full:src_files = ${core_files}\
				${feature_files}\
				${src_dir}/99-tail.txt
				
full:uglyfy_output = ${dist_dir}/viaProxy.full.uglyfy.min.js
full:closure_output = ${dist_dir}/viaProxy.full.closure.min.js
full:out_js = ${dist_dir}/viaProxy.full.js
full:debug_js = ${dist_dir}/viaProxy.full.debug.js


all: merge closure debug after_merge jslint
core: merge closure debug after_merge
full: merge closure debug after_merge

merge:
	@@mkdir -p ${dist_dir}
	
	@@cat ${src_files} | sed -e '/\/\/#merge/,/\/\/#end_merge/d' -e '/\/\/#debug/,/\/\/#end_debug/d' -e '/[ \t]*log[ \t]*(.*)/d' > ${out_js}.tmp
	@@echo merging source file to ${out_js} 
	@@cat ${src_dir}/00-head.txt ${out_js}.tmp | \
    	                    sed "s/@version/${version}/" | \
    						sed "s/@date/${date}/" > ${out_js}

							
closure:	
	@@java -jar ${build_dir}/compiler.jar  --js ${out_js}.tmp  --js_output_file ${closure_output}.tmp
	
	@@echo minifying source file to  ${closure_output} using closure compiler
	
	@@cat ${src_dir}/00-head.txt ${closure_output}.tmp | \
	                    sed "s/@version/${version}/" | \
						sed "s/@date/${date}/" > ${closure_output}
	
	@@rm -f ${closure_output}.tmp

uglyfy:
	@@${node_engine} ${build_dir}/uglify.js --unsafe ${out_js}.tmp > ${uglyfy_output}.tmp
	@@${node_engine} ${build_dir}/post-compile.js ${uglyfy_output}.tmp > ${uglyfy_output}.tmp2
	@@rm -f ${uglyfy_output}.tmp
	@@echo minifying source file to ${uglyfy_output} using Uglify JS
	@@cat ${src_dir}/00-head.txt ${uglyfy_output}.tmp2 | \
	                    sed "s/@version/${version}/" | \
						sed "s/@date/${date}/" > ${uglyfy_output}
	@@rm -f ${uglyfy_output}.tmp2

debug:
	@@cat ${src_files} | sed -e '/\/\/#merge/,/\/\/#end_merge/d' > ${debug_js}.tmp;
	@@echo merging debug source file to ${debug_js}
	@@cat ${src_dir}/00-head.txt ${debug_js}.tmp | \
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

