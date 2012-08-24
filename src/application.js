//
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var mergeLogicalPath = via.mergeLogicalPath;
	var subscribe = via.subscribe;
	var isString = via.util.isString;
	var isArray = $.isArray;
	var slice = [].slice;
	var rootModel = via();
	//#end_merge

	var stage;

	via.stage = stage = function( actors ) {

		if (!isArray( actors )) {
			return stage( slice.call( arguments ) );
		}

		var i, actor, j, subscription, subs, publisher,
			subscriber, contextView, contextModel;

		for (i = 0; i < actors.length; i++) {
			actor = actors[i];
			subs = actor.subs;

			if (isModel( actor.actor )) {

				if (actor.model) {
					rootModel.set( actor.actor, actor.model );
				}
				contextModel = actor.actor; //model path

				contextView = actor.context;
			} else {
				contextView = actor.actor;
				contextModel = actor.context; //model path
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

	function isModel ( actor ) {
		return (actor instanceof via) || (isString( actor ) && !actor.startsWith( "$" ));
	}

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

				target = mergeLogicalPath( contextModel, target );
			}
		}

		return target;
	}

	via.application = function( application ) {
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
					actor: model.path,
					model: model.value,
					context: model.contextView,
					subs: model.subs
				} );
			}
		}

		if (views) {
			for (i = 0; i < views.length; i++) {
				view = views[i];
				actors.push( {
					actor: view.view,
					context: view.contextModel,
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
