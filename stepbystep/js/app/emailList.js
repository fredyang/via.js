(function () {

	var appName = "emailList";

	var _singleton;

	

	via.addApp( appName,
		{
			load: function ( view ) {
				_singleton = view;

				var dataSource = via().get("demoApp.emails");
				via.renderTemplate( "demoApp.emailList", dataSource, {
					callback: function ( $content ) {
						$( view ).append( $content );
						$content.view();
					}
				} );

			},

			unload: function () {
				if ( !_singleton ) {
					return;
				}

				$( _singleton ).empty()
				$( _singleton ).removeData( "via" );
				via.removeApp( appName );
			}
		}
	);
})();