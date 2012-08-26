//
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	//#end_merge

	var mu = Mustache;
	var mustacheTemplates = {};

	via.template.engines( "mustache", {

		render: function( templateId, data, context ) {
			return mu.render(
				mustacheTemplates[templateId],
				extend( data, context )/*view*/,
				mustacheTemplates
			);
		},

		compile: function( templateId, source ) {
			return mustacheTemplates[templateId] = source;
		},

		isTemplateLoaded: function( templateId ) {
			return !!mustacheTemplates[templateId];
		}

	} );

	$( function() {
		$( "script[type=mustache]" ).each( function() {
			mustacheTemplates[this.id] = $( this ).html();
		} );
	} );
	//#merge
})( jQuery, via );
//#end_merge


