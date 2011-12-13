//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var proxyPrototype = via.fn;
	var RegExp = window.RegExp;
	var ViewEvent = via.ViewEvent;
	var rDigit = /^\d+$/;
	var viaBindingSet = via.themes.via.bindingSet;
	//#end_merge

	//this is a set of proxy method that encapsulate the operations
	//that act on the model
	extend( proxyPrototype, {

		//if enableDependencyTracking is absent, then dependency tracking is disabled
		enableQuery : function ( enableDependencyTracking ) {

			var shadowObject = {
				query: {
					page: {
						enabled: false,
						index:0, //nth page
						count:1,
						size: 0
					},
					sort: {
						by: null, //currently we only support sort by one column sort
						asc: null
					},
					filter: {
						filterBuilder: function () {
							if ( this.ops && this.by && this.value ) {
								return shadowObject.query.filter.defaultFilter;
							}
						},
						defaultFilter: function () {
							var filter = shadowObject.query.filter;
							var ops = filter.ops;
							var by = filter.by;
							var value = filter.value;

							switch ( ops ) {
								case "equals":
									//here "this" refer to the element in an array
									return RegExp( "^" + value + "$", "i" ).test( this[by] );
								case "contains":
									return RegExp( value, "i" ).test( this[by] );
							}
							return true;
						},
						by: "",
						value: "",
						ops: "",
						enabled: function () {
							return !!this.filterBuilder();
						}
					},
					enabled: function () {
						var page = this.page;
						var sort = this.sort;
						return !!page.enabled || !!sort.by || !!this.filter.enabled();
					}
				},

				queryResult: function ( skipPaging ) {

					log( "queryResult is called" );

					//"this" refers to the Shadow object
					//wrap array into a jQuery object
					var rtn = $( this.mainModel() );

					var query = this.query;

					//run filter
					var filter = query.filter.filterBuilder();
					if ( filter ) {
						rtn = rtn.filter( filter ).get();
					} else {
						rtn = rtn.get();
					}

					via().update( this.mainPath + "*hasResult", rtn.length > 0 );

					//run sort
					if ( query.sort.by ) {
						rtn.sortObject( query.sort.by, query.sort.asc );
					}

					//run paging
					var page = query.page;
					if ( !skipPaging && page.enabled ) {
						var count = Math.ceil( rtn.length / page.size ) || 1;
						if ( count != page.count ) {
							page.count = count;
							if ( page.index > page.count - 1 ) {
								page.index = 0;
							}
							//
							via( this.mainPath + "*query.page" ).triggerChange();
						}
						rtn = rtn.slice( page.index * page.size, (page.index + 1) * page.size );
					}

					return rtn;
				},

				hasResult: false
			};

			this.shadowProxy().create( shadowObject );

			//manually make queryResult depend on the array
			via.addRef( this.context + "*queryResult", this.context );

			//by default via proxy automatically detect that x*queryResult depends on x*query
			//here provide an option to enable or disable dependency tracking
			//and this option by default is disabled
			if ( !enableDependencyTracking ) {
				via.removeRef( this.context + "*queryResult", this.context + "*query" );
			}

			return this;
		},

		notifyQueryChange: function() {
			return this.triggerChange( "*queryResult" );
		},

		enableSorter: function () {
			this.shadowProxy().create( "sort", {
				by: "",
				asc: true
			} );

			via.addModelHandler( this.context + "*sort", "after*", function ( modelEvent ) {
				var sort = modelEvent.currentValue();
				if ( sort.by ) {
					modelEvent.currentProxy().mainProxy().sort( sort.by, sort.asc );
				}
			} );
		},

		setPageIndex: function ( index ) {
			if ( index instanceof ViewEvent ) {
				index = $( index.e.target ).attr( "page" );
			}

			var page = this.get( "*query.page" );

			if ( rDigit.test( index ) ) {

				index = +index;

			} else {

				if ( index == "next" ) {

					index = page.index + 1;

				} else if ( index == "previous" ) {

					index = page.index - 1;

				} else if ( index == "first" ) {

					index = 0;

				} else if ( index == "last" ) {

					index = page.count - 1;

				} else if ( index == "disabled" ) {

					index = 0;
					return this.update( "*query.page.enabled", false );
				}
			}

			if ( typeof index !== "number" || index < 0 || index > page.count - 1 ) {
				index = 0;
			}

			return this.update( "*query.page.index", index );
		},

		disableFilter: function () {
			this.childProxy( "*query.filter" )
				.update( "by", "" )
				.update( "value", "" )
				.update( "ops", "" );
			return this;
		},

		disablePage: function () {
			var page = this.get( "*query.page" );
			page.size = 0;
			page.count = 1;
			page.index = 0;
			page.enabled = false;
			this.triggerChange( "*query.page" );
			return this;
		},

		disableSort: function () {
			this.childProxy( "*query.sort" )
				.update( "by", null )
				.update( "asc", null );
			return this;
		},

		clearQuery: function () {
			return this.disablePage()
				.disableSort()
				.disableFilter();
		}

	} );

	extend( viaBindingSet, {

		sortQuery: "@vh:*query.sort.by,click,*stringOptions;" +
		           "*query.sort.asc,click,*toggle,_;" +
		           ".,click,p.notifyQueryChange,_",

		resetQuerySort: "@mh:*query.sort.by,init|afterUpdate,*showIfTruthy ;" +
		                "@vh:.,click,p.clearQuery;" +
		                ".,click,p.notifyQueryChange",

		queryPager: "@mh:*query.page,init|after*,*template;" +
		            "*hasResult,init|after*,*showIfTruthy,_",

		enablePaging: "@mh:*query.page.size,init|afterUpdate,*enableIfTruthy" +
		              "@vh:*query.page.enabled,click,*trueValue;" +
		              ".,click,p.notifyQueryChange",

		sortModel: "@vh:*sort.by,click,*stringOptions;" +
		           "*sort.asc,click,*toggle,_;" +
		           ".,click,"

	} );
	//#merge
})( jQuery, via );
//#end_merge
