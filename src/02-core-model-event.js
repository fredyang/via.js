/* depends: proxy.js, modelEvent.js*/

//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var modelReferences = via.modelReferences;
	var isFunction = $.isFunction;
	var ns = via.ns();
	var rootProxy = via();
	var isString = via.isString;
	var isObject = via.isObject;
	var raiseEvent;
	var toPhysicalPath = via.physicalPath;
	var isUndefined = via.isUndefined;
	//#end_merge

	var rStarSuffix = /(\w+)?(\*?)(\.?)([^\s]*)/,
		rParentKey = /^(.+)\.\w+$/,
		rIndex = /^.+\.(\w+)$|\w+/,
		dummyView = {},
		RegExp = window.RegExp,
		/*
		 {
		 "customer.firstName": [
		 {
		 view : htmlElement,
		 modelHandler: "text",
		 modelEvents: "*",
		 options: "options"
		 }
		 ]
		 }
		 this is used to raiseEvent for that path, and the raiseEvent normally
		 trigger a modelHandler, so the object is to manage model events triggering
		 */
		modelHandlerData = {},
		/*it is used to hold shared model handlers
		 * {
		 *   key: function (modelEvent) {
		 *       //"this" refer the view in context
		 *   }
		 *
		 * }
		 * */
		commonModelHandlers = {},
		rEventSeparator = /\s*\|\s*/,
		rNoExtension = /^\w+(?!\w*\.\w+)/,
		rEventTypeFirstPart = /^(\w+)\.?/,
		jQueryFn = $.fn;

	//override the raiseEvent defined in 01-core-proxy.js module
	raiseEvent = function ( path, target, eventType, proposed, removed ) {

		//notify change of itself
		var modelEvent = new ModelEvent( path, target, eventType, proposed, removed );

		//the modelEvent can be changed in the findAndInvokeModelHandlers call
		findAndInvokeModelHandlers( modelEvent );

		if ( modelEvent.continueEventing && modelEvent.bubbleUp ) {
			modelEvent.eventType = rEventTypeFirstPart.exec( modelEvent.eventType )[1] + ".child";
			bubbleUpModelEvent( modelEvent );
		}

		return modelEvent;
	};

	//#merge
	via._setRaiseEvent( raiseEvent );
	//#end_merge

	//filter out the model handlers and invoke it
	function findAndInvokeModelHandlers( modelEvent ) {

		var modelHandlerObj,
			i,
			modelHandlerObjects = modelHandlerData[modelEvent.path];

		if ( modelHandlerObjects ) {

			for ( i = 0; i < modelHandlerObjects.length; i++ ) {

				modelHandlerObj = modelHandlerObjects[i];

				if ( shouldUpdateView( modelHandlerObj.modelEvents, modelEvent.eventType ) ) {

					//important!!
					modelEvent.options = modelHandlerObj.options;

					//we use the same modelEvent passed from outside
					invokeModelHandler( modelHandlerObj.view, modelHandlerObj.modelHandler, modelEvent );
				}

				if ( !modelEvent.continueEventing ) {
					break;
				}
			}
		}

		//cascade the change to other part of the model
		var dependents = modelReferences[modelEvent.path];
		var tempModelEvent;
		if ( dependents && dependents.length ) {
			for ( var j = 0; j < dependents.length; j++ ) {

				//create new instance of modelEvent in raiseEvent
				//	raiseEvent = function ( path, target, eventType, proposed, removed, options ) {
				tempModelEvent = raiseEvent(
					dependents[j],
					dependents[j],
					modelEvent.eventType, (modelEvent.proposed === undefined) ? undefined : rootProxy.get( true, dependents[j] )
				);

				if ( !tempModelEvent.continueEventing ) {
					break;
				}

				if ( tempModelEvent.hasError ) {
					modelEvent.hasError = true;
				}
			}
		}
	}

	//execute the true model handler
	//this function does not return anything, the result is carried in side in modelEvent
	function invokeModelHandler( view, modelHandler, modelEvent ) {
		//#debug
		var value = modelEvent.targetValue( true );
		log( "mh", modelEvent.eventType, via.logicalPath( modelEvent.target ), modelHandler, (view === dummyView ? "dummyView" : view), isFunction( value ) ? "function call" : value, modelEvent.options );
		//#end_debug

		if ( view === dummyView ) {
			view = null;
		}

		if ( isFunction( modelHandler ) ) {

			return modelHandler.call( view, modelEvent );

		} else if ( isString( modelHandler ) ) {
			var key1 = modelHandler.substring( 1 ),
				key2 = modelHandler.substring( 2 ),
				currentValue;

			if ( modelHandler.beginsWith( "*" ) ) {

				var commonModelHandler = commonModelHandlers[key1];

				if ( commonModelHandler ) {

					return commonModelHandler.call( view, modelEvent );

				}

			} else if ( modelHandler.beginsWith( "$" ) ) {

				if ( isFunction( jQueryFn[key1] ) ) {

					currentValue = modelEvent.currentValue();
					if ( "css,attr,prop".contains( key1 ) ) {

						var propName = modelEvent.options || modelEvent.targetIndex();
						$( view )[key1]( propName, currentValue );

					} else {

						$( view )[key1]( currentValue && currentValue.toString() );
					}
					return;
				}

			} else if ( modelHandler.beginsWith( "v." ) ) {

				if ( view[key2] ) {

					currentValue = modelEvent.currentValue();

					if ( isFunction( view[key2] ) ) {

						view[key2]( currentValue );

					} else {

						view[key2] = currentValue;

					}

					return;
				}
			}

		}
		throw "handler: " + modelHandler + " not found";
	}

	function bubbleUpModelEvent( modelEvent ) {
		var parentPath;

		while ( (parentPath = via.contextOfPath( modelEvent.path ) ) || true ) {
			//only change the path
			modelEvent.path = parentPath;
			findAndInvokeModelHandlers( modelEvent );

			//continueEventing has priority over bubbleUp
			if ( ( !modelEvent.continueEventing || !modelEvent.bubbleUp ) || parentPath === "" ) {
				break;
			}
		}
	}

	function shouldUpdateView( subscribedEvents, event ) {
		var regex;
		if ( subscribedEvents === "*" ) {
			return true;
		}

		subscribedEvents = subscribedEvents.split( rEventSeparator );

		for ( var i = 0; i < subscribedEvents.length; i ++ ) {

			var subscribeEvent = subscribedEvents[i];

			if ( subscribeEvent === event ) {
				return true;
			}

			//  /(\w+)?\*(\.(\w+))?/
			var match = rStarSuffix.exec( subscribeEvent );

			if ( match ) {
				if ( match[4] ) {
					if ( match[1] ) {
						//before*.parent
						if ( RegExp( "^" + match[1] + "\\w*\\." + match[4] ).test( event ) ) {
							return true;
						}
					} else {
						//*.parent
						if ( RegExp( "^\\w+\\." + match[4] ).test( event ) ) {
							return true;
						}
					}
				} else {

					if ( match[3] ) {
						//before*.
						// it only match beforeUpdate but not beforeUpdate.parent
						if ( match[1] ) {
							//before*. match beforeUpdate but not beforeUpdate.child
							regex = RegExp( "^" + match[1] + "(?!\\w*\\.\\w+)" );
						} else {
							//*.  match beforeUpdate but not beforeUpdate.child
							regex = rNoExtension;
						}
						if ( regex.test( event ) ) {
							return true;
						}
					} else {
						//before*
						if ( event.beginsWith( match[1] ) ) {
							return true;
						}
					}
				}
			}
		}

		return false;
	}

	//it support two overload
	//ModelEvent(event)
	//ModelEvent( path, target, eventType, proposed, removed, options);
	//normally, the modelEvent is like
	//	{
	//	    path: "", //always available
	//		target: "", //always available
	//		eventType: "beforeUpdate", //always available
	//		proposed: "", //available in beforeUpdate beforeAdd
	//		removed: "" //available in afterUpdate or afterDel,
	//	};
	function ModelEvent( currentPath, targetPath, eventType, proposed, removed ) {

		if ( isObject( currentPath ) ) {
			extend( this, currentPath );
		} else {
			this.path = currentPath;
			this.target = targetPath;
			this.eventType = eventType;
			!isUndefined( proposed ) && (this.proposed = proposed);
			!isUndefined( removed ) && (this.removed = removed);
		}
		// this.options  always set in findAndInvokeModelHandlers
	}

	ModelEvent.prototype = {

		constructor: ModelEvent,

		targetProxy: function () {
			return via( this.target );
		},

		//target is always where the actual update happens
		targetValue: function ( keepOriginal ) {
			return via().get( keepOriginal, this.target );
		},

		targetContext: function () {
			return via.contextOfPath( this.target );
		},

		targetIndex: function () {
			return via.indexOfPath( this.target );
		},

		//determine whether the event will be bubbled up to parent
		bubbleUp: true,

		//determine whether the event will be propagated to other
		//area of the model system, it include parent, and horizontal reference
		continueEventing: true,

		//this is useful for validation
		hasError: false,

		//value is the value of current path,
		// in most of the case you should use this,
		//because you path can be dependent of change of other path
		currentValue: function ( keepOriginal ) {
			return via().get( keepOriginal, this.path );
		},

		currentProxy: function () {
			return via( this.path );
		},

		isModelEmpty: function () {

			var options = this.options;

			if ( !options ) {
				options = false;
			} else if ( isString( options ) ) {
				options = (options === "true");
			} else {
				options = !!options;
			}

			return this.currentProxy().isModelEmpty( options );
		}
	};

	function buildModelHandlerOptions(view, modelHandler, options ) {

		if ( isString( modelHandler ) && modelHandler.beginsWith( "*" ) ) {

			modelHandler = commonModelHandlers[modelHandler.substring( 1 )];

		}

		if ( isFunction( modelHandler.buildOptions ) ) {

			options = modelHandler.buildOptions.call(view, options );
		}
		return options;
	}

	//this is for the use of isView function
	function markAsView( elem ) {
		$( elem ).data( ns, true );
	}

	markAsView( dummyView );

	//this is to make removeModelHandler and getModelHandlerData function
	//runs faster by Short-circuit
	function isView( elem ) {
		return $( elem ).data( ns ) === true;
	}

	extend( via, {

		//it support two overload
		//addModelHandler(path, modelEvents, modelHandler, options)
		//addModelHandler(path, modelEvents, views, modelHandler, options)
		//if modelEvent == "once" is equivalent to via.renderViews,
		//it is good for declarative purpose
		addModelHandler: function ( path, modelEvents, views, modelHandler, options ) {

			if ( modelEvents === "once" ) {
				return this.renderViews( path, views, modelHandler, options );
			}

			//parameter shifting
			//this is the case when views is missing like the following
			//addModelHandler(path, modelEvents, modelHandler, options)
			if ( isString( views ) || isFunction( views ) ) {
				options = modelHandler;
				modelHandler = views;
				views = dummyView;
			}

			//this means ignore options
			if ( options === "_" ) {
				options = undefined;
			}

			path = toPhysicalPath( path, true );
			views = $( views );
			//
			if ( views.length > 0 && !modelHandlerData[path] ) {
				modelHandlerData[path] = [];
			}

			views.each( function () {

				options = buildModelHandlerOptions(this, modelHandler, options );

				markAsView( this );
				modelHandlerData[path].push( {
					view: this,
					modelHandler: modelHandler,
					modelEvents: modelEvents,
					options: options
				} );

				if ( shouldUpdateView( modelEvents, "init" ) ) {
					//"this" refers to a view
					invokeModelHandler( this, modelHandler, new ModelEvent( {
						path: path,
						target: path,
						eventType: "init",
						options: options
					} ) );
				}
			} );
			return via;
		},

		//it support removeModelHandler(path), removeModelHandler(views)
		//normally you don't need to call it explicitly, it is called in removing view and removing model
		removeModelHandler: function( pathOrViews ) {

			if ( isString( pathOrViews ) ) {
				//it is a path
				var path = toPhysicalPath( pathOrViews );

				for ( var key in modelHandlerData ) {
					if ( key.beginsWith( path ) ) {
						delete modelHandlerData[key];
					}
				}

			} else if ( isObject( pathOrViews ) ) {
				//it is a view
				$( pathOrViews ).each( function ( index, view ) {

					if ( !isView( view ) ) {
						return;
					}

					for ( var path in modelHandlerData ) {

						var commonModelHandlers = modelHandlerData[path];

						for ( var i = commonModelHandlers.length - 1; i >= 0; i-- ) {
							if ( commonModelHandlers[i].view === view ) {
								commonModelHandlers.splice( i, 1 );
							}
						}

						if ( commonModelHandlers.length === 0 ) {
							delete modelHandlerData[path];
						}
					}
				} );

			}
			return via;
		},

		// help you to debug what is inside modelHandlerData, it supports
		// getModelHandlerData(),
		// getModelHandlerData(path),
		// getModelHandlerData(view)
		getModelHandlerData: function( pathOrView ) {

			if ( isString( pathOrView ) ) {
				//it is a path
				//delete a path
				return modelHandlerData[toPhysicalPath( pathOrView )];

			} else if ( isObject( pathOrView ) ) {
				//is a view
				if ( !isView( pathOrView ) ) {
					return;
				}

				var rtn = {};

				for ( var path in modelHandlerData ) {

					var commonModelHandlers = modelHandlerData[path];

					for ( var i = commonModelHandlers.length - 1; i >= 0; i-- ) {

						if ( commonModelHandlers[i].view === pathOrView ) {
							rtn[path] = rtn[path] || [];
							rtn[path].push( commonModelHandlers[i] );
						}
					}
				}
				return rtn;

			} else if ( ! pathOrView ) {

				return modelHandlerData;
			}
		},

		renderViews: function( path, views, modelHandler, options ) {
			path = toPhysicalPath( path, true );

			$( views ).each( function () {

				options = buildModelHandlerOptions(this, modelHandler, options );

				//"this" refers to a view
				invokeModelHandler( this, modelHandler, new ModelEvent( {
					path: path,
					target: path,
					eventType: "init",
					options: options
				} ) );
			} );
			return via;
		},

		ModelEvent : ModelEvent,

		//shared commonModelHandlers
		commonModelHandlers : commonModelHandlers,

		raiseEvent : raiseEvent,

		indexOfPath : function ( path ) {
			var match = rIndex.exec( path );
			return match[1] || match[0];
		},

		contextOfPath : function ( path ) {
			var match = rParentKey.exec( path );
			return match && match[1] || "";
		}

	} );

	via.modelCleanups.push( via.removeModelHandler );

	jQueryFn.addModelHandler = function ( modelPath, modelEvents, modelHandler, options ) {
		//"this" refers to the view, the jQuery object
		via.addModelHandler( modelPath, modelEvents, this, modelHandler, options );
		return this;
	};

	jQueryFn.renderViews = function ( path, modelHandler, options ) {
		//"this" refers to the view, the jQuery object
		via.renderViews( path, this, modelHandler, options );
		return this;
	};

	//#debug
	via.debug.enableDebugger = false;

	via.commonModelHandlers.log = function ( modelEvent ) {

		var value = modelEvent.targetValue( true );
		log( modelEvent.eventType.replace( ".child", "" ), via.logicalPath( modelEvent.target ), isFunction( value ) ? "function call" : value );

		var enableDebugger = via.debug.enableDebugger;
		if ( isFunction( enableDebugger ) ) {
			enableDebugger = enableDebugger();
		}
		if ( enableDebugger ) {
			debugger;
		}
	};

	var logger = {};
	//add handler to the root object, so that all successful CRUD will
	//trigger this handler, the handler provide some debugging facilities
	//via.addModelHandler( "", "after", "*log" );
	via.debug.enableRootHandler = function ( eventType ) {
		via.removeModelHandler( logger );
		eventType = eventType || "*";
		via.addModelHandler( "", eventType, logger, "*log" );
	};

	via.debug.disableRootHandler = function () {
		via.removeModelHandler( logger );
	}

	via.debug.shouldUpdateView = shouldUpdateView;
	via.debug.dummyView = dummyView;
	via.debug.isView = isView;
	//#end_debug

	//#merge
})( jQuery, via );
//#end_merge
