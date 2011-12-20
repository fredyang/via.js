module( "03-core-view-event.js" );

var debug = via.debug;

var viewHandlerData = via.getViewHandlerData();

test( "via.addViewHandler --> support multiple views and multiple events", function () {
	var path = "a";
	var value = "a";

	var view1 = {};
	var view2 = {};

	var views = [
		view1,
		view2
	];

	var view1Events = [];
	var view2Events = [];

	var $views = $( views );

	var viewEvents = "click|dblclick";
	var options = {};

	via().create( path, value );

	via.addViewHandler( views, viewEvents, path, function ( viewEvent ) {
		if ( this === view1 ) {
			view1Events.push( viewEvent.e.type );
		}

		if ( this === view2 ) {
			view2Events.push( viewEvent.e.type );
		}

	}, options );

	ok( viewHandlerData[path][0] === view1 && viewHandlerData[path][1] === view2, "via.getViewHandlerData(path) is an array of views" );

	$views.click();
	$views.dblclick();

	ok( view1Events[0] === "click" && view1Events[1] === "dblclick"
		    && view2Events[0] === "click" && view2Events[1] === "dblclick",
		"via.addViewHandler support multiple views and multiple events" );

	via.removeView( views );
	via().del( path );
	assertEmptyDb();
} );

test( "via.addViewHandler -->ad-hoc function as view handler", function () {
	var path = "a";
	var oldValue = "a";
	var newValue = "a1";

	var view = {};

	var options = {};

	via().create( path, oldValue );

	via.addViewHandler( view, "click", path, function ( viewEvent ) {

		equal( viewEvent.path, path );
		equal( viewEvent.options, options );

		ok( this === view, "'this' in viewHandler refer to the view itself" );
		equal( viewEvent.targetValue(), oldValue, "viewEvent.targetValue() return the value at the path" );

		viewEvent.updateModel( newValue );
		equal( viewEvent.targetValue(), newValue, "viewEvent.updateModel(newValue) can update the value at the path" );

	}, options );

	ok( viewHandlerData[path][0] === view, "via.getViewHandlerData(path) is an array of views" );

	$( view ).click();
	via.removeView( view );
	ok( debug.isView( view ) === false, "after views is removed from via, they are not marked as view" );
	via().del( path );
	assertEmptyDb();
} );

test( "via.addViewHandler --> commond view handler function as viewHandler", function () {
	assertEmptyDb();
	var path = "a";
	var value = "a";
	var value2 = "a2";
	var view = {};

	via().create( path, value );

	via.commonViewHandlers.test = function ( viewEvent ) {
		viewEvent.updateModel( value2 );
		equal( viewEvent.targetValue(), value2, "you can use '*test' as viewHandler, which link to via.commonViewHandlers.test" );
	};

	via.addViewHandler( view, "click", path, "*test" );
	$( view ).click();

	via.removeView( view );
	via().del( path );
	assertEmptyDb();
} );

test( "via.addViewHandler --> use a member of view as viewHandler", function () {
	assertEmptyDb();

	var path = "a";
	var oldValue = "a";
	var newValue = "a2";

	via().create( path, oldValue );
	var view = {
		method: function ( viewEvent ) {
			viewEvent.updateModel( newValue );
		}
	};

	via.addViewHandler( view, "click", path, "v.method" );
	$( view ).click();

	equal( via().get( path ), newValue, "if view has a member function fn, it will call this[fn](viewEvent)" );

	via().del( path );
	via.removeView( view );
	delete via.commonViewHandlers.test;
	assertEmptyDb();
} );

test( "via.addViewHandler -->converter to be used to convert string to a typed value before it is used to update model",
	function () {
		var $content = $( "<div>100</div>" ).appendTo( "#qunit-fixture" );
		var path = "number";

		via().create( path, 0 );
		via.addViewHandler( $( "#qunit-fixture div" ), "change", path, "$text", "*toNumber" );

		via.valueConverters.toNumber = via.valueConverters.toNumber || function ( value ) {
			return +value;
		};

		//trigger change event
		$content.change();

		strictEqual( via().get( path ), 100, "*Converter can used as option to convert value before value is used to update model" );

		$content.remove();
		via().del( path );
		assertEmptyDb();
	} );

test( "via.addViewHandler --> viewHandler's viewEvent", function () {

	var path = "a";
	var value = "a";
	var value2 = "a2";
	via().create( path, "a" );
	var view = $( "<button>100</button>" ).appendTo( "#qunit-fixture" );
	var options = {};

	via.addViewHandler( view, "click", path, function ( viewEvent ) {
		equal( viewEvent.path, path, "viewEvent has a path" );
		equal( viewEvent.options, options, "viewEvent has a option" );
		strictEqual( viewEvent.triggerData, 100, "viewEvent has triggerData" );
		ok( viewEvent.e, "viewEvent has e as original event argument" );
		equal( viewEvent.targetValue(), value, "viewEvent.targetValue can get value" );
		equal( viewEvent.targetIndex(), path, "viewEvent.targetIndex() can get index" );
		viewEvent.updateModel( value2 );
		equal( viewEvent.targetValue(), value2, "viewEvent.updateModel() can update model" );
		equal( viewEvent.targetProxy().context, path, "viewEvent.targetProxy() can get the proxy" );
	}, options );

	view.trigger( "click", 100 );

	via().del( path );
	view.remove();
	assertEmptyDb();
} );

test( "via.addViewHandler --> options test", function () {

	var path = "a";
	var value = "a";
	via().create( path, value );
	var view = {};

	via.addViewHandler( view, "change", path, function ( viewEvent ) {
		deepEqual( viewEvent.options, undefined, "if options is '_', it is explicitly set to undefined" );
	}, "_" );

	$( view ).change();

	via.removeView( view );

	var viewHandler = function ( viewEvent ) {
		deepEqual( viewEvent.options, 100, "you can use viewHandler.options as a function to convert options, or seed default options" );
	};
	viewHandler.buildOptions = function ( views, options ) {
		return +options;
	};

	via.addViewHandler( view, "change", path, viewHandler, "100" );

	$( view ).change();

	via().del( path );
	via.removeView( view );
	assertEmptyDb();

} );

test( "via.addViewHandler --> initialize view", function () {
	var view = {};
	var path = "a";
	var value = "a";
	via().create( path, value );

	via.addViewHandler( view, "afterUpdate", "a", $.extend( function ( viewEvent ) {

	}, {
		initialize: function ( theView ) {
			theView.extra = true;
		}
	} ) );

	ok( view.extra === true, "if an event handler has a initialize function, it will be called" +
	                         "when handler is used in addViewHandler" );

	via().del( path );
	assertEmptyDb();
} );

test( "via.addViewHandler --> getHandlerData", function () {
	var view = {};
	var path = "a";
	var value = "a";
	via().create( path, value );

	function viewHandler( viewEvent ) {}

	function modelHandler( modelEvent ) {}

	via.addViewHandler( view, "afterUpdate", "a", viewHandler );
	via.addModelHandler( path, "click", view, modelHandler );

	var handlerDataOfModel = via.getHandlerData( path );

	ok(handlerDataOfModel.viewsToBeUpdated[0] === view &&
	   handlerDataOfModel.viewsUpdatingMe[0] === view,
		"getHandlerData(path) returns the views associated with the path");


	var handlerDataOfView = via.getHandlerData( view );

	ok(handlerDataOfView.pathsUpdatingMe[0] === path &&
	   handlerDataOfView.pathsToBeUpdated[0] === path,
		"getHandlerData(view) returns the paths associated with the view");

	via().del( path );
	assertEmptyDb();
} );
