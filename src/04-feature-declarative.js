//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var defaultOptions = via.options();
	var extend = $.extend;
	var jQueryFn = $.fn;
	var hasOwn = {}.hasOwnProperty;
	var isString = via.isString;
	//#end_merge

	var rUseBindingPathAsContext = /^[\.\*]\w+/,
		rUseBindingContextAsContext = /^\.([\.\*])/,
		rSpace = /\s+/g,
		//@name:john@age:23@ignore, will be separate into name:john, age:23, ignore
		rKeyValue = /\s*@(\w+)(:([^@]+))*/g,
		rSemicolonSeparator = /\s*;\s*/g,
		//rCommaSeparator = /\s*,\s*/g,
		rClass = /(.+?)(,(.+?))?(,(.+))*$/,
		rHandlers = /(.+?),(.+?),(.+?)(,(.+))*$/,
		klass = "class",
		builtInProps = "mh,vh,class,theme,path,options".split( "," ),
		allBindings = {},
		classMatchers = {},
		specialParsers,
		viaBindingSet;

	defaultOptions.theme = "via";

	//get default class name
	function getDefaultClass( view ) {
		for ( var className in classMatchers ) {
			if ( hasOwn.call( classMatchers, className ) ) {
				if ( classMatchers[className]( view ) ) {
					return className;
				}
			}
		}
	}

	//build binding object from a string
	function buildBinding( text ) {
		if ( !isString( text ) ) {
			throw "bindingText must non-empty string";
		}

		var rtn = {},
			match, key, value;

		while ( (match = rKeyValue.exec( text )) ) {
			key = match[1];
			value = (match[3] && $.trim( match[3] ) ) || true;
			rtn[key] = rtn[key] ? rtn[key] + ";" + value : value;
		}

		return rtn;
	}

	//check allBinding for first part of full qualified class name,
	//which is themeName + "."
	function isThemeCached( themeName ) {
		themeName = themeName + ".";
		for ( var key in allBindings ) {
			if ( key.beginsWith( themeName ) ) {
				return true;
			}
		}
		return false;
	}

	//returns true if it a theme has bindingSet, otherwise false
	//a bindingSet can be is direct bindingSet, or from subThemes
	function locateBindingSetFromTheme( themeName ) {

		if ( !themeName ) {
			return false;
		}

		if ( isThemeCached( themeName ) ) {
			return true;
		}

		var bindingSets = buildBindingSetsFromTheme( themeName );
		if ( !bindingSets ) {
			return false;
		}

		//combine all the bindingSets into allBinding,
		//each class of a binding is fully qualified as themeName.className (eg. via.textBox)
		for ( var i = 0, bindingSet; (bindingSet = bindingSets[i]); i ++ ) {
			for ( var className in bindingSet ) {
				var value = bindingSet[className];
				var fullClassName = themeName + "." + className;
				//merge the binding if exists, otherwise append
				allBindings[fullClassName] = allBindings[fullClassName] ? allBindings[fullClassName] + value : value;
			}
		}
		return true;
	}

	//return an array of bindingSets
	//like [ {textBox: "..."} , {label: ".."} ]
	//because a theme may have subThemes, and subTheme may have its bindingSet
	//this method try to aggregate all the bindingSets into an array
	function buildBindingSetsFromTheme( themeName ) {
		var theme = via.themes[themeName];
		if ( !theme ) {
			return;
		}

		var rtn = [];
		theme.bindingSet && rtn.push( theme.bindingSet );

		var subThemes = theme.subThemes;
		if ( subThemes ) {
			subThemes = subThemes.split( ";" );
			for ( var i = 0; i < subThemes.length; i++ ) {
				rtn = rtn.concat( buildBindingSetsFromTheme( subThemes[i] ) );
			}
		}
		return rtn;
	}

	function inheritHandlerDataFromTheme( view, parentBinding, handlerData ) {

		//this is to avoid reserved word "class"
		//if parentBinding.class is null or parentBinding.class === "_" or cannot locate bindingSet of the theme
		if ( !parentBinding[klass] || (parentBinding[klass] === "_") || !locateBindingSetFromTheme( parentBinding.theme ) ) {
			return;
		}

		var classes = parentBinding[klass].split( rSemicolonSeparator );
		var themeBinding;

		for ( var i = 0; i < classes.length; i++ ) {
			//a class can be just a class name, or it can be className,path,options
			var match = rClass.exec( classes[i] ),
				themeViaData = allBindings[parentBinding.theme + "." + match[1]];

			if ( themeViaData ) {
				themeBinding = buildBinding( themeViaData );
				themeBinding.path = mergePath( parentBinding.path, match[3] );
				themeBinding.theme = parentBinding.theme;
				themeBinding.options = match[5] || parentBinding.options;
				//
				inheritHandlerDataFromTheme( view, themeBinding, handlerData );
				buildHandlerData( view, themeBinding, handlerData );
				applySpecialParser( view, themeBinding, handlerData );
			}
		}

	}

	function getPathOfParentView( view ) {

		var $parent = $( view );

		while ( ($parent = $parent.parent()) && $parent.length ) {

			var bindings = $parent.data( "via" );

			if ( bindings && bindings.path ) {

				return bindings.path;
			}
		}
		return "";
	}

	function mergePath( context, index ) {

		if ( !index || index == "." ) {

			return context;

		} else if ( rUseBindingContextAsContext.test( index ) ) {

			//use binding's context as context
			//.. or .*
			return  index.replace( rUseBindingContextAsContext, via.contextOfPath( context ) + "$1" );

		} else if ( rUseBindingPathAsContext.test( index ) ) {

			var match = /^(.+)\*/.exec( context );

			if ( match && match[1] && index.beginsWith( "*" ) ) {
				return match[1] + index;
			} else {
				//return context + index;
				return index.replace( rUseBindingPathAsContext, context + "$&" );
			}

		}
		return index;
	}

	//merge the handlers to handlers object
	function buildHandlerData( view, binding, handlers ) {
		mergeHandlersByType( "mh", view, binding, handlers );
		mergeHandlersByType( "vh", view, binding, handlers );
	}

	//merge the handlers to handlers object by type
	function mergeHandlersByType( handlerType, view, binding, handlers ) {

		var i, match, path, handlerEntries;

		handlerEntries = binding[handlerType] && binding[handlerType].replace( rSpace, "" ).split( ";" );
		if ( !handlerEntries ) {
			return;
		}

		for ( i = 0; i < handlerEntries.length; i++ ) {
			// /(.+?),(.+?),(.+?)(,(.+))*$/;
			match = rHandlers.exec( handlerEntries[i] );
			if ( !match ) {
				continue;
			}

			path = mergePath( binding.path, match[1] );

			handlers[handlerType].push( handlerType === "mh" ? {
				path: path,
				modelEvents: match[2],
				view: view,
				modelHandler: match[3],
				options: match[5] || binding.options
			} : {
				path: path,
				viewEvents: match[2],
				view: view,
				viewHandler: match[3],
				options: match[5] || binding.options
			} );

		}
	}

	function applySpecialParser( view, binding, handlers ) {

		var parse;
		for ( var prop in binding ) {

			if ( hasOwn.call( binding, prop ) &&
			     !builtInProps.contains( prop ) &&
			     (parse = specialParsers[prop]) ) {
				//if the keys is not defined in builtin processing keywords
				//it is importer
				parse( view, binding, handlers, binding[prop] );
			}
		}
	}

	//this can be call multiple times
	//it returns handlerData, also persist binding into $(view)data("via")
	function processViaAttr( view ) {

		//process

		var binding = $( view ).attr( "via" );

		if ( !binding ) {
			return;
		}

		binding = buildBinding( binding );
		$( view ).data( "via", binding );

		if ( binding.path && binding.path !== "." ) {
			//this is the case when path is not empty, but it is not "."

			if ( rUseBindingPathAsContext.exec( binding.path ) ) {
				//this is the case when path begin with . or *
				// like .firstName or *.index,
				binding.path = getPathOfParentView( view ) + binding.path;
			}

		} else {

			//this is the case when userBinding.path is not available
			//or when it is "."
			binding.path = getPathOfParentView( view );
		}

		//if userBinding.theme is not available,
		// if userBinding.path is null, then use default theme
		// otherwise disable theme
		binding.theme = binding.theme || defaultOptions.theme;

		var handlerData = {
			mh: [],
			vh: []
		};

		binding[klass] = binding[klass] || getDefaultClass( view );
		inheritHandlerDataFromTheme( view, binding, handlerData );
		buildHandlerData( view, binding, handlerData );
		applySpecialParser( view, binding, handlerData );

		return handlerData;
	}

	function addHandlers( handlerData ) {
		if ( !handlerData ) {
			return;
		}
		var i,
			modelHandlerData = handlerData.mh,
			viewHandlerData = handlerData.vh,
			modelHandler,
			viewHandler;

		for ( i = 0; i < modelHandlerData.length; i++ ) {
			modelHandler = modelHandlerData[i];
			via.addModelHandler(
				modelHandler.path,
				modelHandler.modelEvents,
				modelHandler.view,
				modelHandler.modelHandler,
				modelHandler.options );
		}

		for ( i = 0; i < viewHandlerData.length; i++ ) {
			viewHandler = viewHandlerData[i];
			via.addViewHandler(
				viewHandler.view,
				viewHandler.viewEvents,
				viewHandler.path,
				viewHandler.viewHandler,
				viewHandler.options );

		}
	}

	extend( via, {

		/*an object of collection of import function
		 {
		 parserName : function (view, binding, handlers ) {
		 handlers.mh.push("...");
		 }
		 }
		 you can use this as extension to add special handlers, such as validation
		 * */
		specialParsers: specialParsers = {},

		/*an objects that determine if a view match a class
		 {
		 className1: function (view) {
		 return true;
		 }
		 }
		 * */
		classMatchers: classMatchers,

		view: function ( objects ) {
			objects = objects || ":via";
			return $( objects ).each( function () {
				//prevent a view being parse more than once
				if ( !$( this ).data( "via" ) ) {
					addHandlers( processViaAttr( this ) );
				}
			} );
		},

		themes: {
			via: {
				subThemes: undefined,
				bindingSet: viaBindingSet = {}
			}
		}
	} );

	//@viaEvent:action.edit,
	specialParsers.viaEvent = function ( view, binding, handlers, specialOptions ) {

		if ( !binding.viewEvents ) {
			binding.viewEvents = {};
		}
		var events = specialOptions.split( "," );

		for ( var i = 0; i < events.length; i++ ) {
			var parts = events[i].split( "." );
			binding.viewEvents[parts[0]] = parts[1];
		}
	};

	$.expr[":"].via = function ( elem ) {
		return !!$( elem ).attr( "via" );
	};

	jQueryFn.view = function () {
		via.view( this.findAll( ":via" ) );
		return this;
	};

	//#debug
	via.debug.buildBinding = buildBinding;
	via.debug.processViaAttr = processViaAttr;
	via.debug.allBindings = allBindings;
	via.debug.mergePath = mergePath;
	//#end_debug

	//#merge
})( jQuery, via );
//#end_merge
