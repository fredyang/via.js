//
//<@depends>eventSubscription.js, modelProxy.js, declarative.js, template.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var viaClasses = via.classes;
	var viewHandlerGateway = via.util._viewHandlerGateway;
	var isString = via.util.isString;
	var modelLinks = via.util._modelLinks;
	var shadowRoot = via.get( "*" );
	var hasOwn = {}.hasOwnProperty;
	//#end_merge

	function buildOldItemPathToReplace ( arrayPath ) {
		var temp = "(" + arrayPath.replace( ".", "\\." ) + "\\.)(\\d+)|" +
		           "(" + arrayPath.replace( ".", "#+" ) + "#+)(\\d+)";
		return new RegExp( temp, "g" );
	}

	function deletedIndexReplacer ( $0, $1, $2, $3, $4 ) {
		var deletedIndex = deletedIndexReplacer.deletedIndex;
		if ($1) {
			if ($2 < deletedIndex) {
				return $0;
			} else {
				return $1 + ($2 - 1);
			}
		} else {
			if ($4 < deletedIndex) {
				return $0;
			} else {
				return $3 + ($4 - 1);
			}
		}
	}

	function simpleIndexReplacer ( $0, $1, $2, $3, $4 ) {
		if ($1) {
			return $1 + ($2 - 1);
		} else {
			return $3 + ($4 - 1);
		}
	}

	via.handlers( "alignAfterRemove", function( e ) {
		var key,
			paths,
			newKey,
			i,
			oldPath,
			newPath,
			subscriptions,
			handler,
			subscription,
			deletedIndex = e.originalPublisher.indexPath(),
			rOldItemPathToReplace = buildOldItemPathToReplace( e.publisher.path );

		deletedIndexReplacer.deletedIndex = deletedIndex;

		for (key in modelLinks) {
			if (hasOwn.call( modelLinks, key )) {

				paths = modelLinks[key];
				newKey = key.replace( rOldItemPathToReplace, deletedIndexReplacer );

				if (newKey !== key) {
					modelLinks[newKey] = paths;
					delete modelLinks[key];
				}

				for (i = 0; i < paths.length; i++) {
					oldPath = paths[i];
					newPath = oldPath.replace( rOldItemPathToReplace, deletedIndexReplacer );
					if (newPath != oldPath) {
						paths[i] = newPath;
					}
				}
			}
		}

		for (key in shadowRoot) {
			if (hasOwn.call( shadowRoot, key )) {
				newKey = key.replace( rOldItemPathToReplace, deletedIndexReplacer );
				if (newKey != key) {
					shadowRoot[newKey] = shadowRoot[key];
					delete shadowRoot[key];
				}
			}
		}


		$( this ).children( ":gt(" + deletedIndex + ")" ).find( "*" ).andSelf().each(
			function() {

				var oldEventTypes,
					newEventTypes,
					newEventSeedData,
					$publisher,
					delegateSelector,
					dataSubOfRowView = $( this ).dataSub();

				if (!dataSubOfRowView) {
					return;
				}

				var newNs = dataSubOfRowView.ns.replace( rOldItemPathToReplace, simpleIndexReplacer );
				if (newNs == dataSubOfRowView.ns) {
					return;
				}

				dataSubOfRowView.ns = newNs;

				subscriptions = $( this ).subscriptions();

				for (i = 0; i < subscriptions.length; i++) {

					subscription = subscriptions[i];

					if (isString( subscription.publisher )) {

						subscription.publisher = subscription.publisher.replace( rOldItemPathToReplace, simpleIndexReplacer );

					} else if (isString( subscription.subscriber )) {

						var oldSubscriber = subscription.subscriber;

						var newSubscriber = oldSubscriber.replace( rOldItemPathToReplace, simpleIndexReplacer );

						if (oldSubscriber != newSubscriber) {

							subscription.subscriber = newSubscriber;
							//if subscriber is changed, we need to update the view handler as well
							//so that view handler will not update deleted subscriber
							handler = subscription.handler;
							oldEventTypes = subscription.eventTypes;
							newEventTypes = subscription.eventTypes = oldEventTypes.replace( rOldItemPathToReplace, simpleIndexReplacer );
							delegateSelector = handler.delegateSelector;

							newEventSeedData = {
								handler: handler,
								subscriber: newSubscriber
							};

							$publisher = $( subscription.publisher );

							if (delegateSelector) {
								$publisher.undelegate( delegateSelector, oldEventTypes, viewHandlerGateway );
								$publisher.delegate( delegateSelector, newEventTypes, newEventSeedData, viewHandlerGateway );
							} else {
								$publisher.unbind( oldEventTypes, viewHandlerGateway );
								$publisher.bind( newEventTypes, newEventSeedData, viewHandlerGateway );
							}
						}
					}
				}
			}
		);
	} );

	viaClasses.alignableListView = viaClasses.listView + "!afterDel.1:.|*alignAfterRemove";

	//#merge
})( jQuery, via );
//#end_merge
