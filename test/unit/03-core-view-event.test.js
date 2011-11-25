module( "03-core-view-event.js" );

var debug = via.debug;

test( "addViewHandler --> handler as a ad-hoc function", function () {
	assertEmptyDb();
	var path = "a";
	var value = "a";

	var view1 = {};
	var view2 = {};

	var views = [
		view1,
		view2
	];

	var oldValues = ["a", "a1"];
	var newValues = ["a1", "a2"];

	var viewEvents = "click|dblClick";
	var options = {};

	via().create( path, value );

	var index = 0;

	function viewHandler( viewEvent ) {
		var expected = new via.ViewEvent( {
			path: path,
			options: options
		} );

		equal(viewEvent.path, path);
		equal(viewEvent.options, options);

		equal( this, views[index % 2], "'this' in viewHandler refer to the view itself" );
		equal( viewEvent.targetValue(), oldValues[index], "viewEvent.targetValue() return the value at the path" );

		viewEvent.updateModel( newValues[index] );
		equal( via().get( path ), newValues[index], "viewEvent.updateModel(newValue) can update the value at the path" );

		index ++;
	}

	via.addViewHandler( views, viewEvents, path, viewHandler, options );

	//
	deepEqual( via.getViewHandlerData(path), views, "via.debug.viewHandlerData[path] is pushed with the views" );

	$( views ).click().dblclick();
	via.removeView( views );
	equal( debug.isView( view1 ), false, "after view1 is removed from via, it is not marked as view" );
	equal( debug.isView( view2 ), false, "after view2 is removed from via, it is not marked as view" );

	via().del( path );
} );

test( "addViewHandler --> viewHandler as common viewHandler", function () {
	assertEmptyDb();
	var path = "a";
	var value = "a";
	var value2 = "a2";
	var view = {};

	via().create( path, value );

	via.commonViewHandlers.test = function ( viewEvent ) {
		viewEvent.updateModel( value2 );
		equal( via().get( path ), value2, "you can use '*test' as viewHandler, which link to via.commonViewHandlers.test" );
	};

	via.addViewHandler( view, "click", path, "*test" );
	$( view ).click();

	via.removeView( view );
	via().del( path );
} );

test( "addViewHandler --> viewHandler as member of view", function () {
	assertEmptyDb();

	var path = "a";
	var value = "a";
	var value2 = "a2";

	via().create( path, value );
	var view = {
		method: function ( viewEvent ) {
			viewEvent.updateModel( value2 );
		}
	};

	via.addViewHandler( view, "click", path, "v.method" );
	$( view ).click();

	equal( via().get( path ), value2, "if view has a member function fn, it will call this[fn](viewEvent)" );

	via().del( path );
	via.removeView( view );
	delete via.commonViewHandlers.test;
} );

/*test( "addViewHandler --> viewHandler as a member of the Proxy", function () {

	assertEmptyDb();

	via.fn.setMessage = function ( options ) {
		this.update( "hello " + options );
	};

	var path = "message";

	var view = {};

	via().create( path, "" );
	via.addViewHandler( view, "click", path, "setMessage", "fred" );
	$( view ).click();

	equal( via().get( path ), "hello fred", "a proxy member can be used as viewHandler" );
	delete via.fn.setMessage;
	via().del( path );
	via.removeView( view );

} );*/

test( "addViewHandler --> a converter to be used to convert string to a typed value before used to update model",
	function () {
		assertEmptyDb();
		var content = $( "<div>100</div>" ).appendTo( "#qunit-fixture" );
		var path = "number";

		via().create( path, 0 );
		via.addViewHandler( $( "#qunit-fixture div" ), "change", path, "$text", "*toNumber" );

		via.valueConverters.toNumber = via.valueConverters.toNumber || function ( value ) {
			return +value;
		};

		content.change();

		equal( via().get( path ), 100, "*Converter can used as option to convert value before value is used to update model" )
		content.remove();
		via().del( path );

	} );

test( "addViewHandler --> viewHandler's viewEvent", function () {

	assertEmptyDb();
	var path = "a";
	var value = "a";
	var value2 = "a2";
	via().create( path, "a" );
	var view = $( "<button>100</button>" ).appendTo( "#qunit-fixture" );
	var options = {};

	via.addViewHandler( view, "click", path, function ( viewEvent ) {
		equal( viewEvent.path, path, "viewEvent has a path" );
		equal( viewEvent.options, options, "viewEvent has a option" );
		deepEqual( viewEvent.triggerData, 100, "viewEvent has triggerData" );
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
