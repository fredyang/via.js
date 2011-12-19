
//add app handler
(function( $, matrix ) {

	//extend js handler
	matrix.addHandler( "app", "js", {

		url: function ( resourceKey ) {
			return matrix.resourceBaseUrl + "app/" + matrix.resourceName( resourceKey ) + ".js";
		}

	} );

})( jQuery, matrix );