// defintion of custom subscription property @loadapp
//this module depends on matrix.js
//data-sub="@loadapp:appName,options"
//it use matrix.js to fetch a apploader, rewrite the apploader, then call apploader.load
//you apploader should implement load(elem, options) and unload(elem) method
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var customSubsProps = via.customSubsProps;
	var isUndefined = via.util.isUndefined;
	//#end_merge

	//view is a module to create view
	// it fetches data and template and combine them
	// together into html and stick it into the element
	var appLoaders = {},
		//used to match "appName,options"
		rAppOptions = /^([^,]+)(,(.+))?$/;

	function getOrSetApploaderOfElement ( elem, appLoaderName, appLoader ) {
		//one element can associate with more than one app loaders
		//appLoadersOfElement is like
		// {
		//  app1: appLoader1,
		//  app2: appLoader2
		//}
		var appLoadersOfElement = $( elem ).data( "appLoader" );
		if (!appLoadersOfElement) {
			appLoadersOfElement = {};
			$( elem ).data( "appLoader", appLoadersOfElement );
		}
		if (isUndefined( appLoader )) {
			return appLoadersOfElement[appLoaderName];
		} else {
			if (appLoader) {
				appLoadersOfElement[appLoaderName] = appLoader;
			} else {
				delete appLoadersOfElement[appLoaderName];
			}
		}
	}

	//ensure an element can only load a single instance of a view
	function rewriteAppLoader ( apploader ) {

		var load = apploader.load,
			unload = apploader.unload;

		apploader.load = function( elem, options ) {
			var apploaderOfElement = getOrSetApploaderOfElement( elem, this.name );
			if (!apploaderOfElement) {
				load.call( this, elem, options );
				getOrSetApploaderOfElement( elem, this.name, this );
			}
		};
		apploader.unload = function( elem ) {
			var appLoader = getOrSetApploaderOfElement( elem, this.name );
			if (appLoader) {
				unload.call( this, elem );
				getOrSetApploaderOfElement( elem, this.name, null );
			}
		};

	}

	customSubsProps.loadapp = function( elem, parseContext, subscriptions, options ) {

		var optionParts = rAppOptions.exec( $.trim( options ) ),
			appName = optionParts[1],
			loadappOptions = optionParts[3];

		//use matrix.js to load the appLoader of the view
		var apploader = appLoaders[appName] || matrix( appName + ".appLoader" );

		if (apploader.done) {
			//view is promise returned by matrix
			apploader.done( function( moduleId, resolvedAppLoader ) {
				resolvedAppLoader.name = appName;
				rewriteAppLoader( resolvedAppLoader );
				appLoaders[appName] = resolvedAppLoader;
				resolvedAppLoader.load( elem, loadappOptions );
			} );

		} else {
			apploader.load( elem, loadappOptions );
		}
	};

	//#merge
})( jQuery, via );
//#end_merge
