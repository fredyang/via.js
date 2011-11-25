//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var defaultOptions = via.options();
	var extend = $.extend;
	var jQueryFn = $.fn;
	var hasOwn = {}.hasOwnProperty;
	var isObject = via.isObject;
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
		classMatchers = {};

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
	function convertBindingTextToBindingObject( bindingText ) {
		if ( !isString( bindingText ) ) {
			throw "bindingText must non-empty string";
		}

		var rtn = {},
			match, key, value;

		while ( (match = rKeyValue.exec( bindingText )) ) {
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
			if ( key.indexOf( themeName ) === 0 ) {
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

	function attacheThemeHandlers( view, parentBinding, handlers ) {

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
				themeBinding = convertBindingTextToBindingObject( themeViaData );
				themeBinding.path = buildPathWithContextAndIndex( parentBinding.path, match[3] );
				themeBinding.theme = parentBinding.theme;
				themeBinding.options = match[5] || parentBinding.options;
				//
				attacheThemeHandlers( view, themeBinding, handlers );
				mergeHandlers( view, themeBinding, handlers );
				applySpecialParser( view, themeBinding, handlers );
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

	function buildPathWithContextAndIndex( context, index ) {

		if ( !index || index == "." ) {

			return context;

		} else if ( rUseBindingContextAsContext.test( index ) ) {

			//use binding's context as context
			//.. or .*
			return  index.replace( rUseBindingContextAsContext, via.contextOfPath( context ) + "$1" );

		} else if ( rUseBindingPathAsContext.test( index ) ) {

			var match = /^(.+)\*/.exec( context );

			if ( match && match[1] && index.indexOf( "*" ) === 0 ) {
				return match[1] + index;
			} else {
				//return context + index;
				return index.replace( rUseBindingPathAsContext, context + "$&" );
			}

		}
		return index;
	}

	//merge the handlers to handlers object
	function mergeHandlers( view, binding, handlers ) {
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

			path = buildPathWithContextAndIndex( binding.path, match[1] );

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
			     (parse = via.specialParsers[prop]) ) {
				//if the keys is not defined in builtin processing keywords
				//it is importer
				parse( view, binding, handlers, binding[prop]);
			}
		}
	}

	function buildHandlers( view ) {

		var userBinding = $( view ).data( "via" );

		if ( !userBinding ) {
			return;
		}

		if ( isObject( userBinding ) ) {
			return userBinding;
		}

		userBinding = convertBindingTextToBindingObject( userBinding );

		$( view ).data( "via", userBinding );

		if ( userBinding.path && userBinding.path !== "." ) {
			//this is the case when path is not empty, but it is not "."

			if ( rUseBindingPathAsContext.exec( userBinding.path ) ) {
				//this is the case when path begin with . or *
				// like .firstName or *.index,
				userBinding.path = getPathOfParentView( view ) + userBinding.path;
			}

		} else {

			//this is the case when userBinding.path is not available
			//or when it is "."
			userBinding.path = getPathOfParentView( view );
		}

		//if userBinding.theme is not available,
		// if userBinding.path is null, then use default theme
		// otherwise disable theme
		userBinding.theme = userBinding.theme || defaultOptions.theme;

		var rtnHandlers = {
			mh: [],
			vh: []
		};

		userBinding[klass] = userBinding[klass] || getDefaultClass( view );
		attacheThemeHandlers( view, userBinding, rtnHandlers );
		mergeHandlers( view, userBinding, rtnHandlers );
		applySpecialParser( view, userBinding, rtnHandlers );

		//#debug
		userBinding.mh = rtnHandlers.mh;
		userBinding.vh = rtnHandlers.vh;
		//#end_debug

		return rtnHandlers;
	}

	function addHandlers( handlers ) {
		if ( !handlers ) {
			return;
		}
		var i,
			commonModelHandlers = handlers.mh,
			commonViewHandlers = handlers.vh,
			modelHandler,
			viewHandler;

		for ( i = 0; i < commonModelHandlers.length; i++ ) {
			modelHandler = commonModelHandlers[i];
			via.addModelHandler(
				modelHandler.path,
				modelHandler.modelEvents,
				modelHandler.view,
				modelHandler.modelHandler,
				modelHandler.options );
		}

		for ( i = 0; i < commonViewHandlers.length; i++ ) {
			viewHandler = commonViewHandlers[i];
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
		specialParsers: {},

		/*an objects that determine if a view match a class
		 {
		 className1: function (view) {
		 return true;
		 }
		 }
		 * */
		classMatchers: classMatchers,

		parseView: function ( views ) {
			return $( views ).each( function () {
				var binding = $( this ).data( "via" );
				if ( !binding || binding.parsed ) {
					return;
				}
				addHandlers( buildHandlers( this ) );
				$( this ).data( "via" ).parsed = true;
			} );
		},

		themes: {
			via: {
				subThemes: undefined,
				bindingSet: {}
			}
		}
	} );

	$.expr[":"].via = function ( elem ) {
		return !!$( elem ).data( "via" );
	};

	jQueryFn.parseView = function () {
		return via.parseView( this );
	};

	//#debug
	via.debug.convertBindingTextToBindingObject = convertBindingTextToBindingObject;
	via.debug.buildHandlers = buildHandlers;
	via.debug.allBindings = allBindings;
	via.debug.buildPathWithContextAndIndex = buildPathWithContextAndIndex;
	//#end_debug

	//#merge
})( jQuery, via );
//#end_merge
