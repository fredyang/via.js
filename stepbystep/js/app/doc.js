(function () {

	var appName = "doc";

	var _singleton;

	function loadData() {
		return $.getJSON("js/doc-json.js");
	}

	via.addApp( appName,
		{
			load: function ( view ) {
				_singleton = view;
				loadData().done(function (data) {
					via().create(data);
					$( view ).renderTemplate( "html", "doc.pageLayout" );
				});
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