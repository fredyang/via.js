//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var proxyPrototype = via.fn;
	var commonViewHandlers = via.commonViewHandlers;
	var commonModelHandlers = via.commonModelHandlers;
	var rootProxy = new via();
	var specialParsers = via.specialParsers;
	var viaBindingSet = via.themes.via.bindingSet;
	//#end_merge

	via.editMode = {
		none: 0,
		create: 1,
		update: 2
	};

	via.ViewEvent.prototype.selectedIndex = function () {
		return $( this.e.currentTarget ).children().filter( $( this.e.target ).parents() ).index();
	};

	extend( proxyPrototype, {

		//create supporting facilities in shadow object
		enableListEdit: function ( newItem ) {
			return this.shadowProxy().create( {
				edit: {
					mode: 0,
					item: null,
					selectedIndex: -1,
					newItem: newItem
				}
			} ).popProxy();
		}
	} );

	extend( commonViewHandlers, {

		//create an new item in proxy
		newDataItem : function ( viewEvent ) {
			var newItem;

			if ( viewEvent.options ) {
				//expect viewEvent.options is the prototype for new item
				newItem = extend( {}, viewEvent.options );

			} else {

				newItem = rootProxy.get( viewEvent.path + "*edit.newItem" );

				if ( newItem ) {

					newItem = extend( {}, newItem );

				} else {

					newItem = viewEvent.targetProxy().get( 0 );

					if ( newItem ) {

						newItem = via.clearObj( extend( {}, newItem ) );
					}
				}
			}
			if ( !newItem ) {
				throw "can not find create a new item";
			}

			//put the new item into shadow for editing
			viewEvent.targetProxy().update( "*edit.item", newItem );
		},

		//save create item
		insertDataItem: function ( viewEvent ) {
			var targetProxy = viewEvent.targetProxy();
			targetProxy.push( targetProxy.get( "*edit.item" ) )
				.update( "*edit.item", null )
				.update( "*edit.mode", via.editMode.none );
		},

		//cancel insert tasks, revert back to initial state
		cancelNewDataItem: function ( viewEvent ) {
			viewEvent.targetProxy()
				.update( "*edit.item", null )
				.update( "*edit.mode", via.editMode.none );
		},

		//remove item in list
		removeItem: function ( viewEvent ) {

			var targetProxy = viewEvent.targetProxy();
			var editProxy = targetProxy.childProxy( "*edit" );
			editProxy.update( "selectedIndex", -1 ).update( "mode", via.editMode.none );
			var items = targetProxy.get( "*queryResult" ) || targetProxy.get();
			targetProxy.removeItem( items[viewEvent.selectedIndex()] );
		},

		//update the editing item
		updateItem: function ( viewEvent ) {

			var selectedIndex = viewEvent.selectedIndex();
			var targetProxy = viewEvent.targetProxy();
			var editProxy = targetProxy.childProxy( "*edit" );
			var items = targetProxy.get( "*queryResult" ) || targetProxy.get();

			targetProxy.swap( items[selectedIndex], editProxy.get( "item" ) );
			editProxy.update( "item", null )
				.update( "mode", via.editMode.none )
				.update( "selectedIndex", -1 );

		},

		//cancel editing item
		cancelEditItem: function ( viewEvent ) {

			var selectedIndex = viewEvent.selectedIndex();
			viewEvent.targetProxy().childProxy( "*edit" )
				.update( "item", null )
				.update( "mode", via.editMode.none )
				.update( "selectedIndex", -1 );

		},

		//edit item in a list
		editItem: function ( viewEvent ) {

			var selectedIndex = viewEvent.selectedIndex();
			var targetProxy = viewEvent.targetProxy();
			var editProxy = targetProxy.childProxy( "*edit" );
			var queryItems = targetProxy.get( "*queryResult" ) || targetProxy.get();

			editProxy
				.update( "item", $.extend( {}, queryItems[selectedIndex] ) )
				.update( "selectedIndex", selectedIndex )
				.update( "mode", via.editMode.update );
		}

	} );

	extend( commonModelHandlers, {

		renderNewItem: function ( modelEvent ) {
			if ( modelEvent.targetValue() === 1 ) {
				var dataSource = modelEvent.targetProxy().mainProxy().get( "*edit.item" );

				via.renderTemplate( modelEvent.options, dataSource,
					{
						callback: function ( $content ) {
							$( this ).html( $content );
							$content.view();
						},
						view:this
					} );

			} else {
				$( this ).empty();
			}
		},

		renderEditItem: function ( modelEvent ) {

			//"this" refers the rows container
			var selectedIndex = modelEvent.currentValue(),
				mainProxy = modelEvent.targetProxy().mainProxy();

			//change back to display
			if ( selectedIndex !== -1 ) {
				via.renderTemplate( modelEvent.options, mainProxy.get( "*edit.item" ),
					{
						callback: function ( $content ) {
							$( this ).children().eq( selectedIndex ).replaceWith( $content );
							$content.view();
						},
						view: this
					}
				);
			}
		},

		renderReadItem: function ( modelEvent ) {

			//"this" refers the rows container
			var selectedIndex = modelEvent.currentValue();

			if ( selectedIndex === -1 ) {
				var mainProxy = modelEvent.targetProxy().mainProxy();
				via.renderTemplate( modelEvent.options, (mainProxy.get( "*queryResult" ) || mainProxy.get())[modelEvent.removed],
					{
						callback:function ( $content ) {
							$( this ).children().eq( modelEvent.removed ).replaceWith( $content );
							$content.view();
						},
						view: this
					}
				);
			}
		}
	} );

	via.addViaEvent( "action", "click" );

	specialParsers.editableList = function ( view, binding, handlers, specialOptions ) {
		var options = specialOptions.split( "," );
		var templateRead = $.trim(options[0]);
		var templateEdit = $.trim(options[1]);
		var engineName = options[2];
		var path = binding.path;

		handlers.mh.push( {
				path: path + "*edit.selectedIndex",
				modelEvents: "afterUpdate",
				view: view,
				modelHandler: "*renderReadItem",
				options: engineName ? templateRead + "," + engineName : templateRead
			},
			{
				path: path + "*edit.selectedIndex",
				modelEvents: "afterUpdate",
				view: view,
				modelHandler: "*renderEditItem",
				options: engineName ? templateEdit + "," + engineName : templateEdit
			} );

		handlers.vh.push( {
				path: path,
				viewEvents: "action.edit",
				view: view,
				viewHandler: "*editItem"
			},
			{
				path: path,
				viewEvents: "action.remove",
				view: view,
				viewHandler: "*removeItem"
			},
			{
				path: path,
				viewEvents: "action.update",
				view: view,
				viewHandler: "*updateItem"
			},
			{
				path: path,
				viewEvents: "action.cancelEdit",
				view: view,
				viewHandler: "*cancelEditItem"
			} );
	};

	extend( viaBindingSet, {

		newItemButton : "@vh:.,click,*newDataItem;" +
		                "*edit.mode,click,*numberOptions,1;" +
		                "*edit.selectedIndex,*numberOptions,-1" +
		                "@mh:*edit.mode,init|afterUpdate,*showIfFalsy",

		newItemForm: "@mh:.mode,init|afterUpdate,*renderNewItem",

		renderEditItem: "@mh:*edit.selectedIndex,afterUpdate,*renderEditItem"

	} );

	//#merge
})( jQuery, via );
//#end_merge
