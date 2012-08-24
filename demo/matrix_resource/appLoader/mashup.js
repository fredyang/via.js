(function() {

	return {
		load: function( elem ) {
			$( elem ).renderInside( "_mashup" );
		},

		unload: function( elem ) {
			$( elem ).empty();
		}
	};
})();