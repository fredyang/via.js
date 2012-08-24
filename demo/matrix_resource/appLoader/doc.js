(function() {

	//namespace + name
	function getFullName ( entry ) {
		return entry.namespace ? entry.namespace + "." + entry.name : entry.name;
	}

	$.views.helpers( {
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

			var url = "doc-json.js";

			$.getJSON( url ).done( function( data ) {

				var rootModel = via(),
					model = {

						topModule: "browse",
						entries: data,

						entries_newItem: {
							name: "",
							namespace: "",
							returns: "",
							version: "",
							signatures: [
								{
									versionAdded: "",
									title: "",
									parameters: [
										{
											name: "",
											type: "",
											desc: ""
										}
									]
								}
							],
							shortDesc: "",
							desc: "",
							longDesc: "",
							examples: [
								{
									desc: "",
									code: "",
									html: "",
									css: ""
								}
							]},

						//get a single entry by full name (namespace + name)
						getEntryByFullName: function( fullName ) {
							//return null is necessary , because it is used
							//to clear the area using template, if return undefined
							//template will not run
							return $( this.entries ).filter( function( index, entry ) {
								return fullName === getFullName( entry );
							} )[0] || null;
						},

						getSubEntries: function( entry ) {
							//the entry is optional
							var namespace = entry ? getFullName( entry ) : "";

							return $( this.get( "entries" ) ).filter(
								function( index, item ) {
									return item.namespace == namespace;
								} ).get();
						},

						//handle the click on the elem displaying namespace
						//to expand or collapse the children elements
						expandCollapseApi: function( e ) {
							e.originalPublisher
								.toggleClass( "ui-icon-plus ui-icon-minus" )
								.nextAll( "ul" )
								.toggle();
						},

						renderExample: function( elem ) {

							var $elem = $( elem ),
								htmlSource = $elem.find( ".html" ).remove().html(),
								cssSource = $elem.find( ".css" ).remove().html();

							$( $elem.find( "iframe" )[0].contentWindow.document )
								.find( "body" )
								.append( htmlSource )
								.end()
								.find( "head" )
								.append( '<style type="text/css">' + cssSource + '</style>' );
						},

						editEntry: function( e ) {
							var fullName = this.options;
							var entry = model.getEntryByFullName( fullName );
							via( "doc.entries" ).editRowItem( entry );
							via.set( "doc.topModule", "edit" );
						},

						selectedEntryName: "",

						selectedEntry: function() {
							return model.getEntryByFullName( this.get( "selectedEntryName" ) );
						},

						review: function( e ) {
							var fullName = getFullName( e.subscriber.get()[e.selectedRowIndex()] );
							via.set( "doc.selectedEntryName", fullName );
							via.set( "doc.topModule", "browse" );
						}
					};

				rootModel.set( "doc", model );

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
						rootModel.triggerChange( "doc.selectedEntryName" );
					} else {
						//the reason delay the set is that, the tree on the right need
						//to be re-rendered, the delay is to let the re-rendering complete
						//first, then set it.
						setTimeout( function() {
							rootModel.set( "doc.selectedEntryName", getFullName( e.proposed ) );
						}, 10 );
					}
				} );

				via.subscribe( null, "doc.entries", "afterDel.1", function( e ) {

					if (rootModel.get( "doc.selectedEntryName" ) == getFullName( e.removed )) {
						rootModel.set( "doc.selectedEntryName", "" );
					}

					var entriesModel = via( "doc.entries" );

					var children = rootModel.get( "doc.getSubEntries", e.removed );
					//cascade delete children
					for (var i = 0; i < children.length; i++) {
						entriesModel.removeItem( children[i] );
					}
				} );

				$( elem ).renderInside( /*templateId*/"doc", /*modelPath*/"doc" );

			} );

		},

		unload: function() {

		}
	};
})();