module( "02-core-model-event.js" );

var debug = via.debug;
var modelHandlerData = via.getModelHandlerData();

test( "when a model event handler should be called", function () {

	var shouldInvokeModelHandler = debug.shouldInvokeModelHandler;
	//function shouldInvokeModelHandler( subscribedEvents, event ) {
	ok( shouldInvokeModelHandler( "*", "whatever" ), "* match all what ever event" );
	ok( shouldInvokeModelHandler( "*", "whatever.whatever" ), "* match all what ever event" );

	ok( shouldInvokeModelHandler( "whatever", "whatever" ), "support exact match" );
	ok( shouldInvokeModelHandler( "whatever.whatever", "whatever.whatever" ), "support exact match" );

	ok( !shouldInvokeModelHandler( "whatever", "whatever.whatever" ), "if there is not wildcar *, use exact match" );

	ok( shouldInvokeModelHandler( "*.", "whatever" ), "*. match all current node" );
	ok( !shouldInvokeModelHandler( "*.", "whatever.whatever" ), "*. does not match event with extension" );

	ok( shouldInvokeModelHandler( "before*", "beforeUpdate" ), "before* match beforeUpdate" );
	ok( shouldInvokeModelHandler( "before*", "beforeUpdate.parent" ), "before* match beforeUpdate.parent" );

	ok( shouldInvokeModelHandler( "before*.", "beforeUpdate" ), "before* match beforeUpdate" );
	ok( !shouldInvokeModelHandler( "before*.", "beforeUpdate.parent" ), "before*.  does not match beforeUpdate.parent" ); //

	ok( shouldInvokeModelHandler( "before*.parent", "beforeUpdate.parent" ), "before*.parent matches beforeUpdate.parent" );
	ok( !shouldInvokeModelHandler( "before*.parent", "beforeUpdate" ), "before*.parent  does not match beforeUpdate.parent" );
	ok( !shouldInvokeModelHandler( "before*.parent", "update.parent" ), "before*.parent  does not match update.parent" );

	ok( shouldInvokeModelHandler( "*.parent", "update.parent" ), "*.parent match update.parent" );
	ok( !shouldInvokeModelHandler( "*.parent", "beforeUpdate" ), "*.parent does not match beforeUpdate" );
} );

test( "via.addModelHandler -> how via.addModelHandler change internal modelHandlerData data structure", function () {

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
	strictEqual( modelHandlerData[path] && modelHandlerData[subPath], undefined,
		"after path is remove, modelHandlerData of " +
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
	], "if you omit the view parameter in addHandler the dummy view will be used" );

	rootProxy.del( path );

	strictEqual( modelHandlerData[path], undefined,
		"Removing a model will clean up its related record in modelHandlerData object" );

} );

test( "via.addModelHandler -->shadow & ModelEvent & order of event raising", function () {

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

	ok( shadow, "when a model is created,  its shadow is accessible by using proxy.get " );

	via.addModelHandler( "a*", "eventName", view, function() {}, options );

	strictEqual( shadow.mainPath, "a", "shadow.mainPath equals the path of its main model" );
	strictEqual( shadow.mainModel(), value.a, "shadow.mainModel() return this the value of main model" );

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

		strictEqual( this, view, "the context 'this' is the view itself" );

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

		equal( 1, order, "when change, the beforeUpdate event for the model happens first" );
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
		equal( 2, order, "after event trigger for the model, it bubbles up to parent" );
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

		equal( 3, order, "after beforeUpdate event, afterUpdate will be triggered" );
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

		equal( 4, order, "afterUpdate event will bubble up to model's parent" );
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

test( "via.addModelHandler -->use jQuery method as modelHandler", function() {
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
} );

test( "via.addModelHandler -->use common model handler as modelHandler", function () {

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

	assertEmptyDb();
} );

test( "via.addModelHandler -->use a member of view as modelHandler", function () {

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
	assertEmptyDb();
} );

test( "via.addModelHandler without view", function () {
	assertEmptyDb();
	var path = "a";
	var oldValue = "a";
	var newValue = "a2";
	var options = {};
	via().create( path, oldValue );

	via.addModelHandler( path, "beforeUpdate|beforeDel", function ( modelEvent ) {
		equal( this, window, "when via.addModelHandler without view, the 'this' context in the " +
		                     "modelHandler refers to global object 'window'" )
		modelEvent.hasError = true;
	}, options );

	via().update( path, newValue );

	equal( via().get( path ), oldValue, "In before* modelHandler, if modelEvent.hasError is true, " +
	                                    "update will fail" );

	via().del( path );

	equal( via().get( path ), oldValue, "when before* modelHandler return false, remove is not run" );

	var path2 = "b";
	via.addModelHandler( path2, "beforeCreate", function ( modelEvent ) {
		modelEvent.hasError = true;
	}, options );

	via().create( path2, "b" );
	equal( via().get( path2 ), undefined, "In before* modelHandler, if modelEvent.hasError is true," +
	                                      " create will fail" );
	via.removeModelHandler( path );
	via.removeModelHandler( path2 );

	via().del( path );
	via().del( path2 );
	assertEmptyDb();
} );

test( "via.addModelHandler --> disable model bubbling/eventing", function () {

	var model = {
		a: {
			b: {
				c: "c",
				d: function () {
					return this.c;
				}
			}
		}
	};

	via().create( model );

	var parentHandlerTriggered = false;
	var referencingHandlerTriggered = false;

	via.addModelHandler( "a", "after*", function ( modelEvent ) {
		parentHandlerTriggered = true;
	} );

	via.addModelHandler( "a.b.d", "after*", function ( modelEvent ) {
		referencingHandlerTriggered = true;
		modelEvent.bubbleUp = false;
	} );

	via().update( "a.b.c", "c2" );

	ok( parentHandlerTriggered, "by default event bubble up" );
	ok( referencingHandlerTriggered, "by default event spread out" );

	parentHandlerTriggered = false;
	referencingHandlerTriggered = false;

	via.addModelHandler( "a.b.c", "after*", function ( modelEvent ) {
		modelEvent.bubbleUp = false;
	} );

	via().update( "a.b.c", "c3" );

	ok( !parentHandlerTriggered, "bubbling up can be stopped by setting modelEvent.bubbleUp to false" );
	ok( referencingHandlerTriggered, "bubblingUp does not stop event spreading out" );

	via.removeModelHandler( "a.b.c" );

	strictEqual( modelHandlerData["a.b.c"], undefined, "via.removeModelHandler(path) can remove model handler data" );

	parentHandlerTriggered = false;
	referencingHandlerTriggered = false;

	via.addModelHandler( "a.b.c", "after*", function ( modelEvent ) {
		//modelEvent.bubbleUp = false;
		modelEvent.continueEventing = false;
	} );


	via().update( "a.b.c", "c4" );
	ok( !parentHandlerTriggered && !referencingHandlerTriggered, "modelEvent.continueEventing can stop bubbling and spreading out" );

	via.removeModelHandler( "a" );
	strictEqual( modelHandlerData.a, undefined, "via.removeModelHandler(path) can remove model handler data" );

	via().del( "a", true );
	assertEmptyDb();

} );

test( "via.addModelHandler --> options", function () {

	var path = "a";
	var value = "a";
	via().create( path, value );
	via.addModelHandler( path, "afterUpdate", function ( modelEvent ) {
		strictEqual( modelEvent.options, undefined, "modelHandler options can be explicitly set to undefined using '_'" );

	}, "_" );

	via().update( path, "a2" );
	via.removeModelHandler( path );

	var fakeOptions = {};

	var modelHandler = function ( modelEvent ) {

		equal( modelEvent.options, fakeOptions,
			"a modelHandler can have a options function to seed a default options or " +
			"convert a string options into typed options" );

	};

	modelHandler.buildOptions = function ( options ) {
		return fakeOptions;
	};

	via.addModelHandler( path, "afterUpdate", modelHandler );

	via().update( path, "a3" );

	via().del( path );

	assertEmptyDb();
} );

test( "via.addModelHandler --> renderViews and once", function () {
	var path = "a";
	var value = "a";
	via().create( path, value );

	var view = {};

	via.renderViews( path, view, function ( modelEvent ) {
		this.v1 = modelEvent.currentValue();
	} );

	equal( view.v1, value, "via.renderViews can call the modelHandler once" );

	strictEqual( modelHandlerData[path], undefined, "via.renderViews(path, view, modelHandler) will not keep modelHandler" +
	                                                " in modelHandlerData" );

	via.addModelHandler( path, "once", view, function ( modelEvent ) {
		this.v2 = modelEvent.currentValue();
	} );

	equal( view.v2, value, "via.addModelHandler(path, 'once', modelHandler) will call the modelHandler once" );

	strictEqual( modelHandlerData[path], undefined, "via.addModelHandler(path, 'once', modelHandler) will not keep modelHandler" +
	                                                " in modelHandlerData" );

	via.addModelHandler( path, "init", view, function ( modelEvent ) {
		this.v3 = modelEvent.currentValue();
	} );

	equal( view.v3, value, "via.addModelHandler(path, 'init', ..) will call the modelHandler once" );

	strictEqual( modelHandlerData[path].length, 1, "via.addModelHandler(path, 'init', modelHandler) will keep modelHandler" +
	                                               " in modelHandlerData" );

	via.removeView( view )
	via().del( path );
	assertEmptyDb();

} );

test( "via.addModelHandler --> using jQuery object", function () {
	ok( $.fn.addModelHandler, "jQuery object has addModelHandler method" );
	var view = {};
	var path = "a";
	var value = "v";
	via().create( path, value );

	$( view ).addModelHandler( path, "once", function ( modelEvent ) {
		equal( this, view, "the view wrapped in the jQuery object is passed as 'this' model handler " );
	} );

	via().del( path );
	assertEmptyDb();
	expect( 3 );
} );
