(function() {

	var view;
	var singleton;

	function loadData () {

		via().set( "gmail", {
			"folders": ["inbox", "deleted"],
			"emails": [
				{"folder": "inbox", "message": "inbox message one"},
				{"folder": "inbox", "message": "inbox message two"},
				{"folder": "deleted", "message": "deleted message one"},
				{"folder": "deleted", "message": "deleted message two"}
			],

			currentFolder: "inbox",

			selectedEmails: function() {
				var currentFolder = this.get( "currentFolder" );
				var emails = this.get( "emails" );
				return $( emails ).filter(
					function( index, elem ) {
						return elem.folder === currentFolder;
					} ).get();
			},
			unloadGmail: function( e ) {
				view.unload( singleton );
			}
		} );
	}

	return view = {

		load: function( elem, options ) {
			singleton = elem;
			loadData();
			$( elem ).renderInside( "gmail", "gmail" );
		},

		unload: function( elem ) {
			$( elem ).empty();
		}
	};
})();