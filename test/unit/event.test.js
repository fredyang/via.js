module( "eventSubscription.js" );

var debug = via.debug;
var filters = via.filters;
var getters = filters.getters;
var setters = filters.setters;
var converters = filters.converters;
var initializers = filters.initializers;
var finalizers = filters.finalizers;
getters.fakeGet = function() {};
setters.fakeSet = function( value, e ) {
	this.set( value );
};
converters.fakeConvert = function() {};
initializers.fakeInitialize = function() {};
finalizers.fakeFinalize = function() {};

test( "model events match test", function() {

	var findMatchedEvents = debug.findMatchedEvents;

	ok( findMatchedEvents( "*", "whatever" ), "* match all what ever event" );
	ok( findMatchedEvents( "*", "whatever.whatever" ), "* match all what ever event" );

	ok( findMatchedEvents( "whatever", "whatever" ), "support exact match" );
	ok( findMatchedEvents( "whatever.whatever", "whatever.whatever" ), "support exact match" );

	ok( !findMatchedEvents( "whatever", "whatever.whatever" ), "if there is not wildcar *, use exact match" );

	ok( findMatchedEvents( "*.", "whatever" ), "*. match all current node" );
	ok( !findMatchedEvents( "*.", "whatever.whatever" ), "*. does not match event with extension" );

	ok( findMatchedEvents( "before*", "beforeUpdate" ), "before* match beforeUpdate" );
	ok( findMatchedEvents( "before*", "beforeUpdate.parent" ), "before* match beforeUpdate.parent" );

	ok( findMatchedEvents( "before*.", "beforeUpdate" ), "before* match beforeUpdate" );
	ok( !findMatchedEvents( "before*.", "beforeUpdate.parent" ), "before*.  does not match beforeUpdate.parent" ); //

	ok( findMatchedEvents( "before*.parent", "beforeUpdate.parent" ), "before*.parent matches beforeUpdate.parent" );
	ok( !findMatchedEvents( "before*.parent", "beforeUpdate" ), "before*.parent  does not match beforeUpdate.parent" );
	ok( !findMatchedEvents( "before*.parent", "update.parent" ), "before*.parent  does not match update.parent" );

	ok( findMatchedEvents( "*.parent", "update.parent" ), "*.parent match update.parent" );
	ok( !findMatchedEvents( "*.parent", "beforeUpdate" ), "*.parent does not match beforeUpdate" );

	ok( findMatchedEvents( "afterUpdate afterCreate", "afterCreate" ), "combo events can match single event" );

	ok( findMatchedEvents( "afterUpdate before*", "beforeUpdate" ), "combo events with before* can match beforeUpdate" );
	ok( findMatchedEvents( "afterUpdate before*", "beforeUpdate.child" ), "combo events with before* can match beforeUpdate.child" );
	ok( findMatchedEvents( "afterUpdate before*.", "beforeUpdate" ), "combo events with before*. can match beforeUpdate" );
	ok( !findMatchedEvents( "afterUpdate before*.", "beforeUpdate.parent" ), "combo events with before*. can not match beforeUpdate.child" );

} );

test( "subscriptions count after subscribe/unsubscribe", function() {
	via( "b" ).subscribe( "a", "afterUpdate" );
	via( "e" ).subscribe( "a", "afterUpdate" );
	via( "c" ).subscribe( "a", "afterUpdate" );
	via( "d" ).subscribe( "c", "afterUpdate" );
	via( "e" ).subscribe( "c", "afterUpdate" );
	equal( via.subscriptions().length, 5, "subscriptions added after subscribing" );

	via( "c" ).unsubscribe();
	equal( via.subscriptions().length, 2,
		"unsubcribing will remove all subscriptions where object is either publisher or subscriber" );

	via( "a" ).unsubscribe();

	equal( via.subscriptions().length, 0,
		"unsubscribing will remove all subscriptions where object is either publisher or subscriber" );

	via.set( "c", "c" );
	via( "c" ).subscribe( "a", "afterUpdate" );
	via( "d" ).subscribe( "c", "afterUpdate" );
	via( "e" ).subscribe( "c", "afterUpdate" );
	equal( via.subscriptions().length, 3 );
	via.del( "c" );
	equal( via.subscriptions().length, 0, "delete a model will also unsubscribe the model" );

	var jqueryView = $( "<div></div>" ).appendTo( testArea() );
	jqueryView.subscribe( "a", "afterUpdate", "html" );
	via( "c" ).subscribe( jqueryView, "change", "html" );
	equal( via.subscriptions().length, 2, "subscriptions added after subscribing" );
	jqueryView.remove();
	equal( via.subscriptions().length, 0, "removing view can also remove view's subscriptions" );
	assertEmptyDb();
} );

test( "build handler with filters", function() {
	var isModel = true;
	var isView = false;

	var buildPipeline = debug.buildPipeline;
	var handler;

	via.fn.fakeSetModel = function() {};
	via.fn.fakeGetModel = function() {};
	$.fn.fakeGetView = function() {};
	handler = buildPipeline( "fakeGetView set" );

	deepEqual( handler,
		{
			get: debug.defaultGet,
			getMethod: "fakeGetView",
			set: debug.defaultSet,
			setMethod: "set"
		},

		"If a model subscribe a jQueryView and there is only one method in handler, handler.get is for get" +
		" view, and handler.set is for set mode" );
	handler = buildPipeline( "fakeGetModel fakeSetView *fakeConvert *fakeInitialize *fakeFinalize" );

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "fakeGetModel",
		set: debug.defaultSet,
		setMethod: "fakeSetView",
		convert: converters.fakeConvert,
		initialize: initializers.fakeInitialize,
		finalize: finalizers.fakeFinalize
	}, "you can totally setup up to six filter for the handler in a string" );

	handler = buildPipeline( "get set _ null" );

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "set"
	}, "you can bypass certain method using null or _" );

} );

test( "model to model", function() {
	var name = "john";
	via.set( "name", name );
	via.set( "name2", "" );

	via( "name2" ).subscribe( "name", "init afterUpdate" );

	equal( via.get( "name2" ), name,
		"If model subscribe an other model, and handler is missing,  the handler use model.get " +
		"and model.set as handler" );

	var handler = via( "name2" ).subsFromMe()[0].handler;

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "set"
	}, "If model subscribe an other model, and handler is missing,  the handler use model.get " +
	   "and model.set as handler" );

	ok( via.get( "name2" ) == name,
		"If model subscribe an other model, and handler is missing,  the handler use model.get " +
		"and model.set as handler" );

	var newName = "tom";
	via.set( "name", newName );

	equal( via.get( "name2" ), newName,
		"if model subscribe an other model, and handler is missing,  the handler use model.get " +
		"and model.set as handler" );

	via( "name2" ).unsubscribe();

	via.fn.setName2 = function( value ) {
		this.set( value );
	};

	via( "name2" ).subscribe( "name", "afterUpdate", "setName2" );

	handler = via( "name2" ).subsFromMe()[0].handler;
	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "setName2"
	}, "If a model subscribe another model, and the handler has only one filter, this" +
	   "filter will be 'set filter'" );

	via.set( "name", "xxx" );

	equal( via.get( "name2" ), "xxx",
		"If a model subscribe another model, and the handler has only one filter, this" +
		"filter will be 'set filter'" );

	handler = via( "name2" ).subsFromMe()[0].handler;

	deepEqual( handler, {
			get: debug.defaultGet,
			getMethod: "get",
			set: debug.defaultSet,
			setMethod: "setName2"
		},
		"If model subscribe another model, and handler has only one filter, this filter will be set filter" );

	via( "name2" ).unsubscribe();
	delete via.fn.setName2;

	via( "name2" ).subscribe( "name", "afterUpdate", "get *fakeSet" );

	via.set( "name", "yyy" );
	handler = via( "name2" ).subsFromMe()[0].handler;

	deepEqual( handler, {
			get: debug.defaultGet,
			getMethod: "get",
			set: setters.fakeSet
		},
		"you can use a common set filter" );

	via( "name2" ).unsubscribe();

	via.set( "setName2", function( value ) {
		this.set( "..name2", value );
	} );

	via( "setName2" ).subscribe( "name", "afterUpdate" );
	via.set( "name", "zzz" );
	equal( via.get( "name2" ), "zzz", "a model function can be used as setter" );

	assertEmptyDb();

} );

test( "model to view", function() {
	via.set( "markup", "hello" );
	var $view = $( "<div></div>" ).appendTo( testArea() );

	$view.subscribe( "markup", "init afterUpdate", "html" );
	var handler = $view.subsFromMe()[0].handler;
	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "html"
	}, "If a view subscrbe model and there is only one filter in the handler," +
	   " the handler is get the model value, and set the view with the filter set" );

	equal( $view.html(), via.get( "markup" ),
		"When a view subscribe a model, and handler is a single" +
		"string, the handler is get model and set view" );

	var newMarkup = "bye"
	via.set( "markup", newMarkup );
	equal( $view.html(), newMarkup,
		"When a view subscribe a model, and handler is a single" +
		"string, the handler is get model and set view" );

	$view.unsubscribe();

	via.set( "color", "white" );
	$view.subscribe( "color", "init afterUpdate", "css*color" );
	handler = $view.subsFromMe()[0].handler;

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "css",
		setProp: "color"
	}, "If a jquery view subscribe model and there is only one filter in the handler," +
	   " the handler is get the model value, and set the view with the filter set, if the " +
	   "set filter is property method, then the property name can be inferred from the index " +
	   "of model path" );

	equal( $view.css( "color" ), "rgb(255, 255, 255)", "when a view subscribe model, the handler" +
	                                                   "is get model and set view. If the set view" +
	                                                   "is a special property, the set method will" +
	                                                   "try to use the index of model path as the property" +
	                                                   "name" );

	via.set( "color", "black" );
	equal( $view.css( "color" ), "rgb(0, 0, 0)",
		"when a jquery view subscribe model, the handler" +
		"is get model and set view. If the set view" +
		"is a special property, the set method will" +
		"try to use the index of model path as the property" +
		"name" );

	$view.unsubscribe();

	equal( via.subscriptions().length, 0, "unsubscribe successfully" );

	via.set( "name", "john" );
	via.set( "handlerNameChangeForView", function( e ) {
		//this == a view
		//e.publisher == a model
	} );

	//initView(path, handler, options)

	$view.initView( "name", "html" );

	equal( via.subscriptions().length, 0,
		"initView behavie like init event, which does not create any subscriptions" );

	equal( $view.html(), via.get( "name" ), "initView will run the handler once" );

	var jsObjectView = {
		name: "",
		setName: function( value ) {
			this.name = value;
		}
	};

	$( jsObjectView ).subscribe( "name", "init afterUpdate", "name" );

	var subscriptions = via.subscriptions( jsObjectView );
	equal( subscriptions.length, 1, "jsObjectView can also subscribe model event" );
	handler = subscriptions[0].handler;

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "name"
	}, "If a object view subscrbe model and there is only one filter in the handler," +
	   " the handler is get the model value, and set the view with the filter set" );

	equal( jsObjectView.name, via.get( "name" ), "jsObjectView's member property can be used as handler" );
	var newName = "newName";
	via.set( "name", newName );
	equal( jsObjectView.name, via.get( "name" ), "externalView's member property can be used as handler" );
	$( jsObjectView ).unsubscribe();

	subscriptions = via.subscriptions( jsObjectView );
	equal( subscriptions.length, 0, "object view can be unsubscribed" );

	$( jsObjectView ).subscribe( "name", "afterUpdate", "setName" );
	handler = $( jsObjectView ).subsFromMe()[0].handler;
	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "get",
		set: debug.defaultSet,
		setMethod: "setName"

	}, "If a object view subscrbe model and there is only one filter in the handler," +
	   " the handler is get the model value, and set the view with the filter set" );

	newName = newName + "1";
	via.set( "name", newName );
	equal( jsObjectView.name, via.get( "name" ), "jsObjectView's member function can be used as handler" );
	$( jsObjectView ).unsubscribe();

	assertEmptyDb();
} );

test( "view to model", function() {

	var customerName = "john";
	var jQueryView = $( "<input type='text' />" ).val( customerName ).appendTo( testArea() );
	via.set( "customer", "" );

	via( "customer" ).subscribe( jQueryView, "init change", "val" );

	var handler = via( "customer" ).subsFromMe()[0].handler;

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "val",
		set: debug.defaultSet,
		setMethod: "set"

	}, "If a model subscribe to a jQueryView, there is only one filter in the handler," +
	   " the handler is get the view value using filter, and set the model" );

	equal( via.get( "customer" ), customerName, "If a model subscribe to jQueryView's init event," +
	                                            "model will be set immediately with the value of the jQueryView" );

	var newCustomerName = "tom";
	jQueryView.val( newCustomerName ).trigger( "change" );

	equal( via.get( "customer" ), newCustomerName, "If a model subscribe to jQueryView event," +
	                                               "when event happen, model will get set" );

	via( "customer" ).unsubscribe();

	var viewHandler = function( e, firstName, lastName ) {
		this.set( firstName + "," + lastName );
	};

	via( "customer" ).subscribe( jQueryView, "change", viewHandler );
	handler = via( "customer" ).subsFromMe()[0].handler;
	deepEqual( handler, viewHandler, "If a model subscribe to a jQueryView, and the handler is just a function," +
	                                 " the function is the real handler." );

	jQueryView.trigger( "change", ["a", "b"] );

	equal( via.get( "customer" ), "a,b",
		"The original jQuery trigger with extra parameters still works in the view handler" );

	via( "customer" ).unsubscribe();

	//compare with line 437
	via.set( "setCustomer", function x ( e ) {
		equal( x, e.handler.get,
			"If a model subscribe directly to the view, and the handler is missing, " +
			"the model is the handler by itself, in the handler, " +
			"the 'this' refer to the handler, but not the model proxy, " +
			"the 'e' refer to the event argument but not the value to be set into model" );
		this.set( "..customer", e.publisher.val() );
	} );

	via( "setCustomer" ).subscribe( jQueryView, "change" );
	handler = via( "setCustomer" ).subsFromMe()[0].handler;

	deepEqual( handler.get, via().helper( "setCustomer" ),
		"If a model subscribe directly to the view and the handler is missing, " +
		"then the model is the handler by itself" );

	newCustomerName = newCustomerName + "1";
	jQueryView.val( newCustomerName ).trigger( "change" );

	equal( via.get( "customer" ), newCustomerName, "if model subscribe view's event without " +
	                                               "specifying handler, then the model is the handler" +
	                                               " by itself" );
	via( "setCustomer" ).unsubscribe();
	//
	via( "setCustomer" ).subscribe( jQueryView, "change", "#.", "options" );

	newCustomerName = newCustomerName + "1";
	jQueryView.val( newCustomerName ).trigger( "change" );

	equal( via.get( "customer" ), newCustomerName, "If a model subscribe view's event " +
	                                               "with '#path' as handler" +
	                                               "this is same as with handler missing, however, using this" +
	                                               " handler explicitly, allow user to enter some options" );
	via( "setCustomer" ).unsubscribe();

	//compare with line 401
	via().helper( "setCustomer", function( value ) {
		ok( this.path == "" && this instanceof via,
			"If model's data is itself a function, setting the model will actually call" +
			"the model function, with a value parameter, in the function 'this' refer" +
			"to the model object" );
		equal( value, newCustomerName );
		this.set( "customer", value );
	} );

	via( "setCustomer" ).subscribe( jQueryView, "change", "val" );
	handler = via( "setCustomer" ).subsFromMe()[0].handler;

	deepEqual( handler, {
		get: debug.defaultGet,
		getMethod: "val",
		set: debug.defaultSet,
		setMethod: "set"
	}, "when a model subscribe a view handler, and the filter is a single filter, that single" +
	   "filter is to get view value" );

	newCustomerName = newCustomerName + "1";
	jQueryView.val( newCustomerName ).trigger( "change" );
	equal( via.get( "customer" ), newCustomerName, "you can use model as a setter of handler" );

	via( "setCustomer" ).unsubscribe();

	var objectView = {
		customer: "xx",
		getCustomer: function() {
			return this.customer;
		},
		setCustomer: function( value ) {
			this.customer = value;
			$( this ).trigger( "change" );
		}
	};

	via( "customer" ).subscribe( objectView, "init change", "customer" );

	equal( via.get( "customer" ), objectView.customer,
		"a plain javascript object can be also used a publisher" );

	newCustomerName = objectView.customer + "1";
	objectView.setCustomer( newCustomerName );

	equal( via.get( "customer" ), newCustomerName,
		"a plain javascript object can be also trigger event which can be subscribed" );

	via( "customer" ).unsubscribe();

	via( "customer" ).subscribe( objectView, "change", "getCustomer" );

	newCustomerName = objectView.customer + "1";
	objectView.setCustomer( newCustomerName );

	equal( via.get( "customer" ), newCustomerName,
		"a plain javascript object's member function can be used as getter" );

	assertEmptyDb();
} );

test( "view to view", function() {

	var $textboxs = $( "<input id='txt1' type='text' value='text1' /><input id='txt2' " +
	                   "type='text' value='text2' />" ).appendTo( testArea() );

	var $labels = $( "<div id='label1'></div><div id='label2'></div><div id='label3'></div>" ).appendTo( testArea() );

	//or
	// $( "#label1, #label2, #label3" ).subscribe( "$#txt1, #txt2", "change", "val html" );
	$( "#label1, #label2, #label3" ).subscribe( $( "#txt1, #txt2" ), "change", "val html" );

	equal( via.subscriptions().length, 6, "using jQuery selector as publisher/subscriber will" +
	                                      "expand them first" );
	var val1 = "john";
	$( "#txt1" ).val( val1 ).trigger( "change" );

	ok( $( "#label1" ).html() == val1 && $( "#label2" ).html() == val1 && $( "#label3" ).html() == val1,
		"multiple subscriber can get change form one publisher" );

	var val2 = "tom";
	$( "#txt2" ).val( val2 ).trigger( "change" );

	ok( $( "#label1" ).html() == val2 && $( "#label2" ).html() == val2 && $( "#label3" ).html() == val2,
		"multiple subscriber can get change form one publisher" );

	$( "#txt1" ).remove();

	equal( via.subscriptions().length, 3, "via.subscriptions.remove will only remove relative publisher/subscriber" );

	$( "#label3" ).remove();

	equal( via.subscriptions().length, 2, "via.subscriptions.remove will only remove relative publisher/subscriber" );

	$( "#txt2" ).remove();

	equal( via.subscriptions().length, 0, "via.subscriptions.remove will only remove relative publisher/subscriber" );

	assertEmptyDb();
} );

test( "test model event propagation", function() {
	rootModel.extend( {
		customer: {
			firstName: null,
			lastName: null,
			fullName: function() {
				return this.get( "firstName" ) + "," + this.get( "lastName" );
			}
		}
	} );

	var subscriber;
	var publishers = [];
	var originalPublishers = [];

	via.subscribe( null, "customer.firstName", "afterUpdate", function( e ) {
		subscriber = this;
	} );

	via.subscribe( null, "customer", "afterUpdate.*", function( e ) {
		publishers.push( e.publisher.path );
		originalPublishers.push( e.originalPublisher.path );
	} );

	rootModel.set( "customer.firstName", "fred" );
	equal( subscriber, window, "subscriber can be null" );

	deepEqual( publishers, ["customer", "customer"],
		"the publisher is always the current publisher" );

	deepEqual( originalPublishers, ["customer.fullName", "customer.firstName"],
		"event propogate to dependent first, and then up, this is similar like wide first, " +
		"then deep, when dependent bubblle up, it change the original hierachy" );

	equal( via.subscriptions().length, 2 )
	via.del( "customer" );
	equal( via.subscriptions().length, 0, "delete a model will delete all handler that attached to its" +
	                                      "descendants" )
	assertEmptyDb();

} );

test( "event abortion", function() {
	rootModel.extend( {
		customer: {
			firstName: null,
			lastName: null,
			fullName: function() {
				return this.get( "firstName" ) + "," + this.get( "lastName" );
			}
		}
	} );

	via().subscribe( "customer.firstName", "beforeUpdate", function( e ) {
		e.error();
	} );

	rootModel.set( "customer.firstName", "john" );
	equal( rootModel.get( "customer.firstName" ), null, "if model event for beforeUpdate set error," +
	                                                    " it will not succed" );

	via( "customer.firstName" ).unsubscribe();

	via().subscribe( "customer", "beforeUpdate.*", function( e ) {
		e.error();
	} );

	rootModel.set( "customer.firstName", "john" );

	equal( rootModel.get( "customer.firstName" ), null, "if model event for beforeUpdate.child set error," +
	                                                    " it will not succed" );

	via( "customer" ).unsubscribe();

	via().subscribe( "customer.fullName", "beforeUpdate", function( e ) {
		e.error();
	} );

	rootModel.set( "customer.firstName", "john" );

	equal( rootModel.get( "customer.firstName" ), null, "if beforeUpdate model event for dependent model  set error," +
	                                                    " it will not succed" );

	via( "customer" ).unsubscribe();

	via().subscribe( "customer", "beforeUpdate.*", function( e ) {
		e.error();
	} );

	rootModel.set( "customer.firstName", "john" );

	equal( rootModel.get( "customer.firstName" ), null, "if beforeUpdate.childe model event for dependent model  set error," +
	                                                    " it will not succed" );

	via( "customer" ).unsubscribe();
	equal( via.subscriptions().length, 0 );

	via().subscribe( "customer.firstName", "afterUpdate", function( e ) {
		e.stopCascade();
	} );

	var customerHandlerCalled = false;
	var originalPublisher;
	via().subscribe( "customer", "afterUpdate.*", function( e ) {
		customerHandlerCalled = true;
		originalPublisher = e.originalPublisher.path;
	} );

	rootModel.set( "customer.firstName", "john" );
	equal( customerHandlerCalled, true, "e.stopCascade will stop model event from " +
	                                    " side progagation" );
	equal( originalPublisher, "customer.firstName", "original publisher come from the original " +
	                                                "hierachy" );

	via( "customer" ).unsubscribe();
	equal( via.subscriptions().length, 0 );

	via().subscribe( "customer.firstName", "afterUpdate", function( e ) {
		e.stopPropagation();
	} );
	customerHandlerCalled = false;
	originalPublisher = "";

	via().subscribe( "customer", "afterUpdate.*", function( e ) {
		customerHandlerCalled = true;
		originalPublisher = e.originalPublisher.path;
	} );

	rootModel.set( "customer.firstName", "tom" );
	equal( customerHandlerCalled, true, "e.stopPropagation will stop model event from " +
	                                    " progagation from the original hierachy" );
	equal( originalPublisher, "customer.fullName", "original publisher come from the side " +
	                                               "hierachy" );

	//
	via( "customer" ).unsubscribe();
	equal( via.subscriptions().length, 0 );

	customerHandlerCalled = false;
	originalPublisher = "";
	var publishers = [];
	via().subscribe( "customer", "afterUpdate.*", function( e ) {
		customerHandlerCalled = true;
		publishers.push( e.originalPublisher.path );
	} );

	rootModel.set( "customer.firstName", "cat" );

	equal( customerHandlerCalled, true, "by default, all propogation is allowed" );
	deepEqual( publishers, ["customer.fullName", "customer.firstName"],
		"customer's afterUpdate.childe handler is called twice" +
		" because of propgation up from both fullName and firstName, and side hierachy propogation come" +
		" first of original hierachy propogation" );

	//reset
	via( "customer" ).unsubscribe();
	equal( via.subscriptions().length, 0 );

	customerHandlerCalled = false;
	originalPublisher = "";
	via().subscribe( "customer.firstName", "afterUpdate", function( e ) {
		e.stopImmediatePropagation();
	} );

	via().subscribe( "customer", "afterUpdate.*", function( e ) {
		customerHandlerCalled = true;
	} );

	rootModel.set( "customer.firstName", "lion" );

	equal( customerHandlerCalled, false, "stopImmediatePropagation will stop all propogation" );
	assertEmptyDb();
} );

test( "simple function as handler", function() {

	var name = "john";
	via.set( "name", name );
	via.set( "name2", "" );

	var simpleHandler = function( e ) {
		equal( e.handler.get, arguments.callee, "a simple handler is the get function" );
		equal( e.handler.seed, 100, "handler's init is called" );
		this.set( e.publisher.get() );
	};

	var init = function( publisher, subscriber, pipeline, options ) {
		pipeline.seed = "100";
	};

	simpleHandler.initialize = init;
	via( "name2" ).subscribe( "name", "init afterUpdate", simpleHandler );
	equal( via.get( "name2" ), via.get( "name" ), "the handler function is called" );

	assertEmptyDb();

} );

test( "pipeline as handler", function() {
	var name = "john"
	via.set( "name", name );
	via.set( "name2", "" );
	var pipeline = {
		get: function( e ) {
			ok( (arguments.callee == pipeline.get) && (e.handler.get == pipeline.get),
				"full handler's object's get function is used" );

			equal( e.handler, pipeline, "the execution context, is the same as pipeline" );

			ok( !this.init, "the context object does not have init function" );

			return e.publisher.get() + e.handler.seed;
		},
		set: function( value, e ) {
			this.set( value );
		},
		convert: function( value, e ) {
			return value + e.handler.seed;
		},
		initialize: function( publisher, subscriber, pipeline2, options2 ) {
			equal( publisher.path, "name", "publisher is passed into init" );
			//equal( eventTypes, "afterUpdate", "'init' event is removed" )
			equal( subscriber.path, "name2", "subcriber is passed into init" );
			equal( pipeline2, pipeline, "pipeline2 is same as pipeline" );
			equal( options2, options, "options object is passed into init" );
			pipeline2.seed = options2.seed;
		}
	};
	var options = {
		seed: "x"
	};

	via( "name2" ).subscribe( "name", "init afterUpdate", pipeline, options );
	equal( via.subscriptions().length, 1, "a subscription addd a entry to subscriptions" );
	equal( via.subscriptions()[0].eventTypes, "afterUpdate", "the init event is discarded" );
	//
	equal( via.get( "name2" ), name + options.seed + options.seed,
		"the init event update the subscriber immediately, the handlers passed get/convert/set 3 stages" );

	var newName = "tom"
	via.set( "name", newName );

	equal( via.get( "name2" ), newName + options.seed + options.seed,
		"the afterUpdate event update subscriber after publisher is updated" );

	assertEmptyDb();
} );

test( "common pipeline as handler", function() {
	var name = "john"
	via.set( "name", name );
	via.set( "name2", "" );
	var pipeline = {

		get: function( e ) {
			return e.publisher.get() + e.handler.seed;
		},
		set: function( value, e ) {
			this.set( value );
		},
		convert: function( value, e ) {
			return value + e.handler.seed;
		},
		initialize: function( publisher, subscriber, pipeline2, options2 ) {
			pipeline2.seed = options2.seed;
		}
	};
	var options = {
		seed: "x"
	};

	via.pipeline( "test", pipeline );

	via( "name2" ).subscribe( "name", "init afterUpdate", "*test", options );
	equal( via.get( "name2" ), via.get( "name" ) + options.seed + options.seed,
		"the handlers passed get/convert/set 3 stages" );

	assertEmptyDb();
} );

test( "use common getter/setter/converter/initializer/finalizer to build common handler", function() {
	var initCalled,
		getCalled,
		convertCalled,
		setCalled,
		finalizedCalled,
		ageChanged,
		finalizedValue;
	getters.testGet = function( e ) {
		getCalled = true;
		return e.publisher.val();
	};

	setters.testSet = function( value, e ) {
		setCalled = true;
		this.set( value );
	};

	converters.testConvert = function( value ) {
		convertCalled = true;
		return +value;
	};

	initializers.testInit = function( publisher, subscriber, pipeline, options ) {
		initCalled = true;

		var eventName = via.util.getUniqueViewEventTypes( "change", publisher, subscriber.path );
		$( publisher ).bind( eventName, function() {
			ageChanged = !ageChanged;
			if ($.isNumeric( $( this ).val() )) {
				$( this ).trigger( "ageChange" );
			}
		} );
	};

	finalizers.testFinalize = function( value ) {
		finalizedCalled = true;
		finalizedValue = value;
	};



	via.set( "age", null );

	var age = 100;
	var $text = $( "<input type='text' />" ).appendTo( testArea() );

	via( "age" ).subscribe( $text, "ageChange", "*testGet *testSet *testConvert *testInit *testFinalize" );
	$text.val( age ).trigger( "change" );

	ok( initCalled && getCalled && convertCalled && setCalled & finalizedCalled,
		"common getter/setter/converter/initializer/finalizer have been called" );

	ok( via.get( "age" ) === age && finalizedValue === age, "getAccessor, setAccessor, valueConverters, initilizers works together" );

	via( "age" ).unsubscribe();
	$text.val( age ).trigger( "change" );


	via.pipeline( "testHandler", "*testGet *testSet *testConvert *testInit *testFinalize" );
	var testHandler = via.pipeline( "testHandler" );

	ok( testHandler.get == getters.testGet &&
	    testHandler.set == setters.testSet &&
	    testHandler.convert == converters.testConvert &&
	    testHandler.initialize == initializers.testInit,
		"via.handlers common"
	);

	via( "age" ).subscribe( $text, "ageChange", "*testHandler" );
	var newAge = 200;
	$text.val( newAge ).trigger( "change" );
	ok( via.get( "age" ) === newAge && finalizedValue === newAge, "we can also use same pattern to build named handler" );

	assertEmptyDb();
} );

test( "use embedded getter/setter/converter/initializer/finalizer to build handler", function() {
	var initCalled,
		setCalled,
		convertCalled,
		finalizedCalled,
		ageChanged,
		finalizedValue;

	via.extend( {

		testSet: function( value ) {
			setCalled = true;
			this.set( "..age", value );
		},

		testConvert: function( value ) {
			convertCalled = true;
			return +value;
		},

		testInit: function( publisher, subscriber, pipeline, options ) {
			initCalled = true;

			var eventName = via.util.getUniqueViewEventTypes( "change", publisher, subscriber );
			$( publisher ).bind( eventName, function() {
				ageChanged = !ageChanged;
				if ($.isNumeric( $( this ).val() )) {
					$( this ).trigger( "ageChange" );
				}
			} );
		},

		testFinalize: function( value ) {
			finalizedCalled = true;
			finalizedValue = value;
		}
	} );

	via.set( "age", null );

	var age = 100;
	var $text = $( "<input type='text' />" ).appendTo( testArea() );

	via( "testSet" ).subscribe( $text, "ageChange", "val set testConvert testInit testFinalize" );

	$text.val( age ).trigger( "change" );

	ok( via.get( "age" ) === age && initCalled && convertCalled && finalizedCalled,
		"embedded converter/initializer/finalizer have been called" );

	via( "testSet" ).unsubscribe();


	assertEmptyDb();

} );

test( "deferred handler", function() {

	var name = "john";
	via.set( "name", name );

	var defer;
	var $div = $( "<div></div>" ).appendTo( testArea() );
	$div.subscribe( "name", "init", {
		get: function( e ) {
			defer = $.Deferred();
			defer.e = e;
			return defer.promise();
		},
		set: "html"
	} );

	equal( $div.html(), "", "before defer is resolved, the set function is waiting" );
	defer.resolve( defer.e.publisher.get() + "1" );
	equal( $div.html(), name + "1", "after defer is resolved, the set function continue" );

	assertEmptyDb();
} );

test( "mapEvent", function() {

	via.set( "lightOn", null );

	var $text = $( "<input type='text'>" ).appendTo( testArea() );

	$.createFilterEvent( "change", "overlimit", function( e ) {
		return ($( e.target ).val() > 100);
	} );

	via( "lightOn" ).subscribe( $text, "overlimit", function( e ) {
		this.set( true );
	} );

	$text.val( 101 ).trigger( "change" );

	strictEqual( via.get( "lightOn" ), true, "we can relay one event to another event, if conditon is met" );

	assertEmptyDb();

} );

test( "adhoc model function as handler", function() {

	//In subscriptions, the handler is either reusable or adhoc
	//the reusable handler normally is saved in via.handlers(handlerName);
	//for adhoc handler, that are persited as part of model,
	//our problem is that we need to access them in via attribute
	var $div = $( "<div data-sub='@sub:light.color|afterUpdate|#..handleColorChange'></div>" ).appendTo( testArea() );
	via.set( "light", {
		color: "green",
		handleColorChange: function( e ) {
			if (e.publisher.get() == "green") {
				this.html( "go" );
			} else {
				this.html( "stop" );
			}
		}
	} );

	$div.importSubs();
	via.set( "light.color", "red" );
	equal( $div.html(), "stop", "can use handler persited in model to handle event" );
	$div.remove();

	ok( true );
	assertEmptyDb();
} );

