
//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var specialParsers = via.specialParsers;
	var rootProxy = via();
	var rDot = /\./g;
	//#end_merge

	function replaceDot( text ) {
		return text.replace( rDot, "_" );
	}

	//this special parser is to load the app definition, the app definition file
	// should insert a load method into the model with appName_app as key
	specialParsers.app = function ( view, binding, handlers, specialOptions ) {

		var appName = replaceDot( $.trim( specialOptions ) );

		via.downloadApp( appName ).done( function () {
			//we expect the app.load method is ready to be called when the app is download
			//your app should register itself by calling via.addApp,
			via.getApp( appName ).load( view );
		} );
	};

	var appStorePath = "*appStore";

	rootProxy.create( appStorePath, {} );

	via.downloadApp = function ( appName ) {
		if ( via.getApp( appName ) ) {
			return $.Deferred().resolve().promise();
		}
		return matrix( replaceDot( appName ) + ".app" );
	};

	via.addApp = function ( appName, app ) {
		appName = replaceDot( appName );
		if ( via.getApp( appName ) ) {
			return this;
		}
		return rootProxy.create( appStorePath + "." + replaceDot( appName ), app );
	};

	via.removeApp = function ( appName ) {
		if ( via.getApp( appName ) ) {
			appName = replaceDot( appName );
			matrix.release( appName + ".app" );
			return rootProxy.del( appStorePath + "." + appName );
		}
	};

	via.getApp = function ( appName ) {
		return rootProxy.get( appStorePath + "." + replaceDot( appName ) );
	};

	//#merge
})( jQuery, via );
//#end_merge
