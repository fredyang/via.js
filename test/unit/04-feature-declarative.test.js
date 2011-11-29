module( "04-feature-declarative.js" );

var debug = via.debug;
var convertBindingTextToBindingObject = debug.buildBinding;
var buildHandlerData = debug.processViaAttr;

test( "buildHandlers --> convertBindingTextToBindingObject", function () {
	var text1 = "@x";
	var binding1 = convertBindingTextToBindingObject( text1 );
	deepEqual( {x: true}, binding1, "building can convertBindingTextToBindingObject valueless parameter" );
	//
	var text2 = "   \n @x:x1, x2, x3#22 \n @y:32kj, \n 2 , \n x3#22 @z \n";
	var binding2 = convertBindingTextToBindingObject( text2 );
	deepEqual( binding2, {
		x:"x1, x2, x3#22",
		y: "32kj, \n 2 , \n x3#22",
		z: true
	}, "convertBindingTextToBindingObject can convert binding text to binding object text in like " + text2 );
} );
test( "buildHandlers --> defaultTheme", function () {

	var defaultTheme = via.options( "theme" );
	equal( defaultTheme, "via", "the default theme is 'via'" );

	var markup = $( "<div id='v1' via='@path:xyz' />" );
	buildHandlerData( markup );
	equal( markup.data( "via" ).theme, defaultTheme, "if binding has neither @mh or @vh, its theme is default theme" );
} );

test( "buildHandlerData", function () {
	var defaultTheme = via.options( "theme" );

	var markup = $( "<div id='parent' via='@class:_ @path:xyz'>" +
	                "<div id='child' via='@x' />" +
	                "</div>" ).appendTo( "#qunit-fixture" );

	var views = $( ":via", "#qunit-fixture" );
	ok( views.length, "can find views using ':via' selector" );
	views.view();

	var parentBinding = $( "#parent" ).data( "via" );
	var childBinding = $( "#child" ).data( "via" );

	equal( parentBinding.path, "xyz", "path can be explicitly specify using @path" );
	equal( childBinding.path, parentBinding.path, "parent's path is inherited from child view when child view does not have a explicit @path binding" );

	equal( parentBinding.theme, defaultTheme, "default theme is applied if view does not have @theme binding" );
	equal( childBinding.theme, defaultTheme, "default theme is applied if view does not have @theme binding" );

	markup.remove();

	$.each( debug.allBindings, function ( key ) {
		delete debug.allBindings[key];
	} );

	//delete via.masterClassSheet.via;
	via.themes.via.bindingSet.x = "@mh:.,init,*template,options1;" +
	                                "@vh:.,click,*click";

	via.themes.via.bindingSet.y = "@class:x" +
	                                "@mh:.,update,*text,option2";

	markup = $( "<div via='@path:a @class:x'></div>" ).appendTo( "#qunit-fixture" );

	var handlers = buildHandlerData( markup );
	deepEqual( handlers.mh.length, 1, "@class:x will import mh defined in @class:x" );
	deepEqual( handlers.vh.length, 1, "@class:x will import vh defined in @class:x" );
	markup.remove();

	markup = $( "<div via='@path:a @class:y'></div>" ).appendTo( "#qunit-fixture" );

	handlers = buildHandlerData( markup );
	deepEqual( handlers.mh.length, 2, "@class:y will import mh defined in @class:y, and its nested @class:x" );
	deepEqual( handlers.vh.length, 1, "@class:y will import vh defined in @class:y, and its nested @class:x" );
	markup.remove();

	markup = $( "<div via='@path:a @class:y;x'></div>" ).appendTo( "#qunit-fixture" );

	handlers = buildHandlerData( markup );
	deepEqual( handlers.mh.length, 3, "you can have more than one view type in binding data" );
	deepEqual( handlers.vh.length, 2, "you can have more than one view type in binding data" );
	markup.remove();

	//class can be just a className, or it can be className,path,options
	markup = $( "<div via='@path:a @class:x,.,options4'></div>" ).appendTo( "#qunit-fixture" );

	handlers = buildHandlerData( markup );
	//check via.themes.via.bindingSet.x
	deepEqual( handlers.mh[0].options, "options1", "when options is defined in binding.mh/mh, it has higher priority over the binding.options" );
	deepEqual( handlers.vh[0].options, "options4", "when options is not defined in binding.mh/vh, use binding.options" );
	markup.remove();

} );

test( "theme extension", function () {

	$.each( debug.allBindings, function ( key ) {
		delete debug.allBindings[key];
	} );

	via.themes.via.bindingSet.x = "@mh:.,init,*template,options1;" +
	                                "@vh:.,click,*click";

	via.themes.test = {
		subThemes:"via",
		bindingSet: {
			x: "@mh:.,init,*template,options5"
		}
	};

	markup = $( "<div via='@theme:test @path:a @class:x'></div>" ).appendTo( "#qunit-fixture" );

	handlers = buildHandlerData( markup );
	deepEqual( handlers.mh.length, 2, "you can have more than one view type in binding data" );
	deepEqual( handlers.vh.length, 1, "you can have more than one view type in binding data" );
	markup.remove();
} );

test( "buildPathWithContextAndIndex", function () {

	var buildPathWithContextAndIndex = debug.mergePath;

	equal( buildPathWithContextAndIndex( "a.b", undefined ), "a.b", "if index is not defined, use context as path" );

	equal( buildPathWithContextAndIndex( "a.b", "." ), "a.b", "if index is '.', use context as path" );

	equal( buildPathWithContextAndIndex( "a.b", ".c" ), "a.b.c", "if index is '.x', combine context and index as mergePath" );

	equal( buildPathWithContextAndIndex( "a.b", "*c" ), "a.b*c", "if index is '*x', combine context and index as mergePath" );

	equal( buildPathWithContextAndIndex( "a*b", "*c" ), "a*c", "if context is a*b,  index is *c, mergePath is a*c" );

	equal( buildPathWithContextAndIndex( "a.b", "..c" ), "a.c", "if index is '..x', combine context's context and index as mergePath" );

	equal( buildPathWithContextAndIndex( "a.b", ".*c" ), "a*c", "if index is '.*c', combine context's context and index as mergePath" );

	equal( buildPathWithContextAndIndex( "a.b", "d" ), "d", "if index is independent path, index is mergePath" );

} );