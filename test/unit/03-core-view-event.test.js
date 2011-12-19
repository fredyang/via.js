module( "03-core-view-event.js" );

var debug = via.debug;

var viewHandlerData = via.getViewHandlerData();

test( "via.addViewHandler -->ad-hoc function as view handler", function () {
	var path = "a";
	var value = "a";

	var view1 = {};
	var view2 = {};

	var views = [
		view1,
		view2
	];

	var $views = $( views );

	var oldValues = ["a", "a1"];
	var newValues = ["a1", "a2"];

	var viewEvents = "click|dblclick";
	var options = {};

	via().create( path, value );

	var index = 0;

	via.addViewHandler( views, viewEvents, path, function ( viewEvent ) {

		debugger;
		
		equal( viewEvent.path, path );
		equal( viewEvent.options, options );

		ok( this === views[index % 2], "'this' in viewHandler refer to the view itself" );
		equal( viewEvent.targetValue(), oldValues[index], "viewEvent.targetValue() return the value at the path" );

		viewEvent.updateModel( newValues[index] );
		equal( viewEvent.targetValue(), newValues[index], "viewEvent.updateModel(newValue) can update the value at the path" );

		index ++;

	}, options );

	ok( viewHandlerData[path][0] === view1 && viewHandlerData[path][1] === view2, "via.getViewHandlerData(path) is an array of views" );

	$views.click();
	//$views.dblclick();

	via.removeView( views );
	ok( debug.isView( view1 ) === false && debug.isView( view2 ) === false, "after views is removed from via, they are not marked as view" );

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

test( "addViewHandler --> options test", function () {
	assertEmptyDb();

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

} );
