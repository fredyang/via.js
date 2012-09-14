//

//<@depends>modelProxy.js</@depends>

//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var modelLinks = via.util._modelLinks;
	var isFunction = $.isFunction;
	var shadowNamespace = via.debug.shadowNamespace;
	var isString = via.util.isString;
	var isObject = via.util.isObject;
	var trigger;
	var toPhysicalPath = via.util.toPhysicalPath;
	var isUndefined = via.util.isUndefined;
	var RegExp = window.RegExp;
	var viaFn = via.fn;
	var slice = [].slice;
	var util = via.util;
	var rootModel = via();
	var mergeLogicalPath = via.mergeLogicalPath;
	var isPromise = via.util.isPromise;
	//#end_merge

	var dummy = {},
		handlerObjStore,
		rEventSeparator = / /,
		rEndWithStarDot = /\*\.$/,
		rDotOrStar = /\.|\*/g,
		rEventTypeFirstPart = /^(\w+)\.?/,
		getters,
		setters,
		converters,
		initializers,
		disposers,
		finalizers,
		$fn = $.fn,
		accessSubs,
		viewId = 0,
		subscriptionStore = [ ],
		subscribe,
		unsubscribe,
		rInit = /init(\d*)/,
		standardFilterKeys = "get,set,convert,initialize,finalize,dispose".split( "," );

	function returnFalse () {
		return false;
	}

	function returnTrue () {
		return true;
	}

	function Event ( publisher, originalPublisher, eventType, proposed, removed ) {
		this.publisher = tryWrapPublisherSubscriber( publisher );
		this.originalPublisher = tryWrapPublisherSubscriber( originalPublisher );
		this.type = eventType;
		this.proposed = proposed;
		this.removed = removed;
	}

	Event.prototype = {
		consturctor: Event,

		/*	isOriginal: function() {
		 return this.publisher.path == this.originalPublisher.path;
		 },

		 isBubbleUp: function() {
		 return (this.publisher.path != this.originalPublisher.path) &&
		 (this.publisher.path.startsWith( this.originalPublisher.path ));
		 },*/
		isDependent: function() {
			return (!this.publisher.path.startsWith( this.originalPublisher.path ));
		},

		stopPropagation: function() {
			this.isPropagationStopped = returnTrue;
		},

		stopImmediatePropagation: function() {
			this.isImmediatePropagationStopped = returnTrue;
			this.isPropagationStopped = returnTrue;
			this.isCascadeStopped = returnTrue;
		},

		stopCascade: function() {
			this.isCascadeStopped = returnTrue;
		},

		error: function() {
			this.hasError = returnTrue;
		},

		isCascadeStopped: returnFalse,
		isPropagationStopped: returnFalse,
		isImmediatePropagationStopped: returnFalse,
		hasError: returnFalse,
		level: 0
	};

	// raise model event,
	trigger = function( publisherPath, originalPublisherPath, eventType, proposed, removed ) {

		var e = new Event( publisherPath, originalPublisherPath, eventType, proposed, removed );

		//event can be changed inside the function
		findAndInvokeModelHandlers( e );

		if (!e.isPropagationStopped() && e.publisher.path) {

			if (e.isDependent()) {
				//if is dependent event, the original event has been
				// bubbled up in its direct hierarchy
				//we need to change the hierarchy by setting the target
				e.originalPublisher.path = e.publisher.path;
			}

			//continue to the same instance of event object
			do {

				e.publisher.path = e.publisher.contextPath();
				e.level++;
				e.type = rEventTypeFirstPart.exec( e.type )[1] + "." + e.level;
				findAndInvokeModelHandlers( e );

			} while (!e.isPropagationStopped() && e.publisher.path);
		}

		//restore previous values
		e.type = eventType;
		e.originalPublisher.path = originalPublisherPath;
		e.publisher.path = publisherPath;
		return e;
	};

	//#merge
	//override the trigger defined in modelProxy.js module
	via._setTrigger( trigger );
	//#end_merge

	function getSubscriptionsBy ( target, match ) {
		if (isString( target )) {
			target = toPhysicalPath( target );
		}

		var rtn = [];
		for (var i = subscriptionStore.length - 1, item; i >= 0; i--) {
			item = subscriptionStore[i];
			if (match( item, target )) {
				rtn.push( item );
			}
		}
		return rtn;
	}

	accessSubs = {
		//subscriptions whose publisher is the parameter
		//publisher can be a model path or dom element, or object
		getByPublisher: function( publisher ) {
			return getSubscriptionsBy( publisher, function( item, target ) {
				return item.publisher == target;
			} );
		},

		//subscriptions whose subscriber is the parameter
		//subscriber can be a model path or dom element, or object
		getBySubscriber: function( subscriber ) {
			return getSubscriptionsBy( subscriber, function( item, target ) {
				return item.subscriber == target;
			} );
		},

		//object can be a model path or dom element, or object
		getByTarget: function( target ) {
			return !target ?
				subscriptionStore :
				getSubscriptionsBy( target, function match ( item, target ) {
					return item.subscriber == target || item.publisher == target;
				} );
		}
	};

	extend( via, {

		Event: Event,

		trigger: trigger,

		//function( subscriberOrPublisher ) {}
		subscriptions: accessSubs.getByTarget,

		//handler can be a function (e) {}
		// a string like "get set convert int"
		//or "*get *set *convert *int"
		//or it can be "*commonHandler"
		//or it can be { get:xx, set:xx, convert:xx, initialize: xx}
		//it can be a javascript object, dom element, but it can not be a jQuery object
		//subscriber can be null, "_", "null" to represent a case where there is not subscriber
		subscribe: subscribe = function( subscriber, publisher, eventTypes, handler, options, delegate ) {

			if (subscriber instanceof via) {
				subscriber = subscriber.path;
			}

			if (publisher instanceof via) {
				publisher = publisher.path;
			}

			if (isString( subscriber ) && subscriber.startsWith( "$" )) {
				subscriber = $( subscriber.substr( 1 ) );
			}

			if (subscriber && subscriber.jquery) {
				//subscriber is like $()
				//need to convert jQuery object into dom or raw element
				if (!subscriber.length && !subscriber.selector) {
					subscriber = null;
				} else {
					subscriber.each( function( index, element ) {
						//unwrap jQuery element
						subscribe( element, publisher, eventTypes, handler, options, delegate );
					} );
					return;
				}
			}

			if (isString( publisher ) && publisher.startsWith( "$" )) {
				publisher = $( publisher.substr( 1 ) );
			}

			if (publisher && publisher.jquery) {
				publisher.each( function( index, element ) {
					subscribe( subscriber, element, eventTypes, handler, options, delegate );
				} );
				return;
			}

			if (!publisher && publisher !== "") {
				throw "publisher can not be null";
			}

			if (!eventTypes) {
				throw "eventTypes can not be null";
			}

			//allow subscriber "", because this is the path of root model
			if (subscriber === "_" || subscriber == "null" || subscriber === null) {
				subscriber = dummy;
			}

			if (options === "_") {
				options = undefined;
			}

			var isPublisherModel = isString( publisher ),
				isSubscriberModel = isString( subscriber );

			markView( publisher );
			markView( subscriber );

			if (isPublisherModel) {
				//subscriber is a model
				publisher = toPhysicalPath( publisher );
			}

			if (isSubscriberModel) {
				//subscriber is a model
				subscriber = toPhysicalPath( subscriber );

			}

			if (isPublisherModel) {

				subscribeModelEvent( publisher, eventTypes, subscriber, handler, options );

			} else {

				subscribeViewEvent( publisher, eventTypes, subscriber, handler, options, delegate );
			}
		},

		//target is either subscriber or publisher
		unsubscribe: unsubscribe = function( target ) {

			var handler;

			if (isObject( target )) {
				if (!$( target ).viewId()) {
					return;
				}
				unMarkView( target );
			}

			for (var i = subscriptionStore.length - 1, subscription; i >= 0; i--) {
				subscription = subscriptionStore[i];
				handler = subscription.handler;

				if (canRemoveSubscriptionData( target, subscription.publisher, subscription.subscriber )) {

					//if publisher is an view object, need to unbind or undelegate
					//the jQuery event handler
					if (!isString( subscription.publisher )) {
						if (handler.delegateSelector) {
							$( subscription.publisher ).undelegate( handler.delegateSelector, subscription.eventTypes, viewHandlerGateway );

						} else {
							$( subscription.publisher ).unbind( subscription.eventTypes, viewHandlerGateway );
						}
					}

					handler.dispose &&
					handler.dispose( subscription.publisher, subscription.subscriber );

					subscriptionStore.splice( i, 1 );
				}

			}
		},

		//handlers( {
		//  handlerType: via.handlerType.model_model,
		//  handlers: {
		//          show: handler1,
		//          hide: handler2
		//      }
		//});

		//handlers ( {
		//  show: {
		//      type: via.handlerType.model_model,
		//      ...
		//  },
		//  hide: {
		//      ..
		//  }
		//});

		//handlers( "show",
		//  {
		//      type: xx,
		//      ...
		//  });


		//handlers( "show", xx,
		//  {
		//      ...
		//  });

		//a handler can be a string like "get set convert initialize finalize dispose"
		// or it can be an object
		/*
		 {
		 get: "xx" or function () {},
		 set: "xx" or function () {},
		 convert: "xx" or function () {},
		 initialize: "xx" or function () {},
		 finalize: "xx" or function () {},
		 dispose: "xx" or function () {}
		 }
		 */
		handlers: function( name, handler, overridingHandler ) {
			var key;
			if (isObject( name )) {
				for (key in name) {
					handlerObjStore[key] = buildHandlerObj( name[key] );
				}
				return;
			}

			if (isUndefined( name )) {
				return handlerObjStore;
			}

			if (isUndefined( handler )) {
				return handlerObjStore[name];
			}

			return (handlerObjStore[name] = overridingHandler ?
				extend( buildHandlerObj( handler ), overridingHandler ) :
				buildHandlerObj( handler ));

		},

		//common getter and setter are special filter in they way they are used
		//other filters use the key directly to reference the filters
		// but getters and setters need to use "*key" to reference getters and setters
		// if your getter/setter key does not begin with "*", then it will use the defaultGet
		//or defaultSet, and they key will become the getMethod, and optionally,
		// use options to pass the getProp value, the defaultGet/defaultSet
		// are not meant to be used directly like other common getters or setters
		filters: {

			//value = handler.get.apply( handler, [e].concat( extraParameters ) );
			//value = handler.get( e );
			//inside the getter function, 'this' refer to the handler
			//get(e)
			getters: getters = { },

			//handler.set( event, value )
			//inside setter function 'this' refer to the handler
			//set(e,value)
			setters: setters = { },

			//handler.convert( value, e );
			//inside converter function 'this' refer to handler
			converters: converters = {},

			//handler.initialize( publisher, subscriber, handler, options );
			//inside initialize function, 'this' refer to the window
			initializers: initializers = {},

			//handler.finalize( value );
			//inside the afterSet function, 'this' refer to the handler
			finalizers: finalizers = {
				//				saveLocal: function( value, e ) {
				//					util.local( e.publisher.path, value );
				//				}
			},

			//it is called when handler is unsubscribe
			//handler.dispose( publisher, subscriber);
			//inside dispose function 'this' refer to the handler
			disposers: disposers = {}
		}
	} );

	function defaultGet ( e ) {

		var handler = e.handler,
			getMethod = handler.getMethod,
			//getProp is used for method like css, attr, prop
			//check code in via.$comboMethods.contains( getOrSetMethod )
			getProp = handler.getProp,
			publisher = e.publisher;

		//"this" in the getMethod is model or jQuery
		return getProp ? publisher[getMethod]( getProp ) :
			isFunction( publisher[getMethod] ) ? publisher[getMethod]() :
				publisher[getMethod];
	}

	function defaultSet ( value, e ) {
		var handler = e.handler,
			setMethod = handler.setMethod,
			//setProp is used for method like css, attr, prop
			setProp = handler.setProp,
			subscriber = this;

		setProp ? subscriber[setMethod]( setProp, value ) :
			isFunction( subscriber[setMethod] ) ? subscriber[setMethod]( value ) :
				subscriber[setMethod] = value;
	}

	//target is either publisher or subscriber
	function canRemoveSubscriptionData ( target, publisher, subscriber ) {
		if (target === publisher || target === subscriber) {
			return true;
		} else {
			//if target is model path
			if (isString( target )) {
				return ( isString( publisher ) && publisher.startsWith( target + "." )) ||
				       ( isString( subscriber ) && subscriber.startsWith( target + "." ));
			} else {
				return false;
			}
		}

	}

	function addSubscription ( publisher, eventTypes, subscriber, handlerObj ) {
		subscriptionStore.push( {
			publisher: publisher,
			subscriber: subscriber,
			eventTypes: eventTypes,
			handler: handlerObj
		} );
	}

	handlerObjStore = {

		triggerChange: {
			get: function( e ) {
				rootModel.triggerChange( e.handler.options );
			}
		},
		saveLocal: {
			get: function( e ) {
				util.local( e.publisher.path, e.publisher.get() );
			}
		}
	};

	// -------- private ------------- //
	//the reason that we want to buildUniqueViewEventTypes is that
	//when unbind or undelegate the viewEventTypes, we want to the viewEventTypes
	//as unique as possible, check the unsubscribe method
	//
	//input: getUniqueViewEventTypes("click dblClick", viewWithViewId3, "customer")
	//output: "click.__via.3.customer dblClick.__via.3.customer"
	//input: getUniqueViewEventTypes("click dblClick", viewWithViewId3, viewWithViewId4)
	//output: "click.__via.3.4 dblClick.__via.3.4"
	//it try to append an event name with and ".__via.viewId.subscriberId"
	function buildUniqueViewEventTypes ( originalEventTypes, publisherView, subscriberModelPath ) {

		var publisherViewId = $( publisherView ).viewId();

		/*	if original viewEvents is "click dblClick",
		 and it bind to path "firstName", it will convert to
		 click.__via.firstName dblClick.__via.firstName, the reason is that
		 when path is deleted, the method unbind(object) need to unbind
		 event by a namespace, if firstName is deleted, we can unbind ".__via.firstName"*/
		return $.map(
			originalEventTypes.split( rEventSeparator ),
			function( originalEventName ) {
				return isString( subscriberModelPath ) ?
					originalEventName + "." + shadowNamespace + "." + publisherViewId + "." + subscriberModelPath :
					originalEventName + "." + shadowNamespace + "." + publisherViewId + "." + $( subscriberModelPath ).data( shadowNamespace );
			}
		).join( " " );
	}

	//if object is dom element or jQuery selector then wrap into jQuery
	//if object is model path, wrap it into model
	//if it is pure object, return as it is
	//if it is _, return null
	function tryWrapPublisherSubscriber ( publisherOrSubscriber ) {
		if (isString( publisherOrSubscriber )) {
			return via( publisherOrSubscriber );

		} else if (publisherOrSubscriber == dummy) {
			return null;
		}
		else if (isObject( publisherOrSubscriber ) && !publisherOrSubscriber.nodeType) {
			//not a DOM element
			return publisherOrSubscriber;
		} else {
			return $( publisherOrSubscriber );
		}
	}

	//if entities is view, then mark it as view
	//this is serve two purpose, one for quick search
	//another is for namespace
	function markView ( object ) {
		if (isObject( object ) && !$( object ).data( shadowNamespace )) {
			$( object ).data( shadowNamespace, ++viewId );
		}
	}

	function unMarkView ( object ) {
		$( object ).removeData( shadowNamespace );
	}

	function replaceDotAndStar ( $0 ) {
		return $0 == "." ? "\\." : ".*";
	}

	function findMatchedEvents ( subscribedEvents, triggeringEvent ) {
		var match, rTemp, eventSubscribed, needToCheckStarDot, i;

		if (subscribedEvents === "*") {
			return "*";
		}

		subscribedEvents = subscribedEvents.split( rEventSeparator );

		for (i = 0; i < subscribedEvents.length; i++) {

			eventSubscribed = subscribedEvents[i];

			needToCheckStarDot = rEndWithStarDot.test( eventSubscribed );
			if (needToCheckStarDot) {
				eventSubscribed = eventSubscribed.replace( rEndWithStarDot, "" );
			}

			rTemp = eventSubscribed.replace( rDotOrStar, replaceDotAndStar );

			rTemp = needToCheckStarDot ? new RegExp( "^" + rTemp ) :
				new RegExp( "^" + rTemp + "$" );

			match = rTemp.test( triggeringEvent );
			if (match) {
				if (needToCheckStarDot) {

					//&& $.browser.msie, if rTemp is /^/, in IE, RegExp.rightContext
					//can return the "", which is wrong, have to do this hack
					var remaining = rTemp.source == "^" ? triggeringEvent : RegExp.rightContext;

					if (!remaining || !remaining.contains( "." )) {
						return subscribedEvents[i];
					}
				} else {
					return subscribedEvents[i];
				}
			}
		}
	}

	//e is mutable
	function findAndInvokeModelHandlers ( e ) {

		var subscription,
			observingModels,
			sideEvent,
			i,
			j,
			subscriptionsByPublisher = e.publisher.subsFromOthers();

		if (subscriptionsByPublisher.length) {

			for (i = 0; i < subscriptionsByPublisher.length; i++) {

				subscription = subscriptionsByPublisher[i];

				e.subscribedEvent = findMatchedEvents( subscription.eventTypes, e.type );
				if (e.subscribedEvent) {
					executeHandlerObj( tryWrapPublisherSubscriber( subscription.subscriber ), subscription.handler, e );
				}

				if (e.isImmediatePropagationStopped()) {
					return;
				}
			}
		}

		//only "after" event will do side tracking
		//because referencing model don't care about before state of referenced model
		//		if (event.eventType.startsWith( "after" )) {
		//			// wrap the following code there , if we want to improve performance
		//		}

		if (!e.isCascadeStopped()) {

			observingModels = modelLinks[e.publisher.path];

			if (observingModels) {
				for (j = 0; j < observingModels.length; j++) {

					//trigger = function( publisher, originalPublisher, eventType, proposed, removed ) {
					sideEvent = trigger(
						observingModels[j],
						e.originalPublisher.path,
						e.type
					);

					if (sideEvent.isImmediatePropagationStopped() || sideEvent.isImmediatePropagationStopped()) {
						return;
					}

					if (sideEvent.hasError()) {
						e.error();
					}
				}
			}
		}
	}

	//#debug
	function unwrapObject ( object ) {
		if (object) {
			if (!isUndefined( object.path )) {
				return via.util.toLogicalPath( object.path );
			} else {
				return object[0];
			}
		} else {
			return "null"
		}
	}

	//#end_debug

	function executeHandlerObj ( subscriber, handlerObj, e, triggerData ) {

		//#debug
		log( unwrapObject( e.publisher ),
			e.type,
			unwrapObject( subscriber ),
			handlerObj,
			unwrapObject( e.originalPublisher )
		);
		//#end_debug

		var value,
			clonedEventArg;

		e.handler = handlerObj;

		if (!isUndefined( triggerData )) {
			//in the get method "this" refer to the handler
			value = handlerObj.get.apply( subscriber, [e].concat( triggerData ) );
		} else {
			//in the get method "this" refer to the handler
			value = handlerObj.get.call( subscriber, e );
		}

		if (isPromise( value )) {
			clonedEventArg = extend( true, {}, e );
			value.done( function( value ) {
				if (handlerObj.convert) {
					//in the convert method "this" refer to the handler
					value = handlerObj.convert.call( subscriber, value, e );
				}

				if (!isUndefined( value )) {
					//make sure it is a real promise object
					if (isPromise( value )) {
						value.done( function( value ) {
							setAndFinalize( subscriber, handlerObj, value, clonedEventArg );
						} );

					} else {
						return setAndFinalize( subscriber, handlerObj, value, e );
					}
				}
			} );
		} else {
			if (handlerObj.convert) {
				//in the convert method "this" refer to the handler
				value = handlerObj.convert.call( subscriber, value, e );
			}

			if (!isUndefined( value )) {
				//make sure it is a real promise object
				if (isPromise( value )) {
					clonedEventArg = extend( true, {}, e );
					value.done( function( value ) {
						setAndFinalize( subscriber, handlerObj, value, clonedEventArg );
					} );

				} else {
					return setAndFinalize( subscriber, handlerObj, value, e );
				}
			}
		}

	}

	function setAndFinalize ( subscriber, handler, value, e ) {
		if (!isUndefined( value )) {
			handler.set && handler.set.call( subscriber, value, e );

			if (!isUndefined( value ) && handler.finalize) {
				return handler.finalize.call( subscriber, value, e );
			}
		}
	}

	function subscribeModelEvent ( publisherPath, eventTypes, subscriber, handler, options ) {

		var match,
			delayMiniSecond,
			initEvent,
			handlerObj,
			events;

		events = eventTypes.split( " " );

		for (var i = 0; i < events.length; i++) {
			match = rInit.exec( events[i] );
			if (match) {
				initEvent = events[i];
				delayMiniSecond = +match[1];
				events.splice( i, 1 );
				eventTypes = events.join( " " );
				break;
			}
		}

		handlerObj = buildHandlerObj( handler, publisherPath, subscriber, options );

		if (eventTypes) {
			addSubscription( publisherPath, eventTypes, subscriber, handlerObj );
		}

		if (initEvent) {
			var init = function() {
				var e = new Event( publisherPath, publisherPath, initEvent );
				executeHandlerObj( tryWrapPublisherSubscriber( subscriber ), handlerObj, e );
			};

			if (delayMiniSecond) {
				setTimeout( init, delayMiniSecond );
			} else {
				init();
			}
		}
	}

	//subscribe jQuery event
	function subscribeViewEvent ( viewPublisher, eventTypes, subscriber, handler, options, delegateSelctor ) {

		//get/set/convert/[init]/[options]
		var needInit,
			eventSeedData,
			handlerObj,
			temp;

		temp = eventTypes.split( " " );

		if (temp.contains( "init" )) {
			needInit = true;
			eventTypes = temp.remove( "init" ).join( " " );
		}

		handlerObj = buildHandlerObj( handler, viewPublisher, subscriber, options );

		eventSeedData = {
			handler: handlerObj,
			subscriber: subscriber
		};

		if (eventTypes) {
			eventTypes = buildUniqueViewEventTypes( eventTypes, viewPublisher, subscriber );

			if (delegateSelctor) {
				handlerObj.delegateSelector = delegateSelctor;
				$( viewPublisher ).delegate( delegateSelctor, eventTypes, eventSeedData, viewHandlerGateway );

			} else {
				$( viewPublisher ).bind( eventTypes, eventSeedData, viewHandlerGateway );

			}

			//we have passed handler, subscriber, options as jQuery eventSeedData,
			//we still need to add them to subscriptions so that
			//the view event handler can be unbind or undelegate
			addSubscription( viewPublisher, eventTypes, subscriber, handlerObj );

			if (needInit) {
				if (delegateSelctor) {
					$( viewPublisher ).find( delegateSelctor ).trigger( eventTypes );
				} else {
					$( viewPublisher ).trigger( eventTypes );
				}
			}

		} else if (needInit) {

			$( viewPublisher ).one( "init", eventSeedData, viewHandlerGateway );
			$( viewPublisher ).trigger( "init" );

		}
	}

	//the general jQuery event handler
	function viewHandlerGateway ( e ) {

		e.publisher = tryWrapPublisherSubscriber( e.currentTarget );
		e.originalPublisher = tryWrapPublisherSubscriber( e.target );
		var subscriber = tryWrapPublisherSubscriber( e.data.subscriber );

		var handlerObj = e.data.handler;
		delete e.data;

		if (arguments.length > 1) {
			executeHandlerObj( subscriber, handlerObj, e, slice.call( arguments, 1 ) );

		} else {
			executeHandlerObj( subscriber, handlerObj, e );
		}
	}

	function buildHandlerObj ( handler, publisher, subscriber, options ) {

		var handlerObject;

		handler = handler || "";

		if (isString( handler )) {

			// handler is like "*handlerKey" or "get set convert initialize finalize dispose"
			handlerObject = buildHandlerObjFromString( handler, publisher, subscriber );

		} else if (isFunction( handler ) || (isObject( handler ) && handler.get)) {

			handlerObject = handler;
			if (isFunction( handler )) {
				handlerObject.get = handler;
			}

			//if subscriber is a model and set is missing, use model set
			if (!handlerObject.set && !isUndefined( subscriber ) && isString( subscriber )) {
				handlerObject.set = "set";
			}

		} else {
			throw "invalid handler";
		}

		if (!isUndefined( publisher ) && !isUndefined( subscriber )) {
			initializeHandlerObject( handlerObject, publisher, subscriber, options );
		}

		decorateHandlerObjWithFilter( handlerObject, publisher, subscriber );

		return handlerObject;
	}

	function initializeHandlerObject ( handlerObject, publisher, subscriber, options ) {

		var initialize = handlerObject.initialize;

		if (isString( initialize )) {
			if (initialize.startsWith( "*" )) {
				initialize = initializers[initialize.substring( 1 )];
				if (!initialize) {
					throw "common initializer does not exist!";
				}
			} else {
				var path = initialize;
				if (!rootModel.helper( path )) {
					throw "initializer does not exist at path " + path;
				}
				initialize = function( publisher, subscriber, handlerObject, options ) {
					rootModel.set( path, publisher, subscriber, handlerObject, options );
				};
			}
		}
		if (initialize) {
			initialize( tryWrapPublisherSubscriber( publisher ), tryWrapPublisherSubscriber( subscriber ), handlerObject, options );
			delete handlerObject.initialize;
		} else if (!isUndefined( options )) {
			handlerObject.options = options;
		}

	}

	function ensureTargetHasAccessor ( accessorType, filterName, target ) {
		var missingMember;
		if (isString( target )) {

			if (!viaFn[filterName]) {

				missingMember = true;
			}

		} else {
			if (target.nodeType) {
				if (!$fn[filterName]) {
					missingMember = true;
				}
			} else if (!(filterName in target)) {
				missingMember = true;
			}
		}

		if (missingMember) {
			throw (accessorType == "get" ? "publisher" : "subscriber") +
			      " does not have a member " + filterName;
		}

	}

	function getModelHelperAsFilter ( handlerString, publisher, subscriber ) {
		if (handlerString.startsWith( "#" )) {
			handlerString = handlerString.substr( 1 );
			return isString( subscriber ) ? rootModel.helper( mergeLogicalPath( subscriber, handlerString ) ) :
				isString( publisher ) ? rootModel.helper( mergeLogicalPath( publisher, handlerString ) ) :
					rootModel.helper( handlerString );
		}
	}

	function buildHandlerObjFromString ( handlerString, publisher, subscriber ) {

		//get set convert initialize finalize dispose
		var handlerObject,
			modelMethod,
			filterKey,
			filterKeys = handlerString.split( rEventSeparator ),
			isPublisherModel = isString( publisher ),
			isSubscriberModel = isString( subscriber );

		if (filterKeys.length == 1) {
			if (handlerString.startsWith( "*" )) {
				handlerObject = handlerObjStore[handlerString.substr( 1 )];
				if (!handlerObject) {
					throw "common handler " + handlerString + " does not exist";
				}

				handlerObject = extend( {}, handlerObject );

			} else if ((modelMethod = getModelHelperAsFilter( handlerString, publisher, subscriber ))) {

				handlerObject = {
					get: modelMethod
				};

			} else if (!isUndefined( publisher ) && !isUndefined( subscriber )) {

				//infer handler from publisher and subscriber,
				if (isPublisherModel) {
					//When model change, handler
					//will get model's value using default get filter,
					//and update the view using default "set" filter or handler
					handlerObject = {
						get: "get",
						//if handlerString is null, then it should be the case when model subscribe model
						set: handlerString || "set"
					};

				} else if (isSubscriberModel) {
					// model subscribe view's change
					if (handlerString) {
						handlerObject = {
							get: handlerString,
							set: "set"
						};
					} else {
						//when model subscribe view without handler
						//the model is the handler by itself
						handlerObject = {
							get: rootModel.helper( subscriber )
						};
					}

				} else {
					//view subscribe view's event
					//this is rarely the case, but it is still supported
					//for example, a textBox subscribe the change of another textBox
					handlerObject = {
						get: handlerString,
						set: handlerString
					};
				}
			}

			//filterKeys has more than one keys
		} else {

			//the handler string has multiple filters
			handlerObject = { };

			for (var i = 0; i < standardFilterKeys.length; i++) {
				filterKey = filterKeys[i];
				if (filterKey && (filterKey !== "_" && filterKey != "null")) {
					if ((modelMethod = getModelHelperAsFilter( filterKey, publisher, subscriber ))) {
						handlerObject[standardFilterKeys[i]] = modelMethod;
					} else {
						handlerObject[standardFilterKeys[i]] = filterKey;
					}
				}
			}
		}
		return handlerObject;

	}

	function decorateHandlerObjWithFilter ( handlerObject, publisher, subscriber ) {
		attachFilter( handlerObject, "initialize", initializers );
		//
		attachAccessor( "get", handlerObject, publisher, subscriber );
		attachAccessor( "set", handlerObject, publisher, subscriber );
		//
		attachFilter( handlerObject, "convert", converters );
		attachFilter( handlerObject, "finalize", finalizers );
		attachFilter( handlerObject, "dispose", disposers );
	}

	function attachAccessor ( accessorType, handlerObj, publisher, subscriber ) {

		//by default handlerObj.get == "get", handlerObj.set = "set"
		var accessorKey = handlerObj[accessorType];

		//if handler's get/set filter is non-empty string, continue next
		//otherwise return
		if (!isString( accessorKey ) || accessorKey == "") {
			return;
		}

		var accessors = accessorType == "get" ? getters : setters;

		if (accessorKey.startsWith( "*" )) {

			accessorKey = accessorKey.substr( 1 );
			handlerObj[accessorType] = accessors[accessorKey];

			if (!handlerObj[accessorType]) {
				throw accessorKey + " does not exists common " + accessorType + " filter";
			}

		} else {

			var keys = accessorKey.split( "*" );

			//use defaultGet or defaultSet and decorate, if accessorKey does not begin with "*"
			// handler.setMethod = accessorKey or
			// handler.getMethod = accessorKey
			handlerObj[accessorType] = accessorType == "get" ? defaultGet : defaultSet;
			handlerObj[accessorType + "Method"] = keys[0];

			if (keys[1]) {
				//accessorKey = "css*color"
				handlerObj[accessorType + "Prop"] = keys[1];
			}

			if (!isUndefined( publisher ) && !isUndefined( subscriber )) {
				var publisherOrSubscriber = accessorType == "get" ? publisher : subscriber;
				ensureTargetHasAccessor( accessorType, keys[0], publisherOrSubscriber );
			}

		}
	}

	//filterType is like initialize, convert, finalize, dispose
	function attachFilter ( handler, filterType, filters ) {
		//because it is optional, we need make sure handler want to have this method
		var filterName = handler[filterType];
		if (isString( filterName )) {

			if (filterName.startsWith( "*" )) {
				handler[filterType] = filters[filterName.substr( 1 )];
			} else {
				handler[filterType] = function() {
					return rootModel.set.apply( rootModel, [filterName].concat( slice.call( arguments ) ) );
				};
			}
		}
	}

	via.onDisposing( unsubscribe );

	//subscription shortcut method for model
	extend( viaFn, {

		subscribe: function( publisher, events, handler, options, delegate ) {
			subscribe( this.path, publisher, events, handler, options, delegate );
			return this;
		},

		subscribedBy: function( subscriber, events, handler, options, delegate ) {
			subscribe( subscriber, this.path, events, handler, options, delegate );
			return this;
		},

		unsubscribe: function() {
			unsubscribe( this.path );
			return this;
		},

		subsFromOthers: function() {
			return accessSubs.getByPublisher( this.path );
		},

		subsFromMe: function() {
			return accessSubs.getBySubscriber( this.path );
		},

		subscriptions: function() {
			return accessSubs.getByTarget( this.path );
		},

		/*conditionally map an model event to a new model event based on a condition(predicate)

		 via("inventory").mapEvent(
		 "afterUpdate",
		 "inventoryLow",
		 function (value) {
		 return value <= 100;
		 }
		 );

		 compare to $fn.aliasEvent(),
		 aliasEvent works for an jQuery object, and it is unconditionaly*/
		mapEvent: function( sourceModelEventType, targetModelEventType, predicate ) {
			subscribe( this.path, this.path, sourceModelEventType, function( e ) {
				if (predicate( e.publisher.get(), e )) {
					trigger( e.publisher.path, e.originalPublisher.path, targetModelEventType, e.proposed, e.removed );
				}
			} );
			return this;
		},

		saveLocalAfterUpdate: function( subPath ) {
			via.subscribe( null, this.fullPath( subPath ), "after*", "*saveLocal" );
			return this;
		}

	} );

	//subscription shortcut method for jQuery object
	extend( $fn, {

		subscribe: function( publisher, events, handler, options, delegate ) {
			if (this.length) {
				subscribe( this, publisher, events, handler, options, delegate );
			}
			return this;
		},

		subscribedBy: function( subscriber, events, handler, options, delegate ) {
			if (this.length) {
				subscribe( subscriber, this, events, handler, options, delegate );
			}
			return this;
		},

		unsubscribe: function() {
			return this.each( function() {
				unsubscribe( this );
			} );
		},

		subsFromOthers: function() {
			return accessSubs.getByPublisher( this[0] );
		},

		subsFromMe: function() {
			return accessSubs.getBySubscriber( this[0] );
		},

		subscriptions: function() {
			return accessSubs.getByTarget( this[0] );
		},

		initView: function( path, handler, options ) {
			subscribe( this, path, "init", handler, options );
			return this;
		},

		viewId: function() {
			return this.data( shadowNamespace );
		},

		//unconditionally trigger an new event of a single jQuery object
		// when old event trigger to the object
		//basically is it create alias for an event of a jQuery object
		//usage
		//$("button").aliasEvent("click", "update");
		aliasEvent: function( sourceEventType, targetTargetType ) {
			this.bind( sourceEventType, function( e ) {
				$( this ).trigger( targetTargetType );
			} );
		}
	} );

	// create a special jQuery (y) event based on an existing jQuery event (x)
	// when event x is raised, and predicate returns true, event y will raised
	// you can subscribe event y, like any jQuery event using
	//$("button").bind("y", fn);
	$.createFilterEvent = function( originalEventType, newEventType, predicate ) {
		var handler = function( e ) {
			if (predicate === true || predicate( e )) {
				$( e.target ).trigger( extend( {}, e, {
					type: newEventType,
					currentTarget: e.target
				} ) );
			}
		};

		if ($.event.special[newEventType]) {
			throw "event '" + newEventType + "' has been defined";
		}

		$.event.special[newEventType] = {
			setup: function() {
				$( this ).bind( originalEventType, handler );
			},
			teardown: function() {
				$( this ).unbind( originalEventType, handler );
			}
		};
		return this;
	};

	var _cleanData = $.cleanData;
	//when an dom element is remove unsubscribe it first
	$.cleanData = function( elems ) {
		$( elems ).each( function() {
			unsubscribe( this );
		} );
		_cleanData( elems );
	};

	util.getUniqueViewEventTypes = buildUniqueViewEventTypes;
	util._viewHandlerGateway = viewHandlerGateway;

	//#merge
	via.debug.findMatchedEvents = findMatchedEvents;
	via.debug.buildHandlerObj = buildHandlerObj;
	via.debug.defaultGet = defaultGet;
	via.debug.defaultSet = defaultSet;
	//#end_merge

	//#merge
})
	( jQuery, via );
//#end_merge

