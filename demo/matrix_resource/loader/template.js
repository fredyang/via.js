(function( $, matrix ) {

	//var rTemplateId = /^([^.]+)(\.(([^.]+)(\.(.+))))?$/;
	var rTemplateId = /^([^.]+)(\.(.+))?$/;

	matrix.loader.set( "template", {

		load: {
			compile: function( moduleId, sourceCode ) {

				$( sourceCode ).filter( "script" ).each( function() {

					var $sourceCodeContainer = $( this );

					via.template.compile(
						this.id,
						$sourceCodeContainer.html(),
						$sourceCodeContainer.attr( "type" ) || via.template.defaultEngine );
				} );
			},
			buildDependencies: "parseDependsTag"
		},

		//templateId ends with ".template", after removing it,
		// it is real template id
		//here is mapping from real template id to url
		//if id does not starts with "*", it is called private template
		//private template id is like folderName.fileName.remainingPart
		//
		//a -->     template/a/main.html
		//a.b -->   template/a/b.html
		//a.b.c --> template/a/b.html
		//
		//if id starts with "*", it is called share template
		//they are always in sub folder "_"
		//shared template id is like fileName.remainingPart
		//
		//*a --> template/_/a.html
		//*a.b --> template/_/a.html
		//*a.b.c --> template/_/a.html
		url: function( templateId ) {
			var idSegments, folderName, fileName;

			//first truncate the ".template" in the moduleId, and get the templateId
			var realTemplateId = matrix.fileName( templateId );

			if (realTemplateId.startsWith( "_" )) {
				realTemplateId = realTemplateId.substr( 1 );
				//
				idSegments = realTemplateId.split( "." );
				folderName = "_";
				fileName = idSegments[0];

			} else {

				idSegments = realTemplateId.split( "." );
				folderName = idSegments[0];
				fileName = idSegments[1] || "main";

			}

			return "template/" + folderName + "/" + fileName + ".html";
		}
	} );

})( jQuery, matrix );
