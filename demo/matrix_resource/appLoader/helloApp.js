(function() {

	//this file will be trigger by
	// matrix("helloApp.appLoader")
	return {

		//this method is called in loadapp.js
		//apploader.load( elem, loadappOptions );
		load: function( appContainer, options ) {
			via.set( "helloApp", {
				prompt: "Please input your name:",
				name: "",
				message: function() {
					var name = this.get( "name" );
					return name ? "hello, " + name : "";
				}
			} );

			$( appContainer ).renderInside(
				"hello" /*templateId*/,
				"helloApp"/*modelPath*/
			);
		},

		unload: function() { }
	};
})();