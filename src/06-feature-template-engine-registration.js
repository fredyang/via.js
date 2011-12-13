
//
//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var defaultOptions = via.options();
	var templateEngines = via.templateEngines;
	//#end_merge


	if ( $.tmpl ) {

		defaultOptions.engine = "tmpl";

		templateEngines.tmpl = {

			renderTemplate: function ( templateId, dataSource, options ) {
				return templateId.beginsWith( "#" ) ?
					$( templateId ).tmpl( dataSource, options ) :
					$.tmpl( templateId, dataSource, options );
			},

			compileTemplate: function ( templateId, source ) {
				$.template( templateId, source );
			},

			isTemplateCompiled: function ( templateId ) {
				return templateId.beginsWith( "#" ) ? !! $( templateId ).length :
					!!$.template[templateId];
			}
		};

		//use "else if" instead of "if", because both jsrender and tmpl use $.template
		//otherwise they can run side by side
	} else if ( $.render ) {

		defaultOptions.engine = "jsrender";

		templateEngines.jsrender = {

			renderTemplate: function ( templateId, dataSource, options ) {

				return templateId.beginsWith( "#" ) ?

					$( templateId ).render( dataSource, options ) :

					$.render( dataSource, templateId, options );
			},

			compileTemplate: function ( templateId, source ) {
				$.template( templateId, source );
			},

			isTemplateCompiled: function ( templateId ) {
				return templateId.beginsWith( "#" ) ? !! $( templateId ).length :
					!!$.views.templates[templateId];
			}
		};
	}

	//#merge
})( jQuery, via );
//#end_merge


