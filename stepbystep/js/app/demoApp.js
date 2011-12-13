(function () {

	var appName = "demoApp";

	var _singleton;

	function loadData() {

		via().create( "demoApp", {
			"folders":["inbox","deleted"],
			"emails":[
				{"folder":"inbox","message":"message one"},
				{"folder":"inbox","message":"message two"}
			],

			currentFolder: "inbox",

			selectedEmails: function () {
				var currentFolder = this.currentFolder;
				var emails = this.emails;
				return $(emails).filter(function (index, elem) {
					return elem.folder === currentFolder;
				}).get();
			}
		} );
	}

	via.addApp( appName,
		{
			load: function ( view ) {
				_singleton = view;
				loadData();
				via.renderTemplate( "demoApp.pageLayout", null, {
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