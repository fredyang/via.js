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

	//support function ( templateId, dataSource, callback, engineName )
	//function ( templateId, dataSource, options, engineName )
	//callback is a function ($content) {
	// //this refers to the view
	//}
	function _renderTemplate( view, templateId, dataSource, options, engineName ) {
		engineName = engineName || options && options.engine || defaultOptions.engine;

		if ( !engineName ) {
			throw "there is not default engine registered";
		}

		var $content,
			callback = options && ($.isFunction( options ) ? options : options.callback),
			engine = templateEngines[engineName || options && options.engine || defaultOptions.engine];

		options = options || {};
		options.get = function ( fullPath ) {
			return rootProxy.get( fullPath );
		};

		if ( !engine ) {
			throw "engine '" + engine + "' can not be found.";
		}

		if ( engine.isTemplateCompiled( templateId ) ) {

			$content = $( engine.renderTemplate( templateId, dataSource, options ) );
			callback && callback.call( view, $content );
			return $content;

		} else if ( typeof matrix !== "undefined" ) {

			var defer = $.Deferred();
			matrix( matrix.resourceName( templateId ) + ".template" ).done( function () {
				$content = $( engine.renderTemplate( templateId, dataSource, options ) );
				defer.resolve( $content );
			} );

			return defer.promise().done( function () {
				callback && callback.call( view, $content );
			} );
		}

		throw "can not locate template for '" + templateId + "'";
	}

	//here we use postAction like html, append, replaceWith, 
	//support function ( postAction, templateId, dataSource, callback, engineName )
	//and  function ( postAction, templateId, dataSource, options, engineName )
	$.fn.renderTemplate = function ( postAction, templateId, dataSource, options, engineName ) {

		return this.each( function () {

			var newOptions,
				view = this,
				externalCallback = options && ($.isFunction( options ) ? options : options.callback);

			function mergedCallback( $content ) {

				if ( postAction ) {
					$( view )[postAction]( $content );
					$content.view();
				}

				externalCallback && externalCallback.call( view, $content );
			}

			if ( typeof options === "object" ) {

				options.callback = mergedCallback;

				newOptions = options;

			} else {

				newOptions = mergedCallback;
			}

			_renderTemplate( view, templateId, dataSource, newOptions, engineName );

		} );

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

	function wrapContentIntoView( $content ) {
		$( this ).html( $content );
		$content.view();
	}

	function template( modelEvent ) {
		var dataSource = modelEvent.currentValue();

		//dataSource can be an non-empty array
		//or it can be an non-empty non-array
		if ( dataSource && ((isArray( dataSource ) && dataSource.length) || !isArray( dataSource ) ) ) {

			var options = modelEvent.options;

			var userCallback = options.callback;
			if ( userCallback ) {
				options.callback = function ( $content ) {
					wrapContentIntoView.call( this, $content );
					userCallback.call( this, $content );
				};
			} else {
				options.callback = wrapContentIntoView;
			}

			_renderTemplate( this, options.templateId, dataSource, options );

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
				templateId: $.trim( options[0] ),
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