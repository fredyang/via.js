(function () {

	var appName = "folderList";

	var _singleton;

	

	via.addApp( appName,
		{
			load: function ( view ) {
				_singleton = view;

				var dataSource = via().get("demoApp.folders");

				via.renderTemplate( "demoApp.folderList", dataSource, {
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