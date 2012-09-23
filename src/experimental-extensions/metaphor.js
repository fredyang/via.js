//
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var mergePath = via.util.mergePath;
	var subscribe = via.subscribe;
	var isString = via.util.isString;
	var isArray = $.isArray;
	var slice = [].slice;
	var rootModel = via();
	//#end_merge

	function tryConvertToContextBoundObject ( target, contextModel, contextView ) {
		if (isString( target )) {
			if (target.startsWith( "$" )) {
				//it is jQuery object
				target = target.substr( 1 );

				if (target) {

					target = $( contextView ).findAll( target );

				} else {

					target = $( contextView );
				}

			} else if (target == ".") {

				target = contextModel;

			} else if (target !== "_") {

				target = mergePath( contextModel, target );
			}
		}

		return target;
	}

	var stage = via.stage = function( registrations ) {

		if (!isArray( registrations )) {
			return stage( slice.call( arguments ) );
		}

		var i, registration, actor, j, subscription, subs, publisher,
			subscriber, contextView, contextModel;

		for (i = 0; i < registrations.length; i++) {
			registration = registrations[i];
			actor = registration.actor;
			subs = registration.subs;

			if (actor.ns && actor.value) {

				if (actor.value) {
					rootModel.set( actor.ns, actor.value );
				}
				contextModel = actor.ns; //model path
				contextView = registration.context;

			} else {

				contextView = registration.actor;
				contextModel = registration.context; //model path
			}

			if (contextModel instanceof via) {
				contextModel = contextModel.path;
			}

			if (isString( contextView ) && contextView.startsWith( "$" )) {
				contextView = contextView.substr( 1 );
			}

			contextView = contextView || document;

			if (subs) {
				if (!isArray( subs[0] )) {
					subs = [subs];
				}

				for (j = 0; j < subs.length; j++) {
					subscription = subs[j];

					subscriber = tryConvertToContextBoundObject( subscription[0], contextModel, contextView );
					publisher = tryConvertToContextBoundObject( subscription[1], contextModel, contextView );

					subscribe(
						subscriber,
						publisher,
						subscription[2], //eventTypes
						subscription[3], //handler
						subscription[4], //options,
						subscription[5] //delegate
					);
				}
			}
		}
		return via;
	};

	via.defineApp = function( application ) {
		var actors = [],
			model,
			view,
			i,
			models = application.models,
			views = application.views;

		if (models) {
			for (i = 0; i < models.length; i++) {
				model = models[i];
				actors.push( {
					actor: {
						ns: model.ns,
						value: model.value
					},
					context: model.context,
					subs: model.subs
				} );
			}
		}

		if (views) {
			for (i = 0; i < views.length; i++) {
				view = views[i];
				actors.push( {
					actor: view.view,
					context: view.context,
					subs: view.subs
				} );
			}
		}
		stage( actors );
		return via;
	};

	//#merge
})( jQuery, via );
//#end_merge
