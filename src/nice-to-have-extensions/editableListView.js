//
//<@depends>event.js, model.js, declarative.js, template.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var customSubsProps = via.customSubsProps;
	var rootModel = new via();
	var util = via.util;
	var isUndefined = util.isUndefined;
	var clone = util.clone;
	var isFunction = $.isFunction;
	var buildTemplateHandler = via.template.buildTemplateHandler;
	var viaClasses = via.classes;
	var extend = $.extend;
	var clearObj = util.clearObj;
	var toLogicalPath = util.toLogicalPath;
	var viaFn = via.fn;
	var viewHandlerGateway = via.debug.viewHandlerGateway;
	var isString = via.util.isString;

	function indexReplacer ( match, $1, $2, $3, $4 ) {
		if ($1) {
			return $1 + ($2 - 1);
		} else {
			return $3 + ($4 - 1);
		}
	}

	//#end_merge

	var editMode = {
		none: 0,
		create: 1,
		update: 2
	};

	util.editMode = editMode;

	//editableListView should be used for an array model
	//this create shadow objects to support editable listview
	//if array path is items, we try to create an items*edit to support the editable feature
	customSubsProps.editableListView = function( elem, parseContext, subscriptions, options ) {
		//it is a convention that, if the path of list data is items
		//we take items_newItem as template from new item for the list data
		var newItem,
			modelPath = parseContext.ns,
			itemsModel = via( modelPath );

		if (itemsModel.get( "*edit" )) {
			return;
		}

		if (itemsModel.isShadow() && !isFunction( itemsModel.helper() )) {
			//if the array object items is already in shadow, eg
			//the modelPath is "doc.entries*edit.item.personal.signatures"
			//the itemTemplate is "doc.entries*edit.item.personal.signatures.0"
			//the following is try to get the itemTemplate
			//
			//the mainModel is doc.entries
			var mainModel = itemsModel.mainModel();

			//the editingModelPath of mainModel is doc.entries*edit.item
			var editingModelPath = mainModel.logicalPath() + "*edit.item";

			//the position of last "." in "doc.entries*edit.item."
			var startIndex = editingModelPath.length + 1;

			//the portion of "personal.signatures" in "doc.entries*edit.item.personal.signatures"
			var subPath = toLogicalPath( modelPath ).substr( startIndex );

			//get "doc.entries*edit.itemTemplate.personal.signatures.0"
			newItem = clone( mainModel.get( "*edit.itemTemplate." + subPath + ".0" ), true );

		} else {

			newItem = rootModel.get( modelPath + "_newItem" );
			if (isUndefined( newItem )) {
				newItem = clearObj( clone( itemsModel.get()[0], true ) );
			}
		}

		if (!itemsModel.get()) {
			itemsModel.set( [] );
		}

		itemsModel.create( "*edit", {
			mode: 0, //not in edit mode
			item: null, //editing item
			selectedIndex: -1, //the index for the item being edit in array
			itemTemplate: newItem
		} );

		itemsModel.cd( "*edit.selectedIndex" )
			.mapEvent( "afterUpdate", "enterUpdateMode", function( value, e ) {
				return e.publisher.get( "..mode" ) == editMode.update;
			} )
			.mapEvent( "afterUpdate", "cancelUpdateMode", function( value, e ) {
				return e.publisher.get( "..mode" ) == editMode.none;
			} );

		//when switch from read mode to new mode or from new mode to read mode
		//the selectedIndex does not change, that is why we need to
		//use *edit.model to trap the change
		itemsModel.cd( "*edit.mode" )
			.mapEvent( "afterUpdate", "enterNewMode", function( value, e ) {
				return value == editMode.create && (e.publisher.get( "..selectedIndex" ) == -1);
			} )
			.mapEvent( "afterUpdate", "cancelNewMode", function( value, e ) {
				return value == editMode.none && (e.publisher.get( "..selectedIndex" ) == -1);
			} );
	};

	//this change the view of row based on the edit mode
	customSubsProps.switchUpdateMode = function( elem, parseContext, subscriptions, options ) {

		subscriptions.push( {
			publisher: parseContext.ns + "*edit",
			eventTypes: "enterUpdateMode*",
			subscriber: elem,
			handler: "*renderEditItem",
			options: options
		} );

		//render normal item when in display mode
		subscriptions.push( {
			publisher: parseContext.ns + "*edit",
			eventTypes: "cancelUpdateMode*",
			subscriber: elem,
			handler: function( e ) {
				//e.removed is the old selectedIndex
				//trigger change so that it will be re-rendered
				e.publisher.mainModel().triggerChange( e.removed );
			}
		} );
	};

	//the follow method are to manipulate the shadow edit object of array model
	extend( viaFn, {
		newRowItem: function() {
			var editShadowModel = this.cd( "*edit" );
			//copy itemTemplate into the item
			editShadowModel.update( "item", clone( editShadowModel.get( "itemTemplate" ), true ) )
				.update( "mode", editMode.create );
		},
		editRowItem: function( rowItem, rowIndex ) {
			//prevent two item being edited at the same time
			if (this.get( "*edit.mode" ) !== editMode.none) {
				this.resetEditItem();
			}

			if (isUndefined( rowIndex )) {
				rowIndex = this.indexOf( rowItem );
			} else {
				rowItem = this.get()[rowIndex];
			}

			this.cd( "*edit" )
				.update( "item", clone( rowItem, true ) )
				.update( "mode", editMode.update )
				.update( "selectedIndex", rowIndex );

		},
		resetEditItem: function() {
			var proxy = this.cd( "*edit" );
			if (!isUndefined( proxy.get() )) {
				proxy.update( "item", null )
					.update( "mode", editMode.none )
					.update( "selectedIndex", -1 );
			}
		},
		saveEditItem: function() {
			var currentEditMode = this.get( "*edit.mode" ),
				pendingItem = this.get( "*edit.item" ),
				items = this.helper();
			//realItemsModel = isFunction( items ) ? itemsModel.mainModel() : itemsModel;

			if (currentEditMode == editMode.create) {
				//this is case when items is model*queryResult
				if (isFunction( items )) {
					this.mainModel().push( pendingItem );

				} else {
					this.push( pendingItem );
				}

				this.resetEditItem();

			} else if (currentEditMode == editMode.update) {

				var selectedIndex = this.get( "*edit.selectedIndex" );

				if (isFunction( items )) {
					//this is case when items is model*queryResult
					items = this.get();
					this.mainModel().updateItem(
						items[selectedIndex], //existing item
						pendingItem
					);
				} else {
					this.updateItem(
						items[selectedIndex], //existing item
						pendingItem
					);
				}
				//can not call resetEdit because updating selectedIndex trigger unwanted event
				var proxy = this.cd( "*edit" );
				var value = proxy.get();
				value.item = null;
				proxy.update( "mode", editMode.none );
				value.selectedIndex = -1;

			}

		},

		removeRowItemByIndex: function( index ) {
			this.resetEditItem();
			var items = this.helper();
			if (isFunction( items )) {
				//this is case when items is model*queryResult
				items = this.get();
				this.mainModel().removeItem( items[index] );
			} else {
				this.removeAt( index );
			}
		}
	} );

	via.handlers( {

		//------view handler------
		//handle user's action to create a new item for an array model(subscriber)
		//subscriber is items
		newRow: function( e ) {
			e.subscriber.newRowItem();
		},

		//handle user's action to edit an item in listview
		//subscriber is the array model "items"
		editRow: function( e ) {
			e.subscriber.editRowItem( null, e.selectedRowIndex() );
			e.stopPropagation();
		},

		//handle user's action to update the editing item
		//subscriber is the "items" or items*queryResult
		saveEditRow: function( e ) {
			e.subscriber.saveEditItem();
			e.stopPropagation();
		},

		//this is used when the item is not in a row
		//so that subscriber is not items or items.queryResult
		//but it is "items.edit.item"
		saveEditItem: function( e ) {
			e.subscriber.mainModel().saveEditItem();
			e.stopPropagation();
		},

		//handle user's action remove an item in listview
		//subscriber is items or items*queryResult
		removeRow: function( e ) {
			var selectedRowIndex = e.selectedRowIndex();
			e.subscriber.removeRowItemByIndex( selectedRowIndex );
			e.stopPropagation();
		},

		//subscriber is items
		cancelEditRow: function( e ) {
			e.subscriber.resetEditItem();
			e.stopPropagation();
		},

		//subscriber is "items*edit.item"
		cancelEditItem: function( e ) {
			e.subscriber.mainModel().resetEditItem();
			e.stopPropagation();
		},

		alignAfterRemove: function( e ) {
			var rowsContainer = e.subscriber,
				parentPath = e.publisher.path,
				deletedRowIndex = e.originalPublisher.indexPath(),
				subscriptions,
				handler,
				i,
				subscription,
				temp,
				oldItemPathToReplace;

			temp = "(" + parentPath.replace( ".", "\\." ) + "\\.)(\\d+)|" +
			       "(" + parentPath.replace( ".", "#+" ) + "#+)(\\d+)";

			oldItemPathToReplace = new RegExp( temp, "g" );

			$( rowsContainer ).children( ":gt(" + deletedRowIndex + ")" ).find( "*" ).andSelf().each(
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

					var newNs = dataSubOfRowView.ns.replace( oldItemPathToReplace, indexReplacer );
					if (newNs == dataSubOfRowView.ns) {
						return;
					}

					dataSubOfRowView.ns = newNs;

					subscriptions = $( this ).subscriptions();

					for (i = 0; i < subscriptions.length; i++) {

						subscription = subscriptions[i];

						if (isString( subscription.publisher )) {

							subscription.publisher = subscription.publisher.replace( oldItemPathToReplace, indexReplacer );

						} else if (isString( subscription.subscriber )) {

							var oldSubscriber = subscription.subscriber;

							var newSubscriber = oldSubscriber.replace( oldItemPathToReplace, indexReplacer );

							if (oldSubscriber != newSubscriber) {

								subscription.subscriber = newSubscriber;
								//if subscriber is changed, we need to update the view handler as well
								//so that view handler will not update deleted subscriber
								handler = subscription.handler;
								oldEventTypes = subscription.eventTypes;
								newEventTypes = subscription.eventTypes = oldEventTypes.replace( oldItemPathToReplace, indexReplacer );
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
		},

		//------model handler------
		//publisher is items*edit
		//handle the change of items*edit.mode
		//if it is in create mode render content in container,
		// otherwise empty container
		//!init afterUpdate:.|*renderNewItem
		renderNewItem: buildTemplateHandler(
			//getFilter
			function( e ) {
				return e.publisher.get( ".mode" ) === editMode.create ?
					e.publisher.get( ".item" ) : null;
			},
			//setFilter
			function( value, e ) {
				e.subscriber.html( value ).show();
			} ),

		//publiser is items
		//handle event enterUpdateMode
		renderEditItem: buildTemplateHandler(
			//getFilter
			function( e ) {
				return e.publisher.mainModel().get( "*edit.item" );
			},
			//setFilter
			function( value, e ) {
				e.subscriber.children().eq( e.originalPublisher.get() ).replaceWith( value );
			} )

	} );

	extend( viaClasses, {


		//handle the delete button evnet in the list view
		deletableRow: "$delete:.|*removeRow",

		//on top of deletableRow
		// create the infrastructure to enable inline edit
		editableDeletableRow: "`deletableRow" +
		                      "@editableListView" +
		                      "$edit:.|*editRow",

		//on top of editableDeletableRow, handle update/cancel event which is required
		//in in-row edit view
		//
		//this class aggregate serveral model subscription to view events
		// like delete,edit,save,cancel events which are triggered by the element
		// inside a rows, these event are custom events, you should convert
		// actual events to them, here is an example
		//<input type="button" value="edit" data-sub="`editButton"/>
		//@editableListView create shadow objects
		//@switchUpdateMode let view subscribe model change to referesh the row view
		//
		//context path should be an array, such as items or items.queryableResult
		//data-sub="`listView:.,contacts.contactRow
		//          `editableListView:.,contacts.editContactRow"
		//
		//context path is items*queryableResult
		//data-sub="`queryableListView:.,contacts.contactRow
		//          `editableListView:*queryResult,contacts.editContactRow"
		editableListView: "`editableDeletableRow" +
		                  "$update:.|*saveEditRow" +
		                  "$cancel:.|*cancelEditRow" +
		                  "@switchUpdateMode:.",

		//data-sub="`newItemButton"
		//publisher is the items model
		//click will create a new item in shadow model of the array
		newItemButton: "$click:.|*newRow" +
		               "`hide:*edit.mode",

		//publisher is items*edit.item model
		//it render the view which is used to edit new item
		//data-sub="@ns:*edit.item `newItemView:.,#contactRowInNewMode"
		newItemView: "!enterNewMode*:..|*renderNewItem" +
		             "!cancelNewMode:..mode|hide"

	} );

	via.themes.alignable = {
		classes: {
			listView: viaClasses.listView + "!afterDel.1:.|*alignAfterRemove"
		}
	};

	//#merge
})( jQuery, via );
//#end_merge