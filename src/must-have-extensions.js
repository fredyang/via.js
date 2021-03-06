//
//<@depends>eventSubscription.js, modelProxy.js, declarative.js, template.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var viaClasses = via.classes;
	var isBoolean = via.util.isBoolean;
	var toTypedValue = via.util.toTypedValue;
	var userSubsProps = via.userSubsProps;
	var buildTemplatePipeline = via.template.buildTemplatePipeline;
	var isArray = $.isArray;
	var isUndefined = via.util.isUndefined;
	var rootModel = via();
	var subscribe = via.subscribe;
	var defaultOptions = via.options;
	var isFunction = $.isFunction;

	function returnTrue () {
		return true;
	}

	//#end_merge

	defaultOptions.confirmMessage = "Are you sure?";

	var viewValueAdapters,
		toString = function( value ) {
			return (value === null || value === undefined) ? "" : "" + value;
		};

	extend( true, via.filters, {

		getters: {

			getOriginalModel: function( e ) {
				return e.originalPublisher.get();
			},

			//this is gateway to adapter function defined in viewAdapter.get
			getViewValue: function( e ) {
				return e.handler.getViewValue( e.publisher );
			}
		},
		setters: {

			//this is gateway to adapter function defined in viewAdapter.set
			setViewValue: function( value, e ) {
				return e.handler.setViewValue( this, value, e );
			}
		},
		converters: {

			toString: toString,

			toTypedValue: toTypedValue,

			toNumber: function( value ) {
				return +value;
			},

			toDate: function( value ) {
				return new Date( value );
			}

			/*	toggle: function( value ) {
			 return !value;
			 },






			 toJsonString: function( value ) {
			 return JSON.stringify( value );
			 },
			 toJsonObject: function( value ) {
			 return JSON.parse( value );
			 }*/
		}
	} );

	via.pipeline( {

		/*-------the following model handlers take care of view-----------*/

		//set view value with model value
		updateViewValue: {
			initialize: function( publisher, subscriber, handler, options ) {
				var adapter = findViewValueAdapter( subscriber, options );
				if (!adapter || !adapter.set) {
					throw "can not find set method for view";
				}
				handler.setViewValue = adapter.set;
				if (adapter.initialize && !subscriber.data( "accesserInitialized" )) {
					adapter.initialize( subscriber );
					subscriber.data( "accesserInitialized", true );
				}
			},
			get: "get",
			set: "*setViewValue"
		},

		//set model value with view value
		updateModelValue: {
			initialize: function( publisher, subscriber, handler, options ) {
				var adapter = findViewValueAdapter( publisher, options );
				if (!adapter || !adapter.get) {
					throw "can not find get method for view";
				}
				handler.getViewValue = adapter.get;
				if (adapter.initialize && !publisher.data( "accesserInitialized" )) {
					adapter.initialize( publisher );
					subscriber.data( "accesserInitialized", true );

				}
			},
			get: "*getViewValue",
			set: "set"
		},

		//add model handlers
		//render <select> options
		options: {
			//this is actually the execute function, in this handler
			//there is no set, the content of the view is render
			//in the get function.
			get: function( e ) {

				var options = e.handler.options,
					subscriber = this,
					value = subscriber.val();

				subscriber.children( "option[listItem]" )
					.remove().end().append(
					function() {
						var html = "";
						$( e.publisher.get() ).each( function() {
							html += "<option listItem='1' value='" + options.value( this ) + "'>" + options.name( this ) + "</option>";
						} );
						return html;
					} ).val( value );

				if (subscriber.val() !== value) {
					$( subscriber.trigger( "change" ) );
				}
			},

			initialize: function( publisher, subscriber, pipeline, options ) {
				if (options) {
					var parts = options.split( "," );
					var textColumn = parts[0];
					var valueColumn = parts[1] || parts[0];

					pipeline.options = {
						name: function( item ) {
							return item[textColumn];
						},
						value: function( item ) {
							return item[valueColumn];
						}
					};

				} else {

					pipeline.options = {
						name: function( item ) {
							return item.toString();
						},
						value: function( item ) {
							return item.toString();
						}
					};
				}
			}
		},
		//a handler is a function , it become the getFilter of real handler
		hide: function( e ) {

			this[ isUndefined( e.handler.options ) ?
				e.publisher.isEmpty() ? "show" : "hide" :
				e.publisher.compare( e.handler.options ) ? "hide" : "show"]();

		},
		show: function( e ) {

			this[ isUndefined( e.handler.options ) ?
				e.publisher.isEmpty() ? "hide" : "show" :
				e.publisher.compare( e.handler.options ) ? "show" : "hide"]();
		},
		showPlural: function( e ) {
			var value = e.publisher.get(),
				count = value.length || value;
			this[ count > 1 ? "show" : "hide"]();
		},

		textCount: function( e ) {
			var value = e.publisher.get(),
				count = ( "length" in value) ? value.length : value;

			this.text( count );
		},

		enable: function( e ) {
			this.attr(
				"disabled",
				isUndefined( e.handler.options ) ? e.publisher.isEmpty() :
					!e.publisher.compare( e.handler.options )
			);
		},

		disable: function( e ) {
			this.attr(
				"disabled",
				isUndefined( e.handler.options ) ? !e.publisher.isEmpty() :
					e.publisher.compare( e.handler.options )
			);
		},

		//this is useful for debugging
		//via.classes.showValue = "!init after*:.|*showValue"";
		showValue: function( e ) {
			this.html( "<span style='color:red'>" + e.publisher.path + " : " + e.publisher.toJSON() + "</span>" );
		},
		//the following are array model handlers
		//
		//handle when an item is appended to the array,
		// an event afterCreate.x (x is number) will be raised, and this handler will be triggered
		//
		//the reason to use getOriginalModel is that
		//the handler may be attached to the items array
		appendTmplItem: buildTemplatePipeline(
			"*getOriginalModel", //getFilter
			"append"  //setFilter
		),
		//handle when an item is updated in an array,
		//an event afterUpdate.x (x is number) will be raised
		updateTmplItem: buildTemplatePipeline(
			//getFilter
			function( e ) {
				return e.publisher.get( childIndex( e ) );
			},
			//setFilter
			function( value, e ) {
				this.children().eq( +childIndex( e ) ).replaceWith( value );
			} ),
		//handle when an item is removed from an array,
		//an event afterDel.1 will be raised
		removeTmplItem: {
			get: function( e ) {
				this.children().eq( +childIndex( e ) ).remove();
			}
		},

		addClass: function( e ) {
			this[e.publisher.get() ? "addClass" : "removeClass" ]( e.handler.options );
		},

		removeClass: function( e ) {
			this[e.publisher.get() ? "removeClass" : "addClass" ]( e.handler.options );
		},

		focus: function( e ) {
			if (e.publisher.get()) {
				var subscriber = this;
				setTimeout( function() {
					subscriber.focus();
				}, 1 );
			}
		},

		/*-------the following view handlers take care of model-----------*/
		del: function( e ) {
			this.del();
		},

		"++": function( e ) {
			this.set( this.get() + 1 );
		},
		"--": function( e ) {
			this.set( this.get() - 1 );
		},

		hardCode: {
			initialize: function( publisher, subscriber, pipeline, options ) {
				pipeline.hardCode = toTypedValue( options );
			},
			get: function( e ) {
				this.set( e.handler.hardCode );
			}
		},
		"null": function( e ) {
			this.set( null );
		},
		"true": function( e ) {
			this.set( true );
		},
		"false": function( e ) {
			this.set( false );
		},
		toggle: function( e ) {
			var subscriber = this;
			subscriber.set( !subscriber.get() );
		},
		"0": function( e ) {
			this.set( 0 );
		},
		preventDefault: function( e ) {
			e.preventDefault();
		},
		stopPropagation: function( e ) {
			e.stopPropagation();
		},
		alert: function( e ) {
			alert( isUndefined( e.handler.options ) ? this.get() : e.handler.options );
		},
		log: function( e ) {
			console.log( isUndefined( e.handler.options ) ? this.get() : e.handler.options );
		},
		sort: {
			initialize: function( publisher, subscriber, pipeline, options ) {
				options = options.split( "," );
				pipeline.by = options[0];
				pipeline.asc = !!options[1];
			},
			get: function( e ) {
				var handler = e.handler;
				this.sort( handler.by, handler.asc );
				handler.asc = !handler.asc;
			}
		},
		confirm: function( e ) {

			var message = isUndefined( e.handler.options ) ? this.get() :
				(e.handler.options || defaultOptions.confirmMessage);

			if (!confirm( message )) {
				e.stopImmediatePropagation();
			}
		},

		moveUp: function( e ) {
			var selectedIndex = e.selectedRowIndex();
			this.move( selectedIndex, selectedIndex - 1 );
		},

		moveDown: function( e ) {
			var selectedIndex = e.selectedRowIndex();
			this.move( selectedIndex, selectedIndex + 1 );
		},

		removeRow: function( e ) {
			var index = e.selectedRowIndex();

			var items = this.helper();
			if (isFunction( items )) {
				//this is case when items is model*queryResult
				items = this.get();
				this.mainModel().removeItem( items[index] );

			} else {

				this.removeAt( index );
			}

			e.stopImmediatePropagation();

		}
	} );

	//get the index of the item in a array
	function childIndex ( e ) {
		var diff = e.originalPublisher.path.substr( e.publisher.path.length + 1 ),
			positionOfDot = diff.indexOf( "." );
		return positionOfDot == -1 ? diff : diff.substr( 0, positionOfDot );
	}

	//the last view adapter will be matched first
	function findViewValueAdapter ( $elem, adpaterName ) {
		var i, viewValueAdapter;
		//the last view adapter will be matched first
		if (adpaterName) {
			for (i = viewValueAdapters.length - 1; i >= 0; i--) {
				viewValueAdapter = viewValueAdapters[i];
				if (viewValueAdapter.name == adpaterName) {
					return viewValueAdapter;
				}
			}
		} else {
			for (i = viewValueAdapters.length - 1; i >= 0; i--) {
				viewValueAdapter = viewValueAdapters[i];
				if (viewValueAdapter.match && viewValueAdapter.match( $elem )) {
					return viewValueAdapter;
				}
			}
		}
	}

	function getCheckableControlValue ( $elem ) {
		var elem = $elem[0];
		if (elem.value == "true") {
			return true;
		} else if (elem.value == "false") {
			return false;
		} else if (elem.value !== "on") {
			return elem.value;
		} else {
			return elem.checked;
		}
	}

	viewValueAdapters = [
		{
			//the default view adapter
			name: "textBoxOrDropDown",
			get: function( $elem ) {
				return $elem.val();
			},
			set: function( $elem, value ) {
				if ($elem.val() !== value) {
					$elem.val( value );
				}
			},
			match: returnTrue
			//			match: function( $elem ) {
			//				//return $elem.is( ":text,select:not([multiple])" );
			//			}
		},
		{
			name: "checkbox",
			get: getCheckableControlValue,
			set: function setCheckbox ( $elem, value ) {
				var elem = $elem[0];
				if (isBoolean( value )) {
					elem.checked = value;
				} else {
					elem.checked = (value == elem.value);
				}
			},
			match: function( $elem ) {
				return $elem.is( ":checkbox" );
			}
		},
		{
			name: "radio",
			get: getCheckableControlValue,
			set: function( $elem, value, e ) {
				var elem = $elem[0];
				if (!elem.name) {
					elem.name = e.publisher.path;
				}
				elem.checked = ( toString( value ) == elem.value );
			},
			match: function( $elem ) {
				return $elem.is( ":radio" );
			}
		},
		{
			name: "listBox",
			get: function( $elem ) {
				var options = [];
				$elem.children( "option:selected" ).each( function() {
					options.push( this.value );
				} );
				return options;
			},
			set: function( $elem, value ) {

				$elem.children( "option:selected" ).removeAttr( "selected" );

				function fn () {
					if (this.value == itemValue) {
						this.selected = true;
						return false;
					}
				}

				for (var i = 0, itemValue; i < value.length; i++) {
					itemValue = value[i];
					$elem.children( "option" ).each( fn );
				}
			},
			match: function( $elem ) {
				return $elem.is( "select[multiple]" );
			}
		}
	];

	//add view adapter
	//the last added using the method, will be evaluated first
	/*
	 a view adapter is is like {
	 name: "adapterName", //optional if match is present
	 get: function (e) {},
	 set: function( e, value ) {},
	 initialize: function ($elem) {}
	 match: function ($elem) { reutrn true; } //optional if name is present
	 }
	 * */
	via.addViewValueAdapters = function( viewValueAdapter ) {
		if (isArray( viewValueAdapter )) {
			for (var i = 0; i < viewValueAdapter.length; i++) {
				viewValueAdapters.push( viewValueAdapter[i] );
			}
			return;
		}
		viewValueAdapters.push( viewValueAdapter );
	};

	extend( userSubsProps, {

		caption: function( elem, parseContext, subscriptions, options ) {
			$( elem ).prepend( "<option value=''>" + options + "</option>" );
		},

		//#debug
		//use @debug
		debug: function( /*elem, parseContext, subscriptions, options*/ ) {
			debugger;
		},
		//#end_debug

		//it is used to synchronize control with viewAdapter with the model value
		//make sure you register the viewAdapter with the type of control
		//
		//@val:eventType,updateDirection,adapterName,
		// such as @val:keypress,updateModel,date
		val: function( elem, parseContext, subscriptions, options ) {

			var updateDirection,
				updateEvent,
				path = parseContext.ns;

			options = options || "";

			if (!options) {
				updateEvent = "change";
			} else {
				options = options.split( "," );
				updateEvent = options[0] || "change"; //by default it is "change"
				updateDirection = options[1]; //undefined, updateView or updateModel
			}

			if (!updateDirection || updateDirection == "updateView") {
				subscriptions.push( {
					publisher: path,
					eventTypes: "init1 after*",
					subscriber: elem,
					handler: "*updateViewValue",
					options: options[2]
				} );
			}

			if (!updateDirection || updateDirection == "updateModel") {

				subscriptions.push( {
					publisher: elem,
					eventTypes: updateEvent + " resetForm",
					subscriber: path,
					handler: "*updateModelValue",
					options: options[2]
				} );

			}

		},

		focusLater: function( elem ) {
			setTimeout( function() {
				$( elem ).focus();
			}, 1 );
		},

		//data-sub="`updateButton"
		aliasEvent: function( elem, parseContext, subscriptions, options ) {
			setTimeout( function() {
				var i, events, eventPairs = options.split( ";" ),
					$view = $( elem );

				for (i = 0; i < eventPairs.length; i++) {
					events = eventPairs[i].split( "," );
					$view.aliasEvent( events[0], events[1] );
				}
			}, 1 );
		},

		initSubs: function( elem, parseContext, subscriptions, options ) {
			var methodName = options;
			//var methodName = options.split( "," )[0];
			rootModel.get( methodName, elem, parseContext, subscriptions, options );
		},

		confirm: function( elem, parseContext, subscriptions, options ) {
			subscribe( parseContext.ns, elem, "click", "*confirm", options );
		}


	} );

	extend( viaClasses, {

		//handle the delete button evnet in the list view
		deletableRow: "$delete:.|*removeRow",

		//	<tbody data-sub="`listView:.,#contactRow">
		//listView is used to render a list of items using a item template
		//the publisher should be a array model, the class can also update
		// the view, when the data change
		//
		//
		listView: //render whole list of items
			"!init after*.:.|*renderInside" +
				//render newly appended data item by appending it to end of the view
			"!afterCreate.1:.|*appendTmplItem" +
				//render the updated data item in the view
			"!afterUpdate.1:.|*updateTmplItem" +
				//delete the deleted data item in the view
			"!afterDel.1:.|*removeTmplItem" +

			"$moveUp:.|*moveUp" +

			"$moveDown:.|*moveDown" +

			"`deletableRow",

		//a general class rule to synchronize
		// the control with viewAdapter to a model
		//`val:path
		//`val:path|keypress
		//`val:path|updateModel
		//`val:path|updateView
		val: "@val:.",

		//data-sub="`options:path"
		options: "!init after*:.|*options",

		//data-sub="`show:path"
		show: "!init after*:.|*show",

		//data-sub="`hide:path"
		hide: "!init after*:.|*hide",

		addClass: "!init after*:.|*addClass",

		removeClass: "!init after*:.|*removeClass",

		focus: "!init after*:.|*focus",

		//data-sub="`enableLater:path"
		enableLater: "!after*:.|*enable",

		//data-sub="`disableLater:path"
		disableLater: "!after*:.|*disable",

		//data-sub="`enable:path"
		enable: "!init after*:.|*enable",

		//data-sub="`disable:path"
		disable: "!init after*:.|*disable",

		//data-sub="`html:path"
		html: "!init after*:.|get html *toString",

		//data-sub="`text:path"
		text: "!init after*:.|get text *toString",

		showPlural: "!init after*:.|*showPlural",

		//data-sub="`showValue:path"
		showValue: "!init after*:.|*showValue",

		textCount: "!init after*:.|*textCount",

		//data-sub"`alert:_|hello"
		//"hello" will be passed as options
		//and alert handler will alert it
		alert: "$click:.|*alert",

		preventDefault: "$click:.|*preventDefault",

		deleteButton: "@aliasEvent:click,delete",

		updateButton: "@aliasEvent:click,update",

		editButton: "@aliasEvent:click,edit",

		moveUpButton: "@aliasEvent:click,moveUp",

		moveDownButton: "@aliasEvent:click,moveDown",

		cancelButton: "@aliasEvent:click,cancel",

		pageButton: "@aliasEvent:click,changePage"

	} );

	$.createFilterEvent( "keyup", "enter",
		function( e ) {
			return (e.keyCode === 13);
		}
	).createFilterEvent( "keyup", "esc",
		function( e ) {
			return (e.keyCode === 27);
		}
	);

	//augment jQuery Event type
	//when you attach a handler to parent element to handle the event from children
	//we want to know the children element's row index of all the rows
	$.Event.prototype.selectedRowIndex = function() {
		return this.publisher.children().filter( this.originalPublisher.parents() ).index();
	};

	//#merge
})
	( jQuery, via );
//#end_merge


