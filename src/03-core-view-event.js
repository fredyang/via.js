/* depends: proxy.js, modelEvent.js, modelHandler.js */
/*depends */

//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var ns = via.ns();
	var isFunction = $.isFunction;
	var rootProxy = via();
	var rEventSeparator = /\s*\|\s*/;
	var proxyPrototype = via.fn;
	var jQueryFn = $.fn;
	var isString = via.isString;
	var isObject = via.isObject;
	var toPhysicalPath = via.physicalPath;
	var hasOwn = {}.hasOwnProperty;

	function markAsView( elem ) {
		$( elem ).data( ns, true );
	}

	function isView( elem ) {
		return $( elem ).data( ns ) === true;
	}

	//#end_merge

	function unmarkView( elem ) {
		$( elem ).removeData( ns );
	}

	/* {
	 *   key: function (viewEvent) {
	 *      //this refer the the view
	 *   }
	 * }
	 * */
	var commonViewHandlers = {},

		/* convert stringValue to a typed value
		 * {
		 *   key: function (stringValue) {
		 *      return a typed value
		 *   }
		 * }
		 * */
		valueConverters = {},

		/* {
		 * "customer.firstName" : [elem1, elem2, view3]
		 * }
		 * it is used to record what path is the update target of the view's event
		 * when view is deleted, this entry can be used to unbind the event
		 * also path is deleted, this entry can also be used to unbind the event
		 * */
		viewHandlerData = {};

	function ViewEvent( path, options, jQueryEvent, triggerData ) {
		if ( isObject( path ) ) {
			extend( this, path );
		} else {
			this.path = path;
			this.options = options;
			this.e = jQueryEvent;
			this.triggerData = triggerData;
		}
	}

	ViewEvent.prototype = {

		constructor: ViewEvent,

		targetProxy: function () {
			return via( this.path );
		},

		targetValue: function( keepOriginal ) {
			return rootProxy.get( keepOriginal, this.path );
		},

		targetContext: function () {
			return via.contextOfPath( this.path );
		},

		targetIndex: function () {
			return via.indexOfPath( this.path );
		},

		updateModel: function ( value ) {
			return rootProxy.update( this.path, value );
		},

		returnFalse: function () {
			this.e.stopPropagation();
			this.e.preventDefault();
		},

		stopPropagation: function () {
			this.e.stopPropagation();
		},

		stopImmediatePropagation: function () {
			this.e.stopImmediatePropagation();
		}
	};

	extend( via, {

		//viewHandler(button1, "blur|click", "text", "customer.firstName");
		addViewHandler: function ( views, viewEvents, path, viewHandler, options ) {

			path = toPhysicalPath( path, true );

			var originalHandler = viewHandler;

			//this means ignore options
			if ( options === "_" ) {
				options = undefined;
			}

			if ( isString( viewHandler ) && viewHandler.beginsWith( "*" ) ) {

				viewHandler = commonViewHandlers[viewHandler.substring( 1 )];

			}

			if ( isFunction( viewHandler.buildOptions ) ) {

				options = viewHandler.buildOptions( views, options );
			}

			//this is viewHandler.initialize view is useful, when the view is does not
			//natively support the event.
			if ( isFunction( viewHandler.initialize ) ) {
				viewHandler.initialize( views );
			}

			$( views ).each( function () {

				markAsView( this );

				//if original viewEvents is "click,dblClick",
				//and it bind to path "firstName", it will convert to
				//click.__via.firstName,dblClick.__via.firstName, the reason is that
				//when path is deleted, the method removeViewHandler(pathOrView) need to unbind
				// event by a namespace, if firstName is deleted, we can unbind ".__via.firstName"
				viewEvents = $.map(

					viewEvents.split( rEventSeparator ),

					function ( originalEventName ) {
						return originalEventName + "." + ns + "." + path;
					}

				).toString();

				//bind an event with a namespace
				//pass the binding through event data
				//use logicalPath is for unbind event, so that you can
				//unbind a specific event that bind to a view, when
				//a model is deleted
				$( this ).bind(
					viewEvents,

					{
						viewHandler: viewHandler, //"text"
						path: path,    //customer.firstName
						options: options,
						originalHandler: originalHandler
					},

					masterViewHandler );

				viewHandlerData[path] = viewHandlerData[path] || [];
				viewHandlerData[path].pushUnique( this );

			} );

			return via;
		},

		removeViewHandler : function ( pathOrViews ) {

			//remove viewHandler by path
			if ( isString( pathOrViews ) ) {

				var path = toPhysicalPath( pathOrViews );

				$( viewHandlerData[path] ).unbind( "." + ns + "." + path );

				delete viewHandlerData[path];

				//remove viewHandler by view
			} else if ( isObject( pathOrViews ) ) {

				$( pathOrViews ).unbind( "." + ns );

				$( pathOrViews ).each( function () {

					for ( var path in viewHandlerData ) {
						viewHandlerData[path].remove( this );
					}

				} );
			}
			return via;
		},

		removeView : function ( deleteViews ) {

			$( deleteViews ).each( function ( index, view ) {

				if ( !isView( this ) ) {
					return;
				}

				via.removeModelHandler( view )
					.removeViewHandler( view );

				unmarkView( this );

			} );
			return via;
		},

		commonViewHandlers : commonViewHandlers,

		valueConverters: valueConverters,

		ViewEvent : ViewEvent,

		//getViewHandlerData(path) returns all the views that will update the model
		//getViewHandlerData(view) returns all the model that view will update
		//getViewHandlerData() returns viewHandlerData object
		getViewHandlerData: function ( pathOrView ) {
			if ( isString( pathOrView ) ) {
				//this is a path;
				return viewHandlerData[pathOrView];

			} else if ( isObject( pathOrView ) ) {
				if ( !isView( pathOrView ) ) {
					return;
				}

				var rtn = [];
				for ( var key in viewHandlerData ) {
					if ( hasOwn.call( viewHandlerData, key ) ) {
						if ( viewHandlerData[key].contains( pathOrView ) ) {
							rtn.push( key );
						}
					}
				}

				return rtn;

			} else if ( !pathOrView ) {
				return viewHandlerData;
			}
		},

		getHandlerData: function ( pathOrView ) {
			var modelData = via.getModelHandlerData( pathOrView );
			var viewData = via.getViewHandlerData( pathOrView );
			if ( isString( pathOrView ) ) {
				return {
					viewsToBeUpdated: modelData,
					viewsUpdatingMe: viewData
				};
			} else {
				return {
					modelsUpdatingMe: modelData,
					modelsToBeUpdated: viewData
				};
			}
		}
	} );

	via.modelCleanups.push( via.removeViewHandler );

	//a handler that handle all the view events that trigger a change of model
	//the e.data is defined when the masterViewHandler is bind to an view
	function masterViewHandler( e, triggerData ) {
		var eventData = e.data,
			options = eventData.options,
			viewEvent = new ViewEvent( eventData.path, options, e, triggerData ),
			viewHandler = eventData.viewHandler;

		log( "vh", viewEvent.e.type, via.logicalPath( viewEvent.path ), eventData.originalHandler, eventData.options );

		if ( isFunction( viewHandler ) ) {

			return updateModel( viewEvent, viewHandler.call( this, viewEvent ) );

		} else if ( isString( viewHandler ) ) {

			var key1 = viewHandler.substring( 1 ),
				key2 = viewHandler.substring( 2 ),
				fn;

			//*xxx commonViewHandler
			if ( viewHandler.beginsWith( "*" ) ) {

				var commonViewHandler = commonViewHandlers[key1];
				if ( commonViewHandler ) {
					commonViewHandler.call( this, viewEvent );
					return;
				}

				//$xxx jQuery method
			} else if ( viewHandler.beginsWith( "$" ) ) {

				if ( isFunction( jQueryFn[key1] ) ) {

					return updateModel(
						viewEvent,
						( "css,attr,prop".contains( key1 ) ) ?
							$( this )[key1]( viewEvent.options || viewEvent.targetIndex() ) :
							$( this )[key1]()
					);
				}

				//p.xxx proxy method
			} else if ( viewHandler.beginsWith( "p." ) ) {

				if ( isFunction( proxyPrototype[key2] ) ) {
					//here execute the proxy method, "this" inside the function
					//does not refer to the view, but the the proxy itself
					viewEvent.targetProxy()[key2]( viewEvent );
					return;
				}

				//v.xxx view member
			} else if ( viewHandler.beginsWith( "v." ) ) {

				fn = this[key2];

				if ( isFunction( fn ) ) {
					return updateModel(
						viewEvent,
						fn.call( this, viewEvent )
					);
				}

				//m.xxx model member
			} else if ( viewHandler.beginsWith( "m." ) ) {

				fn = rootProxy.get( true, key2 );
				if ( isFunction( fn ) ) {
					return updateModel(
						viewEvent,
						fn.call( this, viewEvent )
					);
				}
			}
		}

		throw "view handler: '" + viewHandler + "' not found";
	}

	function updateModel( viewEvent, value ) {
		//if value is undefined, no need to update the model
		if ( value === undefined ) {
			return;
		}

		var options = viewEvent.options;
		if ( isString( options ) && options.beginsWith( "*" ) ) {
			var convert = valueConverters[options.substring( 1 )];
			if ( convert ) {
				value = convert( value );
			}
		}
		rootProxy.update( viewEvent.path, value );
	}

	var _cleanData = $.cleanData;

	$.cleanData = function ( elems ) {
		via.removeView( elems );
		_cleanData( elems );
	};

	via.forwardEvent = function ( oldEvent, newEvent, conditionFn ) {

		var handler = function ( e ) {
			if ( conditionFn( e ) ) {
				$( e.target ).trigger( extend( {}, e, {
					type: newEvent,
					currentTarget: e.target
				} ) );
			}
		};

		if ( $.event.special[newEvent] ) {
			throw "event '" + newEvent + "' has been defined";
		}

		$.event.special[newEvent] = {
			setup: function () {
				$( this ).bind( oldEvent, handler );
			},
			teardown: function () {
				$( this ).unbind( oldEvent, handler );
			}
		};

		return via;
	};

	function raiseViaEvent( e ) {

		var viaEventType = e.data,
			viaData = $( e.target ).data( "via" ),
			viaEventName = viaData && viaData.viewEvents && viaData.viewEvents[viaEventType];

		if ( viaEventName ) {
			$( e.target ).trigger( extend( {}, e, {
				type: viaEventType + "." + viaEventName,
				currentTarget: e.target
			} ) );
		}
	}

	//viaEvent is a special kind of view event, different from normal event like "click"
	//it is something like "action.delete", the "action" is 
	//via.addViewEvent("action", "click")
	via.addViaEvent = function ( viaEventType, originalEvent ) {
		$.event.special[viaEventType] = {
			setup: function () {
				//TODO: think again
				//make sure the handler is not double bound to the element
				//$( this ).unbind( originalEvent, raiseViewEvent );
				$( this ).bind( originalEvent, viaEventType, raiseViaEvent );
			},
			teardown: function () {
				$( this ).unbind( originalEvent, raiseViaEvent );
			}
		};
		return via;
	};

	jQueryFn.addViewHandler = function ( viewEvents, modelPath, viewHandler, options ) {
		via.addViewHandler( this, viewEvents, modelPath, viewHandler, options );
		return this;
	};

	//#merge
})( jQuery, via );
//#end_merge
