(function() {

	$.ajaxSetup( { cache: false } );

	//namespace + name
	function getFullName ( entry ) {
		return entry.namespace ? entry.namespace + "." + entry.name : entry.name;
	}

	$.views.helpers( {
		htmlEncode: function( value ) {
			return $( '<div/>' ).text( value ).html();
		},
		getFullName: getFullName,
		getParentNamespaces: function( entry ) {
			var rtn = [];

			var namespaces = entry.namespace.split( "." );
			var prefix = "";
			var fullName;
			for (var i = 0; i < namespaces.length; i++) {
				fullName = prefix ? prefix + "." + namespaces[i] : namespaces[i];
				prefix = fullName;
				if (fullName) {
					rtn.push( {
						name: namespaces[i],
						fullName: fullName
					} );
				}
			}
			return rtn;
		}
	} );

	return {

		load: function( elem ) {

			function initializeApp ( data ) {

				var rootModel = via(),

					model = {

						topModule: "browse",
						entries: data,

						//the template for new entries
						entries_newItem: {
							name: "",
							//type can be category, or method
							type: "",
							//namespace is the path traverse from the root
							namespace: "",
							//
							shortDesc: "",
							//each signature represent different return
							signatures: [
								{
									name: "",
									returns: "",
									shortDesc: "",
									desc: "",
									//each overload return different parameters
									overloads: [
										{
											versionAdded: "",
											name: "",
											parameters: [
												{
													name: "",
													type: "",
													desc: ""
												}
											]
										}
									],
									examples: [
										{
											desc: "",
											code: "",
											html: "",
											css: ""
										}
									]
								}
							]
						},

						selectedEntryName: "",

						//--------------model function------------------
						selectedEntry: function() {
							return getEntryByFullName( this.get( "selectedEntryName" ) );
						},

						//model function
						//the entry is optional
						getSubEntries: function( entry ) {
							var namespace = entry ? getFullName( entry ) : "";
							return $( this.get( "entries" ) ).filter(
								function( index, item ) {
									return item.namespace == namespace;
								} ).get();
						},

						//-----------------view handler-----------------------------------------
						//view handler for event $afterExpandCollapseApi
						//seems that this violate principle that
						//the view handler should not modify view
						expandCollapseApi: function( e ) {
							e.originalPublisher
								.toggleClass( "ui-icon-plus ui-icon-minus" )
								.nextAll( "ul" )
								.toggle();
						},

						//view handler to handle $click event
						editEntry: function( e ) {
							var fullName = e.handler.options;
							var entry = getEntryByFullName( fullName );
							via( "doc.entries" ).editRowItem( entry );
							via.set( "doc.topModule", "edit" );
						},

						//view handler, subscriber is "doc.entries"
						review: function( e ) {
							var fullName = getFullName( this.get()[e.selectedRowIndex()] );
							via.set( "doc.selectedEntryName", fullName );
							via.set( "doc.topModule", "browse" );
						},

						overrideDeleteHandler: function( elem, parseContext, subscriptions, options ) {
							//subscribe it immediately before the original delete handler
							//are subscribe
							via( "doc.entries" ).subscribe( elem, "delete", function( e ) {
								var deletedEntry = via( "doc.entries" ).get( e.selectedRowIndex() );
								deleteSubEntries( deletedEntry );

								//e.stopImmediatePropagation(); will stop proceeding next the original
								//delete handler
								e.stopImmediatePropagation();
							} );
						},

						//------------------custom subscription-----------
						//this is called by the @initSubs property
						renderExample: function( elem, parseContext, subscriptions, options ) {
							var $elem = $( elem ),
								htmlSource = $elem.find( ".html" ).remove().html(),
								cssSource = $elem.find( ".css" ).remove().html();

							var iDoc = $elem.find( "iframe" )[0].contentWindow.document;
							//hack ie bug
							iDoc.open();
							iDoc.close();
							$( iDoc )
								.find( "body" )
								.html( htmlSource )
								.end()
								.find( "head" )
								.append( '<style type="text/css">' + cssSource + '</style>' );
						},
						discardChange: function( e ) {
							via( "doc.entries" ).purgeLocal();
							location.reload();
						}
					};

				rootModel.set( "doc", model );

				function getEntryByFullName ( fullName ) {
					return $( model.entries ).filter( function( index, entry ) {
						return fullName === getFullName( entry );
					} )[0];
				}

				via.trackChange( "doc.topModule", "doc.selectedEntryName" );

				//this is to synchronize the documents tab, if selected entry is updated
				via.subscribe( null, "doc.entries", "afterUpdate.1", function( e ) {
					var oldSelectedEntryName = getFullName( e.removed );
					var newSelectedEntryName = getFullName( e.proposed );

					var subEntries = via.get( "doc.getSubEntries", e.removed );

					for (var i = 0; i < subEntries.length; i++) {
						subEntries[i].namespace = newSelectedEntryName;
					}

					if (rootModel.get( "doc.selectedEntryName" ) == oldSelectedEntryName &&
					    oldSelectedEntryName == newSelectedEntryName) {
						//update "doc.selectedEntryName" will not trigger afterUpdate
						//because new value is the same as old value
						//so we need to manually trigger the change
						setTimeout( function() {
							rootModel.triggerChange( "doc.selectedEntryName" );
						}, 0 );
					} else {
						//the reason delay the set is that, the tree on the right need
						//to be re-rendered, the delay is to let the re-rendering complete
						//first, then set it.
						setTimeout( function() {
							rootModel.set( "doc.selectedEntryName", getFullName( e.proposed ) );
						}, 10 );
					}
				} );

				function deleteSubEntries ( entry ) {
					var fullName = getFullName( entry );
					if (rootModel.get( "doc.selectedEntryName" ) == fullName) {
						rootModel.set( "doc.selectedEntryName", "" );
					}

					var children = rootModel.get( "doc.getSubEntries", entry );
					for (var i = 0; i < children.length; i++) {
						deleteSubEntries( children[i] );
					}

					via( "doc.entries" ).removeItem( entry );
				}

				$( elem ).renderInside( /*templateId*/"doc", /*modelPath*/"doc" );
				via( "doc.entries" ).saveLocalAfterUpdate();
			}

			var data = via( "doc.entries" ).getLocal();
			if (data) {
				initializeApp( data );
			} else {
				$.getJSON( "doc-json.js" ).done( initializeApp ).done(
					function() {
						via( "doc.entries" ).saveLocal();
					} );
			}
		},

		unload: function() {

		}
	};
})();