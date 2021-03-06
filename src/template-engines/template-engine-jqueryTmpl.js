//
//#merge
(function( $, via ) {
	//#end_merge

	via.template.engineProxies( "tmpl", {

		//must implement
		render: function( templateId, dataSource, context ) {
			if (!$.template[templateId]) {
				this.compile( templateId, $( document.getElementById( templateId ) ).html() );
			}
			return $.tmpl( templateId, dataSource, context );
		},

		//optionally, if you don't want to use deferred template loading
		compile: function( templateId, source ) {
			$.template( templateId, source );
		},

		//must implement, if you don't want to use to use deferred template loading
		isTemplateLoaded: function( templateId ) {
			return !!$.template[templateId] || !!document.getElementById( templateId );
		}
	} );

	//#merge
})( jQuery, via );
//#end_merge


