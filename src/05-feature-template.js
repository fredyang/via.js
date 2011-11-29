//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var isArray = $.isArray;
	var isString = via.isString;
	var commonModelHandlers = via.commonModelHandlers;
	var defaultOptions = via.options();
	var rootProxy = via();
	//#end_merge

	//findAll is different from find in that it not only find its children
	//but it also find elements of itself.
	$.fn.findAll = $.fn.findAll || function ( selector ) {

		if ( this.length === 0 ) {
			return this;
		} else {
			var rtn = this.filter( selector );
			this.each( function () {
				rtn = rtn.add( $( this ).find( selector ) );
			} );
			return rtn;
		}
	};

	via.renderTemplate = function ( templateId, dataSource, options, engineName ) {
		engineName = engineName || options && options.engine || defaultOptions.engine;

		if ( !engineName ) {
			throw "there is not default engine registered";
		}

		var engine = templateEngines[engineName || options && options.engine || defaultOptions.engine];

		if ( !engine ) {
			throw "engine '" + engine + "' can not be found.";
		}

		var $content = $( engine.renderTemplate( templateId, dataSource, options ) );
		if ( options && options.callback ) {
			options.callback( $content );
		}
		return $content;
	};

	via.compileTemplate = function ( templateId, source, engineName ) {

		engineName = engineName || defaultOptions.engine;

		if ( !engineName ) {
			throw "there is not default engine registered";
		}

		var engine = templateEngines[engineName];

		if ( !engine ) {
			throw "engine '" + engine + "' can not be found.";
		}
		return engine.compileTemplate( templateId, source );

	};

	function template( modelEvent ) {
		var dataSource = modelEvent.currentValue();
		var options = modelEvent.options;
		options.get = function (fullPath) {
			return rootProxy.get(fullPath);
		};

		//dataSource can be an non-empty array
		//or it can be an non-empty non-array
		if ( dataSource && ((isArray( dataSource ) && dataSource.length) || !isArray( dataSource ) ) ) {

			var content = via.renderTemplate( options.templateId, dataSource, options );
			$( this ).html( content );
			content.view();
		} else {
			$( this ).empty();
		}
	}

	//templateOne is a workaround over jquery-tmpl, if the dataSource is an array, but we
	//want to treat it as an object, we need this 
	function templateOne( modelEvent ) {
		var currentValue = modelEvent.currentValue();
		modelEvent.currentValue = function () {
			return [currentValue];
		};
		template.call( this, modelEvent );
	}

	templateOne.buildOptions = template.buildOptions = function ( options ) {
		if ( isString( options ) ) {
			options = options.split( "," );
			return {
				templateId: options[0],
				engineName: options[1]
			};
		}
		return options;
	};

	extend( commonModelHandlers, {
		template: template,
		templateOne: templateOne
	} );

	var templateEngines = via.templateEngines = {};

	//#merge
})( jQuery, via );
//#end_merge