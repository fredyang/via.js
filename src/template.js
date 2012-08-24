//
//<@depends>event.js, model.js, declarative.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var isArray = $.isArray;
	var isString = via.util.isString;
	var isObject = via.util.isObject;
	var initializers = via.filters.initializers;
	var finalizers = via.filters.finalizers;
	var converters = via.filters.converters;
	var viaClasses = via.classes;
	var $fn = $.fn;
	var slice = [].slice;
	var isFunction = $.isFunction;
	var isPromise = via.util.isPromise;
	//#end_merge

	var template,
		templateEngines = {},
		renderInside = {
			initialize: "*buildTemplateOptions",
			get: "get", //extensible
			convert: "*template",
			set: "html", //extensible
			finalize: "*importSubs"
		};

	function buildTemplateHandler ( getter, setter, finalizer ) {
		return extend( {}, renderInside,
			isObject( getter ) ? getter : {
				get: getter,
				set: setter,
				finalize: finalizer
			} );
	}

	//options can be : templateId,wrapItem,engineName
	//
	//or it can be
	// {
	//  templateId: "xxx",
	//  wrapItem: true,
	//  engineName: "xxx"
	//}
	initializers.buildTemplateOptions = function( publisher, subscriber, handler, options ) {
		if (isString( options )) {

			options = options.split( "," );
			handler.templateId = $.trim( options[0] );
			handler.useDataSourceAsArrayItem = $.trim( options[1] ) == "true";
			handler.engineName = options[2];

		} else if (isObject( options ) && options.templateId) {

			extend( handler, options );

		} else {

			if (!(handler.templateId = $( subscriber ).data( "defaultTemplate" ))) {

				var templateSource = $.trim( $( subscriber ).html() );
				if (templateSource) {
					$( subscriber ).empty();
					handler.templateId = "__" + $.uuid++;
					template.compile( handler.templateId, templateSource );
					$( subscriber ).data( "defaultTemplate", handler.templateId );
				} else {
					throw "missing template";
				}
			}
		}
	};

	//this converter is used in handlers which can want to convert data
	// to markup, these handler includes foreach, and buildTemplateHandler
	//which is the core of all templateHandler
	converters.template = function( dataSource, e ) {

		if (dataSource && (
			(isArray( dataSource ) && dataSource.length) || //if dataSource is an array, it has item(s)
			!isArray( dataSource ) //or dataSource is non-array
			)) {

			//if useDataSourceAsArrayItem is true, wrap data with [], so that it is an item of an array, explicitly
			//some template engine can automatically wrap your data if it is not an array.
			//if you data is already in array, it treat it as an array of items.
			//however, if you want to want to treat your array as item, you need to wrap it by your
			//self, useDataSourceAsArrayItem is for this purpose

			var publisher = e.publisher,

				handler = this,

				//handler.templateId, handler.useDataSourceAsArrayItem, handler.engineName is
				//built in during initialization , see initializers.buildTemplateOptions
				content = renderTemplate(

					handler.templateId,

					handler.useDataSourceAsArrayItem ? [dataSource] : dataSource,

					//this context can be used to access model within the template
					{
						modelPath: publisher.path,
						e: e,
						get: function( /*subPath*/ ) {
							//this function run in the context of window
							return publisher.get.apply( publisher, slice.call( arguments ) );
						}
					},
					handler.engineName );

			if (isPromise(content)) {
				return content;
			}
			if (isString( content )) {

				content = $.trim( content );
			}

			//to work around a bug in jQuery
			// http://jsfiddle.net/jgSrn/1/
			return $( $( "<div />" ).html( content )[0].childNodes );
			//			if (rtn.length == 1 && rtn[0].nodeType == 3) {
			//				return content;
			//			} else {
			//				return rtn;
			//			}
			//return rtn;
			//return rtn.selector || !rtn.length ? content : rtn;
			//return content;
		} else {
			return "";
		}
	};

	//when the template is render, need to recursively import declarative subscritpions
	finalizers.importSubs = function( value, e ) {
		//e.subscriber.children().importSubs();
		$( value ).importSubs();

	};

	//add reusable event handler
	via.handlers( {
		renderInside: renderInside,
		render: buildTemplateHandler( "get", "replaceWith" )
	} );

	//data-sub="@class:foreach|path|templateId"
	//or data-sub="`foreach:path|templateId"
	viaClasses.foreach = "!init after*.:.|*renderInside";

	viaClasses.renderInside = "!init.:.|*renderInside";

	//data-sub="@class:render|path|templateId"
	//or data-sub="`render:path|templateId"
	viaClasses.render = "!init:.|*render";

	//$("div").renderInside(templateId, path)
	//$("div").renderInside(templateId, path, fn)
	$fn.renderInside = function( templateId, modelPath, templateHandlerExtension ) {

		modelPath = modelPath || "";

		if (isFunction( templateHandlerExtension )) {
			templateHandlerExtension = {
				finalize: templateHandlerExtension
			};
		}

		return this.initView(

			modelPath,

			templateHandlerExtension ?
				extend( {}, renderInside, templateHandlerExtension ) :
				"*renderInside",

			templateId
		);
	};

	//$("div").render(path, templateId)
	$fn.render = function( path, templateOptions, templateHandlerExtension ) {

		if (isFunction( templateHandlerExtension )) {
			templateHandlerExtension = {
				finalize: templateHandlerExtension
			};
		}

		return this.initView(
			path,
			templateHandlerExtension ? extend( {}, via.handlers( "render" ), templateHandlerExtension ) : "*render",
			templateOptions
		);
	};

	function getTemplateEngine ( engineName ) {
		engineName = engineName || template.defaultEngine;
		if (!engineName) {
			throw "engine name is not specified or default engine name is null";
		}
		var engine = templateEngines[engineName];
		if (!engine) {
			throw "engine '" + engine + "' can not be found.";
		}
		return engine;

	}

	//this is called by converters.renderTemplate
	function renderTemplate ( templateId, dataSource, renderContext, engineName ) {

		var engine = getTemplateEngine( engineName, templateId );

		templateId = $.trim( templateId );

		if (!engine.isTemplateLoaded || engine.isTemplateLoaded( templateId )) {

			return engine.render( templateId, dataSource, renderContext );

		} else {
			var defer = $.Deferred();
			template.load( templateId ).done( function() {
				var content = engine.render( templateId, dataSource, renderContext );
				var rtn = $( content );
				defer.resolve( rtn.selector || !rtn.length ? content : rtn );
			} );
			return defer.promise();

		}
	}

	via.template = template = {

		defaultEngine: "",

		/*
		 via.template.myEngine = {
		 render: function( templateId, data, context ) {},
		 compile: function( templateId, source ) {},
		 isTemplateLoaded: function( templateId ) {}
		 };
		 */
		engines: function( name, engine, notDefaultEngine ) {
			if (!name) {
				return templateEngines;
			}
			if (!engine) {
				return templateEngines[name];
			}

			templateEngines[name] = engine;
			if (!notDefaultEngine) {
				template.defaultEngine = name;
			}
		},

		//dynamically load a template by templateId,
		//it is called by template.render
		//The default implementation required matrix.js
		//but you can override this, all you need
		// is to return is that a promise, when the promise is
		// done, the template should be ready to used
		load: function( templateId ) {
			if (typeof matrix == "undefined") {
				throw "The method via.template.load require matrix.js," +
				      "or you need override the method";
			}
			return matrix( templateId + ".template" );
		},

		//this should be called by via.template.load after the method
		//get the source of the template
		compile: function( templateId, source, engineName ) {
			var engine = getTemplateEngine( engineName );
			return engine.compile( templateId, source );
		},

		//build a customized handler which handle the change of model
		//by default
		//getFilter is "get" which is to get model value,
		// it can be a string or function (e) {}
		//
		//setFitler is "html" which is to change the content of the view
		//it can be a string or function (e, value)
		buildTemplateHandler: buildTemplateHandler
	};

	//#merge
})( jQuery, via );
//#end_merge