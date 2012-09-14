module( "template test" );

test( "render template with data", function() {
	via.template.engines( "jsrender", {
		render: function( templateId, dataSource, options ) {

			return templateId.startsWith( "#" ) ?

				$( templateId ).render( dataSource, options ) :

				$.render[templateId]( dataSource, options );
		}
	} );

	$.templates( "testTemplate", "{{:#data}}" );

	via.extend( {
		dataSource: ["a", "b", "c"]
	} );

	var $view = $( "<div />" );

	$view.subscribe( "dataSource", "init afterUpdate", "*renderInside", "testTemplate" );

	equal( $view.html(), "abc",
		"template converter convert data into markup" );

	via.template.engines( "jsrender" ).isTemplateLoaded = function() {
		return false;
	};

	var defer = $.Deferred();

	via.template.load = function() {
		return defer.promise();
	};

	via.set( "dataSource", ["x", "y", "z"] );

	equal( $view.html(), "abc",
		"if isTemplateLoaded returns false, via.loadTemplate will be used to load the template first" +
		" and a promise object is return from getTemplatedContent, so handling process is pending" );

	defer.resolve();

	equal( $view.html(), "xyz",
		"when template is loaded, template converter will continue to generate content ," +
		"and the handling process continue" );

	//via.del( "dataSource" ).del( "copyOfDataSource" );
	via.debug.removeAll();
	assertEmptyDb();
} );
