(function () {

	var appName = "gmail";

	var _singleton;

	function loadData() {

		via().create( "gmail", {
			"folders":["inbox","deleted"],
			"emails":[
				{"folder":"inbox","message":"inbox message one"},
				{"folder":"inbox","message":"inbox message two"},
				{"folder":"deleted","message":"deleted message one"},
				{"folder":"deleted","message":"deleted message two"}
			],

			currentFolder: "inbox",

			selectedEmails: function () {
				var currentFolder = this.currentFolder;
				var emails = this.emails;
				return $( emails ).filter(
					function ( index, elem ) {
						return elem.folder === currentFolder;
					} ).get();
			}
		} );
	}

	via.addApp( appName,
		{
			load: function ( view ) {
				_singleton = view;
				loadData();
				$( view ).renderTemplate( "html", "gmail.pageLayout" );
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