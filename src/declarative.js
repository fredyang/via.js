//
//<@depends>eventSubscription.js, modelProxy.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var defaultOptions = via.options;
	var extend = $.extend;
	var $fn = $.fn;
	var hasOwn = {}.hasOwnProperty;
	var toTypedValue = via.util.toTypedValue;
	var mergeLogicalPath = via.mergeLogicalPath;
	var isUndefined = via.util.isUndefined;
	var subscribe = via.subscribe;
	//#end_merge

	var
		//a declaration is like @property:value or @property
		//rDeclaration = /\s*([`@$\^])([#\w\. \*]+)(:([\*\.\w$\/][^`@$\^]*))*/g,
		//rDeclaration = /\s*([`@$\^])([#\w\. \*]+):?/g,
		rDeclaration = /\s*([`@!])([#\w\. \*]+):?|\s*(\$)([#\w\. \*]+):/g,


		rSemicolonSeparator = /\s*;\s*/g,
		//rCommaSeparator = /\s*,\s*/g,
		//match a,b or a,b,c
		//try to match myclass|path|options|delegate or myclass|path
		rClassPropertyValue = /^([^|]+)(\|([^|]+))?(\|(.+?))??$/,
		//match the "|" in "a|b" and " | " in "a | b"
		rSubscriptionValueSeperator = /\s*\|\s*/g,
		klass = "class",
		reservedPropNames = "sub,pub,class,theme,ns,options".split( "," ),
		allClassDefinitions = {},
		customSubsProps,
		viaClasses;

	defaultOptions.theme = "via";
	defaultOptions.subsAttr = "data-sub";
	defaultOptions.autoImportSubs = true;

	//build preliminary rule object from a string
	function convertStringToDataSub ( dataSubString ) {
		if (!dataSubString) {
			return;
		}
		var i=0,
			rtn = {},
			propertyList = [],
			match, propertyName, propertyValue, seperator;

		while ((match = rDeclaration.exec( dataSubString ))) {
			propertyList.push( {
				seperator: match[1] || match[3],
				propertyName: $.trim(match[2] || match[4]),
				from: (RegExp.leftContext + RegExp.lastMatch).length
			} );
			if (i !== 0) {
				propertyList[i - 1].to = RegExp.leftContext.length;
			}
			i++;
		}
		if (propertyList.length) {
			propertyList[propertyList.length - 1].to = dataSubString.length;
		}

		for (i = 0; i < propertyList.length; i++) {
			var item = propertyList[i];

			seperator = item.seperator;
			propertyName = item.propertyName;
			propertyValue = $.trim( dataSubString.substring( item.from, item.to ) ) || null;


			// currently we only support either "@", "`" , "$" and "!" seperator
			if (seperator == "`") {
				//this is class rule in "`" form
				//convert like the following
				// `myClass:path,options --> class:myClass,path,options
				// `myClass --> class:myClass
				propertyValue = propertyValue ? propertyName + "|" + propertyValue : propertyName;
				propertyName = "class";

			} else if (seperator == "$") {
				//convert
				// $event:path|handler|options|delegate --> @pub:event|path|handler|options|delegate
				propertyValue = propertyName + "|" + propertyValue;
				propertyName = "pub";

			} else if (seperator == "!") {
				//!event:path|handler|options|delegate --> @sub:path|events|handler|options|delegate
				//this.get().splice( index, 0, item );
				propertyValue = propertyValue.split( rSubscriptionValueSeperator );
				propertyValue.splice( 1, 0, propertyName );
				propertyValue = propertyValue.join( "|" );
				propertyName = "sub";
			}

			if (rtn[propertyName]) {

				rtn[propertyName] = rtn[propertyName] + ";" + propertyValue;

			} else {
				rtn[propertyName] = propertyValue;
			}
		}
		return rtn;
	}

	//returns true if it a theme has classRules, otherwise false
	//a classRules can be is direct classRules, or inherited from parentThemes
	function hasTheme ( themeName ) {

		if (!themeName || !via.themes[themeName]) {
			return false;
		}

		if (!via.themes[themeName].loaded) {

			var classRulesOfTheme = loadClassRulesOfTheme( themeName );
			if (!classRulesOfTheme) {
				return false;
			}

			//combine all the class rules into allClassDefinitions,
			//each class rule is fully qualified as themeName.className (eg. via.textBox)
			for (var i = classRulesOfTheme.length - 1, classRules; (classRules = classRulesOfTheme[i]); i--) {
				for (var className in classRules) {
					var classRule = classRules[className];
					var fullClassName = themeName + "." + className;
					//always overwrite the definition
					allClassDefinitions[fullClassName] = classRule;
				}
			}
			via.themes[themeName].loaded = true;

		}

		return true;
	}

	//return an array of classRules
	//like [ {textBox: "..."} , {label: ".."} ]
	//because a theme may have parentThemes, and parentTheme may have its classRules
	//this method try to aggregate all the classRules into an array
	function loadClassRulesOfTheme ( themeName ) {
		var theme = via.themes[themeName],
			rtn = [],
			parentThemes = theme.parentThemes;

		if (!parentThemes && themeName != "via") {
			parentThemes = "via";
		}

		if (parentThemes == "null") {
			parentThemes = undefined;
		}

		theme.classes && rtn.push( theme.classes );

		if (parentThemes) {
			parentThemes = parentThemes.split( ";" );
			for (var i = 0; i < parentThemes.length; i++) {
				rtn = rtn.concat( loadClassRulesOfTheme( parentThemes[i] ) );
			}
		}
		return rtn;
	}

	//parseContext can be default parseContext, it can be class' parseContext
	function addSubsFromClassProperties ( elem, parseContext, subscriptions ) {

		var matchClassPropertyValue,
			parts,
			className,
			classNs,
			extraClassData,
			dataSubDefinedInClass,
			pub,
			sub,
			classeReferences,
			classDeclaration,
			//because 'class' is reserved word in JavaScript,
			// we can not use parseContext.class, so use parseContext[klass] instead
			//classPropertyValue is like
			// "class1|path1|options1|delegate1;class2|path2|options2|delegate2"
			classReferenceString = parseContext[klass];

		//if parseContext does not have class declaration, or there is no theme
		if (!classReferenceString || classReferenceString === "_" || !hasTheme( parseContext.theme )) {
			return;
		}

		classeReferences = classReferenceString.split( rSemicolonSeparator );

		for (var i = 0; i < classeReferences.length; i++) {
			//@class:className
			//@class:className|ns
			//@class:className|ns|options
			matchClassPropertyValue = rClassPropertyValue.exec( classeReferences[i] );
			className = matchClassPropertyValue[1];
			classDeclaration = $.trim( allClassDefinitions[parseContext.theme + "." + className] );
			dataSubDefinedInClass = convertStringToDataSub( classDeclaration );

			if (dataSubDefinedInClass) {

				//@class:myClass|ns2[|extraClassData]
				//classNs == "ns2"
				classNs = matchClassPropertyValue[3];
				//extraClass data contains everything after classNs
				extraClassData = matchClassPropertyValue[5];

				//if via.classes.myClass == "@ns:ns1 @pub:xx @sub:xx"
				//then parseContextDefinedInClassRule.ns == "ns1"
				//
				//we need to recalculate the parseContextDefinedInClassRule.ns here
				//based on parseContext.ns, classNs and parseContextDefinedInClass.ns
				dataSubDefinedInClass.ns = mergeLogicalPath(
					mergeLogicalPath( parseContext.ns, classNs ),
					dataSubDefinedInClass.ns
				);

				dataSubDefinedInClass.theme = parseContext.theme;

				if (extraClassData) {
					var temp = extraClassData.split( rSubscriptionValueSeperator );
					if (temp.length == 2) {
						dataSubDefinedInClass.options = temp[1];
					} else {
						dataSubDefinedInClass.options = extraClassData;
					}
				} else {

					dataSubDefinedInClass.options = parseContext.options;
				}

				if (extraClassData) {
					//In method addSubsFromSubPubRules, by default,
					// if a subscription does not have an option defined,
					// the subscription will inherite parseContext.options (in this case, it is classOptions)
					// if the subscritpion already have a options defined, it will ignore the parseContext.options
					//
					//for example, we have the following
					//viaClasses.myClass = "@pub:click|.|handler|predefinedOptions@sub:...";
					//@class:myClass|ns|classOptions
					//by default "predefinedOptions" will be used, and classOptions will be ignored
					//
					//
					//But if we want to merge them together,  which means we want to used options
					//as "predefinedOptions,classOptions"
					//
					//we need to use this special logic here
					//
					//1. define the class with only <strong>one</strong> subscription either pub or sub like this
					//viaClasses.myClass = "@pub:click|.|handler|predefinedOptions";
					//
					//2 reference the class rule @class:myClass|ns|classOptions or `myClass:ns|classOption
					//the subscription will be @pub:click|ns|handler|predefinedOptions|classOptions
					//
					sub = dataSubDefinedInClass.sub;
					pub = dataSubDefinedInClass.pub;

					if (!sub && pub && pub.split( ";" ).length == 1) {
						//debugger;
						parts = pub.split( rSubscriptionValueSeperator );

						//parts[4] is options
						//if options is undefined
						if (isUndefined( parts[3] )) {
							dataSubDefinedInClass.pub += "|" + extraClassData;
						} else {
							dataSubDefinedInClass.pub += extraClassData;
						}

					} else if (!pub && sub && sub.split( ";" ).length == 1) {
						//debugger;
						parts = sub.split( rSubscriptionValueSeperator );
						if (isUndefined( parts[3] )) {
							dataSubDefinedInClass.sub += "|" + extraClassData;
						} else {
							dataSubDefinedInClass.sub += extraClassData;
						}

					}
				}

				//
				addSubs( elem, dataSubDefinedInClass, subscriptions );
			}
		}

	}

	//propName can be "theme" and "ns"
	function inheritParentProp ( elem, propName ) {

		var $parent = $( elem );

		while (($parent = $parent.parent()) && $parent.length) {

			var dataSub = $parent.dataSub();

			if (dataSub && dataSub[propName]) {

				return dataSub[propName];
			}
		}
		return "";
	}

	function addSubsFromSubPubProperties ( elem, parseContext, subscriptions ) {
		buildSubsBySubOrPub( "sub", elem, parseContext, subscriptions );
		buildSubsBySubOrPub( "pub", elem, parseContext, subscriptions );
	}

	//subscriptionType can be either "sub" or "pub"
	function buildSubsBySubOrPub ( subscriptionType, elem, parseContext, subscriptions ) {

		var i,
			subscriptionParts,
			publisher,
			eventTypes,
			subscriber,
			options,
			subscriptionEntries = parseContext[subscriptionType] && parseContext[subscriptionType].split( ";" );

		if (subscriptionEntries) {

			for (i = 0; i < subscriptionEntries.length; i++) {

				subscriptionParts = $.trim( subscriptionEntries[i] );
				if (!subscriptionParts) {
					continue;
				}

				subscriptionParts = subscriptionParts.split( rSubscriptionValueSeperator );

				if (subscriptionParts) {

					if (subscriptionType == "sub") {
						//for @sub, the syntax is @sub:path|events|handler|options|delegate
						publisher = subscriptionParts[0];
						publisher = publisher.startsWith( "$" ) ?
							publisher :
							mergeLogicalPath( parseContext.ns, publisher );

						eventTypes = subscriptionParts[1];
						subscriber = elem;

					} else {
						//for @pub, the syntax is @pub:events|path|handler|options|delegate
						publisher = elem;
						eventTypes = subscriptionParts[0];
						subscriber = subscriptionParts[1];
						subscriber = subscriber.startsWith( "$" ) ?
							subscriber :
							mergeLogicalPath( parseContext.ns, subscriber );
					}

					options = subscriptionParts[3];
					options = toTypedValue( options ? options : parseContext.options );

					subscriptions.push( {
						publisher: publisher,
						eventTypes: eventTypes,
						subscriber: subscriber,
						handler: subscriptionParts[2],
						options: options,
						delegate: subscriptionParts[4]
					} );
				}
			}
		}
	}

	//parseContext can be default parseContext, it can be class parseContext
	function addSubsFromCustomProperties ( elem, parseContext, subscriptions ) {

		for (var propName in parseContext) {

			if (hasOwn.call( parseContext, propName ) && !reservedPropNames.contains( propName )) {

				if (customSubsProps[propName]) {
					//if a rule is defined, call the rule

					//let's say rule name is "foo"
					var options = parseContext[propName] == "." ?

						//if "foo" is specified in classRules like
						//class:foo,.,fooValue, the rule value "fooValue"
						// is saved in parseContext.options
						parseContext.options :

						//if "foo" is defined like @foo:fooValue, the rule value "fooValue"
						// is saved in rules.foo
						parseContext[propName];

					customSubsProps[propName]( elem, parseContext, subscriptions, options );
				} else {

					//if rule is not defined, simply save it to element parseContext
					//parseContext is not necessary elem parseContext
					//it can be class parseContext
					$( elem ).dataSub()[propName] = parseContext[propName];
				}
			}
		}
	}

	//it returns an array of subscriptions,
	//if elem has custom rule
	// , it may or may not create side effect
	//
	//although this can be call multiple times, because of the side effect, it should
	//not be exposed in production, although it can be used for debugging purpose
	function buildSubscriptionObjects ( elem ) {
		var elementDataSub = $.trim( $( elem ).attr( defaultOptions.subsAttr ) );

		if (!elementDataSub) {
			return;
		}

		elementDataSub = convertStringToDataSub( elementDataSub );

		$( elem ).dataSub( elementDataSub );

		var ns = elementDataSub.ns;
		if (ns && ns !== ".") {
			//this is the case when path is not empty, but it is not "."

			//			if (rBeginDotOrStar.exec( elementDataSub.ns )) {
			//				//this is the case when path begin with . or *
			//				// like .firstName or *.index,
			//				elementDataSub.ns = mergeLogicalPath( inheritParentProp( elem, "ns" ), elementDataSub.ns );
			//			}

			elementDataSub.ns = mergeLogicalPath( inheritParentProp( elem, "ns" ), ns );

		} else {

			//this is the case when defaultParseContext.ns is not available
			//or when it is "."
			elementDataSub.ns = inheritParentProp( elem, "ns" );
		}

		//if userRule.theme is not available,
		// if userRule.ns is null, then use default theme
		// otherwise disable theme
		elementDataSub.theme = elementDataSub.theme ||
		                       inheritParentProp( elem, "theme" ) ||
		                       defaultOptions.theme;

		var subscriptions = [];

		addSubs( elem, elementDataSub, subscriptions );

		return subscriptions.length ? subscriptions : undefined;
	}

	function addSubs ( elem, parseContext, subscriptions ) {
		addSubsFromClassProperties( elem, parseContext, subscriptions );
		addSubsFromCustomProperties( elem, parseContext, subscriptions );
		addSubsFromSubPubProperties( elem, parseContext, subscriptions );
	}

	function importSubs ( elem ) {

		//only elem has data-sub="xxx" attribute
		//prevent a elem from being processed twice
		if ($( elem ).attr( defaultOptions.subsAttr ) && !$( elem ).dataSub()) {

			var i,
				subscription,
				//when buildSubscriptionObjects(elem) is called
				// $(elem).dataSub() will not be empty anymore
				subscriptions = buildSubscriptionObjects( elem );

			if (subscriptions) {
				for (i = 0; i < subscriptions.length; i++) {
					subscription = subscriptions[i];
					subscribe(
						subscription.subscriber,
						subscription.publisher,
						subscription.eventTypes,
						subscription.handler,
						subscription.options,
						subscription.delegate
					);
				}
			}
		}

		$( elem ).children().each( function() {
			importSubs( this );
		} );
	}

	extend( via, {

		//propName: function( elem, parseContext, subscriptions, options ) {
		//		 subscriptions.push("...");
		//}
		customSubsProps: customSubsProps = {},

		importSubs: function() {
			importSubs( document.documentElement );
		},

		themes: {
			//themes.via is the default theme
			via: {

				//#debug
				//parentThemes: undefined,
				//#end_debug

				classes: viaClasses = {}
			}
		},

		classes: viaClasses
	} );

	//	$.expr[":"].sub = function( elem ) {
	//		return !!$( elem ).attr( defaultOptions.subsAttr );
	//	};

	//findAll is different from find in that it not only find its children
	//but it also find elements of itself.
	extend( $fn, {

		findAll: function( selector ) {

			if (this.length === 0) {
				return this;
			} else {
				var rtn = this.filter( selector );
				this.each( function() {
					rtn = rtn.add( $( this ).find( selector ) );
				} );
				return rtn;
			}
		},

		importSubs: function() {
			return this.each( function() {
				importSubs( this );
			} );
		},

		//default parseContext of the element
		dataSub: function( value ) {
			if (isUndefined( value )) {
				return this.data( "datasub" );
			}
			return this.data( "datasub", value );
		}

	} );

	/*
	 the auto parse works only if you not using AMD to download
	 the via library, if you using AMD, then you need to manually
	 call via.parse

	 There is a difference between $(document).bind("ready", handler)
	 and $(handler).If the ready event has already fired and you
	 try to .bind("ready"),the bound handler will not be executed.
	 Ready handlers bound like $(document).bind("ready", handler)
	 are executed after any bound by $(handler). Here we want to use
	 $(document).bind("ready", handler) because if the via library is
	 loaded with asynchronous module definition, ready event should
	 be already fired, we disable auto wireup, so that user can
	 manually wireup where it is appropriate.
	 */
	(function() {

		var fn = function() {
			if (defaultOptions.autoImportSubs) {
				via.importSubs();
			}
		};

		if ($.isReady) {

			//this is when the viajs is loaded aysnchronously
			setTimeout( fn, 10 );

		} else {
			//this is when the viajs is loaded using synchronously using <script> tag
			//we want to run after all the function bound $(fn)
			$( document ).bind( "ready", fn );
		}

	})();

	//#debug
	//this method should be used for debugging purpose only.
	// should not be used in production
	$fn.buildSubscriptionObjects = function() {
		return buildSubscriptionObjects( this[0] );
	};

	via.debug.convertStringToDataSub = convertStringToDataSub;
	via.debug.allClassDefinitions = allClassDefinitions;
	via.debug.clearClassDeclarations = function() {
		$.each( via.themes, function( key ) {
			via.themes[key].loaded = false;
		} );
	}
	//#end_debug

	//#merge
})( jQuery, via );
//#end_merge
