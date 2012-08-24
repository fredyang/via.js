//the loader to load view views
(function( $, matrix ) {
	matrix.loader.set( "appLoader", "js", {
		load: {
			compile: "localEval"
		},
		url: "folder"
	} );
})( jQuery, matrix );