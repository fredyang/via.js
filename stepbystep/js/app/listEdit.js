(function () {

	var appName = "listEdit";

	//this simulate an app that allow multiple instance of the app.
	//but the case here is actually singleton
	//var _singleton
	var views = [];
	via.addApp( appName,
		{
			load: function ( view ) {
				//_singleton = view
				view = $( view )[0];
				if ( views.contains( view ) ) {
					return;
				}
				views.push( view );
				//dynamically construct a model to be used by template later
				matrix( "listDemoModel.js" ).done( function () {
					//load the skeleton into the view
					$( this ).renderTemplate( "listEdit.layout", null, function ( $content ) {
						$( view ).append( $content ).view();
					} );
				} );
			},
			unload: function ( view ) {
				view = $( view )[0];
				if ( !views.contains( view ) ) {
					return;
				}
				//$(_singleton).empty()
				$( view ).empty();
				$( view ).removeData( "via" );
				views.remove( view );
				if ( views.length ) {
					via.removeApp( appName );
				}
			}
		}
	);
})();