//
/*
 <@depends>
 eventSubscription.js,
 modelProxy.js,
 declarative.js,
 template.js,
 https://raw.github.com/cowboy/jquery-bbq/v1.2.1/jquery.ba-bbq.js
 </@depends>
 */
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var rootModel = via();
	var isObject = via.util.isObject;
	var toLogicalPath = via.util.toLogicalPath;
	var subscribe = via.subscribe;
	//#end_merge

	var statefulModelPaths = [],
		bbqGetState = $.bbq.getState,
		bbqPushState = $.bbq.pushState;

	function pushModelState ( path ) {
		path = isObject( path ) ? toLogicalPath( path.publisher.path ) : path;
		var model = {};
		model[path] = rootModel.get( path );
		bbqPushState( model );
	}

	//trackChange should be called after model initialization
	//and before parsing, so that the state in url can be restored
	via.trackChange = function( /* path1, path2, .. */ ) {

		var i,
			path,
			viaState = bbqGetState();

		for (i = 0; i < arguments.length; i++) {
			path = arguments[i];
			if (path in viaState) {
				//the states in url will override the state in model
				rootModel.set( path, viaState[path] );
			} else {
				pushModelState( path );
			}
			subscribe( null, path, "afterUpdate", pushModelState );
			statefulModelPaths.push( path );
		}
		return this;
	};

	$( window ).bind( "hashchange", function() {
		var viaState = bbqGetState();
		for (var path in viaState) {
			if (statefulModelPaths.contains( path )) {
				rootModel.set( path, viaState[path] );
			}
		}
	} );
	//#merge
})( jQuery, via );
//#end_merge
