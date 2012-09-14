(function() {

	return {
		load: function( elem ) {
			$( elem ).html( "hello!" );
		},

		unload: function( elem ) {
			$( elem ).empty();
		}
	};
})();