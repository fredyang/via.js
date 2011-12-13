(function ( $, matrix ) {

	//<!-- Depends: common.tmpl -->
	var rDependsHeader = /^\s*<!--\s*Depends\s*:\s*([\w\W]+?)\s*-->/i;

	matrix.addHandler( "template", {
		load: matrix.buildLoad(
			//fnIsResourceStaticLinked
			function () {
				return false;
			},
			//fnBuildEvaluate
			function ( resourceKey, url, sourceCode ) {
				return function () {
					$( sourceCode).filter("script").each( function() {
						var $sourceCodeContainer = $(this);
						via.compileTemplate( matrix.resourceName( resourceKey ) + "." + this.id,
							$sourceCodeContainer.html(), $sourceCodeContainer.attr( "engine" ) );
					} );

					matrix.promises( resourceKey ).parentDefer.resolve();
				};
			} ),

		url: function ( resourceKey ) {
			return matrix.resourceBaseUrl + "template/" + matrix.resourceName( resourceKey ) + ".html";
		},

		parse: function ( resourceKey, sourceCode ) {
			var depends = rDependsHeader.exec( sourceCode );
			return (depends && depends[1] ) || null;

		}
	} );

})( jQuery, matrix );
