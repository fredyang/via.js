module( "02-core-model-event.js" );

var debug = via.debug;
var modelHandlerData = via.getModelHandlerData();

test( "shouldUpdateView test", function () {

	var shouldUpdateView = debug.shouldUpdateView;
	//function shouldmodelHandler( event, subscribedEvents ) {
	ok( shouldUpdateView( "*", "whatever" ), "* match all what ever event" );
	ok( shouldUpdateView( "*", "whatever.whatever" ), "* match all what ever event" );

	ok( shouldUpdateView( "*.", "whatever" ), "*. match all current node" );
	ok( !shouldUpdateView( "*.", "whatever.whatever" ), "*. does not match event with extension" );

	ok( shouldUpdateView( "before*", "beforeUpdate" ), "before* match beforeUpdate" );
	ok( shouldUpdateView( "before*", "beforeUpdate.parent" ), "before* match beforeUpdate.parent" );

	ok( shouldUpdateView( "before*.", "beforeUpdate" ), "before* match beforeUpdate" );
	ok( !shouldUpdateView( "before*.", "beforeUpdate.parent" ), "before*.  does not match beforeUpdate.parent" ); //

	ok( shouldUpdateView( "before*.parent", "beforeUpdate.parent" ), "before*.parent matches beforeUpdate.parent" );
	ok( !shouldUpdateView( "before*.parent", "beforeUpdate" ), "before*.parent  does not match beforeUpdate.parent" );
	ok( !shouldUpdateView( "before*.parent", "update.parent" ), "before*.parent  does not match update.parent" );

	ok( shouldUpdateView( "*.parent", "update.parent" ), "*.parent match update.parent" );
	ok( !shouldUpdateView( "*.parent", "beforeUpdate" ), "*.parent does not match beforeUpdate" );
} );

var emptyDb = {
	__via: {
		invalidModelPaths: []
	}
};

function assertEmptyDb() {
	deepEqual( via().get(), emptyDb, "The root is empty" );
	ok( $.isEmptyObject( via.modelReferences ), "modelReferences is empty" );
	ok( isModelHandlerDataEmpty(), "modelHandlerData is empty" );
	ok( $.isEmptyObject(via.getViewHandlerData()), "viewHandlerData is empty" );
}

function isModelHandlerDataEmpty() {
	//	var modelHandlerData = via.getModelHandlerData();
	//	for ( var path in modelHandlerData ) {
	//		for ( var i = 0; i < modelHandlerData[path].length; i++ ) {
	//			if ( modelHandlerData[path][i].view !== debug.dummyView ) {
	//				return false;
	//			}
	//		}
	//	}
	//	return true;
	var data = via.getModelHandlerData()
	return $.isEmptyObject( data );
}

test( "addModelHandler -->internal modelHandlerData", function () {

	assertEmptyDb();

	var view1 = {};
	var view2 = {};
	var views = [view1, view2];
	var options = {};
	var modelHandler = function () {};
	var events = "afterUpdate";
	var path = "a";
	var value = {b: "c"};
	var subPath = "a.b";

	var rootProxy = via();
	rootProxy.create( path, value );

	via.addModelHandler( path, events, view1, modelHandler, options );
	via.addModelHandler( subPath, events, view2, modelHandler, options );

	deepEqual( modelHandlerData[path], [
		{
			view: view1,
			modelHandler: modelHandler,
			modelEvents: events,
			options: options
		}
	], "the information that the model need to notify views " +
	   "is saved in modelHandlerData[modelPath]" );

	deepEqual( modelHandlerData[subPath], [
		{
			view: view2,
			modelHandler: modelHandler,
			modelEvents: events,
			options: options
		}
	] );

	rootProxy.del( path );
	//you don't need to call
	//rootProxy.remove(subPath);
	deepEqual( modelHandlerData[path] && modelHandlerData[subPath], undefined, "after path is remove, modelHandlerData of " +
	                                                                           "the path and its subPath is automatically removed" );

	//add the value and handler again, to test removeView
	rootProxy.create( path, value );
	via.addModelHandler( path, events, view1, modelHandler, options );
	via.addModelHandler( subPath, events, view2, modelHandler, options );

	via.removeView( views );

	//the reason it is one is that there is a debugger handler attache to root
	//check modelHandler.js debug section
	ok( $.isEmptyObject( modelHandlerData ), "via.removeView( views ) also cleanup the " +
	                                         "modelHandlerData of associated with the views " );

	via.addModelHandler( path, events, modelHandler, options );
	deepEqual( modelHandlerData[path], [
		{
			view: debug.dummyView,
			modelHandler: modelHandler,
			modelEvents: events,
			options: options
		}
	], "if you omit the view parameter in addHandler the missing view will be used" );

	rootProxy.del( path );

	deepEqual( modelHandlerData[path], undefined, "remove path will clean up its related record in modelHandlerData object" );
} );

test( "addModelHandler -->shadow & ModelEvent & order of event raising", function () {

	assertEmptyDb();

	var value = {
		a: {
			b: {
				c: {
					d: "d"
				}
			}
		}
	};

	via().create( value );

	var view = {};
	var options = {};

	var shadow = via().get( "a*" );
	ok( shadow, "when via().get('a') is defined,  use \"via().get('a*'')\" directly access shadow object, " +
	            "the access shadow object will be created automatically " );

	via.addModelHandler( "a*", "bogus", view, function() {}, options );

	shadow = via().get( "a*" );

	//shadow.model && shadow.modelPath
	ok( shadow, "when use \"via.modelHandler('a*', 'bogus', view, function() {}, data);\" first," +
	            " then shadow object is created, then you can" +
	            " access path using \"via().get('a*');\"" );

	ok( shadow.mainModel && shadow.mainPath, "by default shadow has member shadow.model() && shadow.modelPath() " );

	deepEqual( shadow.mainPath, "a", "shadow.modelPath point back the original path" );
	deepEqual( shadow.mainModel(), value.a, "shadow.model() return the value at original path" );

	via().del( "a" );
	shadow = via().get( "a*" );
	equal( shadow, undefined, "after via().remove(path), it's shadow object also get removed" );

	value = {
		a: {
			b: {
				c: {
					d: "d"
				}
			}
		}
	};

	via().create( value );

	via.addModelHandler( "a.b.c.d", "init", view, function ( modelEvent ) {

		var expectedContext = new via.ModelEvent( {
			path: "a.b.c.d",
			target: "a.b.c.d",
			eventType: "init",
			options: options
		} );

		deepEqual( modelEvent, expectedContext, "modelEvent in init event is expected" );

		equal( value.a.b.c.d, modelEvent.currentValue(), "modelEvent.currentValue() return the current " +
		                                                   "value of model" );

		equal( value.a.b.c.d, modelEvent.targetValue(), "modelEvent.targetValue() return " +
		                                                  "the target value of model" );

		equal( "d", modelEvent.targetIndex(), "modelEvent.targetIndex() return " +
		                                        "the last part of the path" );

		equal( "a.b.c", modelEvent.targetContext(), "modelEvent.targetContext() return " +
		                                              "the part before targetIndex in the path" );

	}, options );

	var order = 1;

	via.addModelHandler( "a.b.c", "beforeUpdate", view, function ( modelEvent ) {

		equal( 1, order, "when change, the event for the target node happens first" );
		order++;

		var expectedContext = new via.ModelEvent( {
			path: "a.b.c",
			target: "a.b.c",
			eventType: "beforeUpdate",
			proposed: {
				d: "d1"
			},
			options: options
		} );

		deepEqual( modelEvent, expectedContext, "modelEvent in beforeUpdate event is expected" );
		deepEqual( { d: "d"}, modelEvent.currentValue(), "beforeUpdate modelEvent.currentValue() return " +
		                                                   "the current value" );

	}, options );

	//bubble up
	via.addModelHandler( "a.b", "beforeUpdate.child", view, function ( modelEvent ) {
		equal( 2, order, "after event trigger for the target node, it bubbles up to parent" );
		order++;
		var expectedContext = new via.ModelEvent( {
			path: "a.b",
			target: "a.b.c",
			eventType: "beforeUpdate.child",
			proposed:  {
				d: "d1"
			},
			options: options
		} );

		deepEqual( modelEvent, expectedContext, "modelEvent in beforeUpdate.child event is expected" );

		deepEqual( {c: { d: "d"}}, modelEvent.currentValue(), "in event beforeUpdate.child the modelEvent.currentValue()" +
		                                                        " return current value of current path" );

		deepEqual( { d: "d"}, modelEvent.targetValue(), "in event beforeUpdate.child," +
		                                                  " modelEvent.targetValue() return the value" +
		                                                  " is the current value of target path" );

	}, options );

	via.addModelHandler( "a.b.c", "afterUpdate", view, function ( modelEvent ) {

		equal( 3, order, "after beforeUpdate event, it is afterUpdate" );
		order++;

		var expectedContext = new via.ModelEvent( {
			path: "a.b.c",
			target: "a.b.c",
			eventType: "afterUpdate",
			removed: {
				d: "d"
			},
			options: options
		} );

		deepEqual( modelEvent, expectedContext, "modelEvent in afterUpdate event is expected" );

	}, options );

	via.addModelHandler( "a.b", "afterUpdate.child", view, function ( modelEvent ) {

		equal( 4, order, "after beforeUpdate event, it is afterUpdate" );
		order++;

		var expectedContext = new via.ModelEvent( {
			path: "a.b",
			target: "a.b.c",
			eventType: "afterUpdate.child",
			removed: {
				"d": "d"
			},
			options: options
		} );

		deepEqual( modelEvent, expectedContext, "modelEvent in afterUpdate.child event is expected" );

		deepEqual( {c: { d: "d1"}}, modelEvent.currentValue(), "in event afterUpdate.child the modelEvent.currentValue()" +
		                                                         " return new value of current path" );

		deepEqual( { d: "d1"}, modelEvent.targetValue(), "in event afterUpdate.child," +
		                                                   " modelEvent.targetValue() return the value" +
		                                                   " is the new value of target path" );

	}, options );

	via( "a.b.c" ).update( {
		d: "d1"
	} );

	via().del( "a" );
	via.removeView( view );
} );

test( "addModelHandler -->modelHandler function as jQuery method", function() {
	assertEmptyDb();
	var path = "a";
	var value = "a";
	var newValue = "a1";
	var color = "rgb(255, 0, 0)";

	via().create( path, value );
	via().create( "color", color );

	var $view = $( "<div id='xyz'></div>" ).appendTo( "#qunit-fixture" );

	via.addModelHandler( path, "init|afterUpdate", $view, "$text" );
	via.addModelHandler( "color", "init|afterUpdate", $view, "$css" );
	via.addModelHandler( "color", "init|afterUpdate", $view, "$css", "backgroundColor" );

	//test init
	equal( $view.text(), value, "jQuery method can be used as modelHandler in init event" );
	equal( $view.css( "color" ), "rgb(255, 0, 0)", "jQuery css method can be used as modelHandler in init event," +
	                                               "the css property can be infer from the last part of the path" );

	equal( $view.css( "backgroundColor" ), "rgb(255, 0, 0)", "jQuery css method can be used as modelHandler in init event," +
	                                                         "the css property can be explicitly specified as the data parameter in " +
	                                                         "modelHandler method" );

	//test update
	via().update( path, newValue );
	equal( $view.text(), newValue, "jQuery method can be used as modelHandler in afterUpdate event" );

	via().update( "color", "rgb(255, 255, 0)" );
	equal( $view.css( "color" ), "rgb(255, 255, 0)", "jQuery css method can be used as modelHandler in afterUpdate event" );
	equal( $view.css( "backgroundColor" ), "rgb(255, 255, 0)", "jQuery css method can be used as modelHandler " +
	                                                           "in afterUpdate event, the css property can be explicitly" +
	                                                           "specified as the data parameter in modelHandler method" );

	via().del( path );
	via().del( "color" );
	$view.remove();
	assertEmptyDb();
	ok( true, "when jQuery object is remove from dom, cleanup method also remove the view from via" );
} );

test( "addModelHandler -->modelHandler function as common modelHandler function", function () {

	assertEmptyDb();
	var path = "a";
	var value = "a";

	via().create( path, value );
	via.commonModelHandlers.test = function ( modelEvent ) {
		this.method( modelEvent.currentValue() );
	};

	var temp = "";

	var view = {
		method: function ( text ) {
			if ( text === undefined ) {
				return temp;
			}
			temp = text;
		}
	};

	via.addModelHandler( path, "init", view, "*test" );
	equal( view.method(), value, "you can bind '*method' as modelHandler in init event, " +
	                             "which reference the via.commonModelHandlers.method" );

	delete via.commonModelHandlers.test;
	via.removeView( view );
	via().del( path );

} );

test( "addModelHandler -->modelHandler function as a member of view", function () {

	assertEmptyDb();
	var path = "b";
	var value = "b";

	var temp = "";

	var view = {
		method: function ( text ) {
			if ( text === undefined ) {
				return temp;
			}
			temp = text;
		}
	};

	via().create( path, value );
	via.addModelHandler( path, "init|afterUpdate", view, "v.method" );
	equal( view.method(), value, "view.method can be used as modelHandler in init event" );
	via.removeView( view );
	via().del( path );

} );

test( "addModelHandler without view", function () {
	assertEmptyDb();
	var path = "a";
	var value = "a";
	var options = {};
	via().create( path, value );

	via.addModelHandler( "a", "beforeUpdate|beforeDel", function ( modelEvent ) {
		modelEvent.hasError = true;
	}, options );

	via().update( path, "a2" );
	equal( via().get( path ), value, "when before* modelHandler return false, update is not run" );

	via().del( path );
	equal( via().get( path ), value, "when before* modelHandler return false, remove is not run" );

	var path2 = "b";
	via.addModelHandler( path2, "beforeCreate", function ( modelEvent ) {
		modelEvent.hasError = true;
	}, options );

	via().create( path2, "b" );
	equal( via().get( path2 ), undefined, "when before* modelHandler return false, create is not run" );
	via.removeModelHandler(path2);

	via.empty();
} );

test( "model event bubbling test", function () {
	assertEmptyDb();

	via().create( {
		a: {
			b: {
				c: "c"
			}
		}
	} );

	var parentHandlerTriggered = false;

	via.addModelHandler( "a", "after*", function ( modelEvent ) {
		parentHandlerTriggered = true;
	} );

	via().update( "a.b.c", "c2" );
	ok( parentHandlerTriggered, "by default event bubble up" );
	parentHandlerTriggered = false;

	via.addModelHandler( "a.b.c", "after*", function ( modelEvent ) {
		modelEvent.bubbleUp = false;
	} );

	ok( !parentHandlerTriggered, "bubbling up can be stopped by setting modelEvent.bubleUp to false" );

	via().del( "a" );
} );

test( "addModelHandler --> options", function () {
	assertEmptyDb();
	var path = "a";
	var value = "a";
	via().create( path, value );
	via.addModelHandler( path, "afterUpdate", function ( modelEvent ) {
		deepEqual( modelEvent.options, undefined, "modelHandler options can be explicitly set to undefined using '_'" );

	}, "_" );

	via().update( path, "a2" );
	via.removeModelHandler( path );

	var fakeOptions = {};

	var modelHandler = function ( modelEvent ) {
		deepEqual( modelEvent.options, fakeOptions, "a modelHandler can have a options function to seed a default options or convert a string options into typed options" );
	};
	modelHandler.buildOptions = function ( options ) {
		return fakeOptions;
	};

	via.addModelHandler( path, "afterUpdate", modelHandler );

	via().update( path, "a3" );

	via().del( path );

} );

test( "renderViews and once", function () {
	assertEmptyDb();
	var path = "a";
	var value = "a";
	via().create( path, value );

	var view = {};

	via.renderViews( path, view, function ( modelEvent ) {
		this.value = modelEvent.currentValue();
	} );

	equal( view.value, value, "via.renderViews can call the modelHandler once" );
	via().del( path );
	assertEmptyDb();

} );

test( "jquery.fn.addHandler", function () {
	ok( $().addModelHandler, "jQuery object has addModelHandler method" );
} );
