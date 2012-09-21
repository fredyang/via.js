module( "declarative.js" );

var debug = via.debug;

test( "convert rule string to rules object", function() {
	var ruleString1 = "@x";
	var rules1 = debug.convertStringToDataSub( ruleString1 );
	deepEqual( rules1, {x: null}, "a rule without value will be deserialized into a null entry" );
	//
	var ruleString2 = "`class1:path|options  1   `class2:path `class3  \n @x:x1, x2, x3#22 \n @y:32kj, \n 2 , \n x3#22 @z \n";
	var rules2 = debug.convertStringToDataSub( ruleString2 );

	deepEqual( rules2, {
		class: "class1|path|options  1;class2|path;class3",
		x: "x1, x2, x3#22",
		y: "32kj, \n 2 , \n x3#22",
		z: null
	}, "the space between rules and after will be truncated." );
} );

test( "get defaultTheme", function() {

	var defaultTheme = via.options.theme;
	equal( defaultTheme, "via", "the default theme is 'via'" );

	var markup = $( "<div id='v1' data-sub='@ns:xyz' />" );
	markup.buildSubscriptionObjects();
	equal( markup.dataSub().theme, defaultTheme, "if there is no @sub or @pub rules, its theme is default theme" );
} );

test( "buildSubscriptionObjects, path, theme", function() {

	var $container = $( "<div></div>" );
	var subscriptions = $container.buildSubscriptionObjects();
	ok( !subscriptions, "If element does not have rule attribute, then buildSubscription will return undefine" );
	ok( !$container.dataSub(), "If element has not rule attribute, then buildSubscription " +
	                           "will return not define the rules object into its data storage" );

	$container = $( "<div data-sub='@ns:a'>" +
	                "<input data-sub='@ns:b' />" +
	                " <span data-sub='@theme:mytheme " +
	                "@options:elemOption " +
	                "@ns:b " +
	                "@pub:change|c|handler|pubOption;" +
	                "click|e|handler|_" +
	                "@pub:change|f|handler" +
	                "@sub:/d|afterUpdate|handler'>" +
	                "</span>" +
	                "</div>" );

	subscriptions = $container.buildSubscriptionObjects();

	deepEqual( $container.dataSub(), {
		ns: "a",
		theme: "via"
	}, "If rule attribute of an element is not null, it will create an rules object, the theme" +
	   " by default is 'via'" );

	ok( !subscriptions, "Subscriptions and rules are two different things, " +
	                    "even an element has rule attribute, buildSubscription may not necessarily" +
	                    "return subscriptions" );

	var $input = $container.find( "input" );
	$input.buildSubscriptionObjects();

	deepEqual( $input.dataSub(), {
		ns: "a.b",
		theme: "via"
	}, "In rule text, if the path of element is relative, like '.b', " +
	   "the full path will be inferred using the path of parent, theme" +
	   "can also inherite from parent" );

	var $span = $container.find( "span" );
	subscriptions = $span.buildSubscriptionObjects();

	deepEqual( $span.dataSub(), {
		ns: "a.b",
		theme: "mytheme",
		options: "elemOption",
		pub: "change|c|handler|pubOption;click|e|handler|_;change|f|handler",
		sub: "/d|afterUpdate|handler"
	}, "If the path of element is not relative, then the path is the fullpath, " +
	   "theme can also be overrided, rule like @pub or @sub can be used mulitple times," +
	   "within each @pub or @sub, you can use ';' to seperate rules" );

	deepEqual( subscriptions[0], {
		publisher: "d",
		eventTypes: "afterUpdate",
		subscriber: $span[0],
		handler: "handler",
		options: "elemOption",
		delegate: undefined
	}, "If the path of a subscription is not relative path, " +
	   "then it is the path. " +
	   "If the subscription options is missing, " +
	   "it is filled with the elem option," +
	   "the @sub's syntax is @sub:path|modelEventNames|handler|options" );

	deepEqual( subscriptions[1], {
			publisher: $span[0],
			eventTypes: "change",
			subscriber: "a.b.c",
			handler: "handler",
			options: "pubOption",
			delegate: undefined
		},
		"The path of a subscription can also be a relative path, " +
		"its path is inferred from the path of" +
		"the element and the relative path, the " +
		"@pub's syntax is @pub:viewEventName|path|handler|options" );

	//@pub:change|.c|handler|pubOption;click|.e|handler|_
	deepEqual( subscriptions[2], {
			publisher: $span[0],
			eventTypes: "click",
			subscriber: "a.b.e",
			handler: "handler",
			options: "_",
			delegate: undefined
		},
		"You can explicitly set the options of subscriptions to be undefined, " +
		"so that it will not inherit from element's options" );

} );

test( "class rule and options inheritence", function() {

	//delete via.masterClassSheet.via;
	via.classes.x = "@sub:.|init|*wrap|xSubOptions;" +
	                "@pub:click|.|*click";

	via.classes.y = "@class:x" +
	                "@sub:.|update|*text|ySubOptions";

	via.classes.z = "@pub:click|.|handler|zPubOptions";

	via.classes.a = "@class:b|.|aClassOptions";

	via.classes.b = "@pub:click|.|handler";

	var $elem = $( "<div data-sub='@ns:a @class:x'></div>" ).appendTo( testArea() );

	var subscriptions = $elem.buildSubscriptionObjects();

	deepEqual( subscriptions.length, 2, "class rule can group rules like @sub and @pub" );

	$elem.remove();

	$elem = $( "<div data-sub='@ns:a @class:y'></div>" ).appendTo( testArea() );
	subscriptions = $elem.buildSubscriptionObjects();

	deepEqual( subscriptions.length, 3, "class rule can group other class rules @class as well" );
	$elem.remove();

	$elem = $( "<div data-sub='@ns:a @class:y;x'></div>" ).appendTo( testArea() );

	subscriptions = $elem.buildSubscriptionObjects();
	deepEqual( subscriptions.length, 5, "Subscriptions can be duplicated in rules, " +
	                                    "this can cause defect" );
	$elem.remove();

	$elem = $( "<div data-sub='@ns:a @class:x|.|xClassOptions'></div>" ).appendTo( testArea() );

	subscriptions = $elem.buildSubscriptionObjects();

	equal( subscriptions[1].options, "xClassOptions",
		"When options is not defined in @sub or @pub which are grouped in class rule, " +
		"use class options if it is not empty" );

	equal( subscriptions[0].options, "xSubOptions",
		"When options is defined in @sub or @sub, use this options over class rule options" );

	$elem = $( "<div data-sub='@ns:a `x:.|xClassOptions'></div>" ).appendTo( testArea() );

	var subscriptions2 = $elem.buildSubscriptionObjects();
	ok( subscriptions2[0].eventTypes == subscriptions[0].eventTypes &&
	    subscriptions2[0].options == subscriptions[0].options &&
	    subscriptions2[1].eventTypes == subscriptions[1].eventTypes &&
	    subscriptions2[1].options == subscriptions[1].options,
		"you can use `className:path|options instead of @class:className|path|options" );

	$elem = $( "<div data-sub='@ns:a @options:elemOptions @class:x|.|classOptions'></div>" ).appendTo( testArea() );
	subscriptions = $elem.buildSubscriptionObjects();

	equal( subscriptions[1].options, "classOptions",
		"When options is not defined in @sub  or @pub, and both elem options are class options " +
		"are defined, class options will be used" );

	$elem = $( "<div data-sub='@ns:a @options:elemOptions @class:x'></div>" ).appendTo( testArea() );
	subscriptions = $elem.buildSubscriptionObjects();

	equal( subscriptions[1].options, "elemOptions",
		"When options is not defined in @sub  or @pub, and elem options is not defined, " +
		"but class options is defined, class options will be used" );

	$elem = $( "<div data-sub='@ns:a @options:elemOptions `x'></div>" ).appendTo( testArea() );
	subscriptions2 = $elem.buildSubscriptionObjects();

	ok( subscriptions2[0].eventTypes == subscriptions[0].eventTypes &&
	    subscriptions2[0].options == subscriptions[0].options &&
	    subscriptions2[1].eventTypes == subscriptions[1].eventTypes &&
	    subscriptions2[1].options == subscriptions[1].options,
		"you can use `className instead of @class:className" );

	$elem = $( "<div data-sub='@ns:a @options:elemOptions @class:z|.|,classOptions'></div>" ).appendTo( testArea() );
	subscriptions = $elem.buildSubscriptionObjects();
	equal( subscriptions[0].options, "zPubOptions,classOptions",
		"If both class options and subsription options are defined, and " +
		"in your class there is only one subscritpion in  @pub or @sub, " +
		"the subscription's options will be 'classOptions,subscriptionOptions'" );

	$elem = $( "<div data-sub='@ns:a @options:elemOptions @class:z'></div>" ).appendTo( testArea() );
	subscriptions = $elem.buildSubscriptionObjects();
	equal( subscriptions[0].options, "zPubOptions",
		"If both element options and subsription options are defined, and " +
		"in your class there is only one subscritpion in  @pub or @sub, " +
		"the subscription's options will be 'subscriptionOptions'" );

	//	via.classes.a = "@class:b|.|aClassOptions";
	//	via.classes.b = "@pub:click|.|handler";

	$elem = $( "<div data-sub='@ns:a @class:a'></div>" ).appendTo( testArea() );
	subscriptions = $elem.buildSubscriptionObjects();
	equal( subscriptions[0].options, "aClassOptions",
		"a class options can be passed into an other class options" );

	$elem.remove();
	$elem = $( "<div data-sub='@ns:abc'></div>" ).appendTo( testArea() );
	$elem.buildSubscriptionObjects();
	var context = $elem.dataSub();
	equal( context.ns, "abc", "@ns is same as @ns" );

} );

test( "custom rule value and options", function() {

	via.userSubsProps.rule1 = function( elem, parseContext, subscriptions, options ) {
		equal( options, "options",
			"If you use @rule1:options, you can assess options" );
	};

	//compare line 259
	//the options is passed into the rule function as options parameter
	var $div = $( "<div data-sub='@ns:x @rule1:options'></div>" ).appendTo( testArea() );

	$div.buildSubscriptionObjects();

	via.userSubsProps.rule2 = function( elem, parseContext, subscriptions, options ) {
		ok( parseContext.options = "options" && options === "options",
			"If you use `rule2:.|options or class binding '@class:rule2|.|options' " +
			"indirectly, you can assess options using rules.options or options" );
	};

	via.classes.rule2 = "@rule2:.";
	debug.clearClassDeclarations();

	//compare line 244 , because path, options is
	//passed the rule function as rules.options
	var $div2 = $( "<div data-sub='`rule2:.|options'></div>" );
	$div2.buildSubscriptionObjects();

	delete via.userSubsProps.dummy;
	delete via.userSubsProps.dummy2;
	delete via.classes.dummy2;
	assertEmptyDb();
} );

test( "class options merged with subscription options", function() {
	debug.clearClassDeclarations();

	via.classes.dummy = "@pub:click|.|handler1;" +
	                    "update|.|handler2";

	via.classes.dummy2 = "@pub:click|.";
	via.classes.dummy3 = "@pub:click|.|handler|options3";

	var $div = $( "<div data-sub='@ns:x @class:dummy|.|classOptions'></div>" );
	var subscriptions = $div.buildSubscriptionObjects();
	ok( subscriptions[0].options == subscriptions[1].options,
		"If a class has two subscriptions, the class option is available for both subscriptions to pickup" );

	var $div2 = $( "<div data-sub='@ns:x @class:dummy2|path2|handler|dummyOptions2'></div>" );
	var subscriptions2 = $div2.buildSubscriptionObjects();

	//@class:dummy2|.|handler|dummyOptions2'
	//will be convert to
	//@pub:click|path2|handler|dummyOptions2
	ok( subscriptions2[0].handler == "handler" && subscriptions2[0].options === "dummyOptions2",
		"If a class has only one subscription, the class options will be appended to the" +
		"end of the subscription string, this " );

	var $div3 = $( "<div data-sub='@class:dummy3|x|,classOption3'></div>" );
	var subscription3 = $div3.buildSubscriptionObjects()[0];
	ok( subscription3.options == "options3,classOption3" )

	assertEmptyDb();
} );

test( "create new theme", function() {

	via.classes.x = "@sub:.|init|*wrap,options1;" +
	                "@pub:.|click|*click";

	via.themes.test = {
		parentThemes: "via",
		classes: {
			x: "@sub:.|init|*wrap|test.x.options"
		}
	};

	var markup = $( "<div data-sub='@theme:test @ns:a @class:x'></div>" ).appendTo( "#qunit-fixture" );

	var subscriptions = markup.buildSubscriptionObjects();
	equal( subscriptions[0].options, "test.x.options", "you can use other themes" );
	markup.remove();

} );