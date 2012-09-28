//
//<@depends>eventSubscription.js, modelProxy.js, declarative.js, template.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var viaClasses = via.classes;
	var extend = $.extend;
	var rootModel = via();
	var userSubsProps = via.userSubsProps;
	var trigger = via.trigger;
	var isObject = via.util.isObject;
	var rDigit = /^\d+$/;
	var viaFn = via.fn;
	//#end_merge

	userSubsProps.createQueryable = function( elem, parseContext, subscriptions, options ) {
		via( parseContext.ns ).createQueryable( !!options );
	};

	viaFn.createQueryable = function( autoQuery ) {
		var path = this.path;

		if (this.get( "*query" )) {
			return;
		}
		autoQuery = !!autoQuery;

		var queryableShadow = {
			//if it is true, triggerQueryChange is bypassed
			autoQuery: autoQuery,

			hasResult: false,

			//triggerQueryChange can be called regardless whether autoQuery is enabled,
			// because internally it check the flag to determine if
			// it is necessary to trigger the change event
			triggerQueryChange: function() {
				//if autoQuery is true, then don't need to trigger change again
				if (!queryableShadow.autoQuery) {
					setTimeout( function() {
						trigger( path + "*queryResult", path + "*queryResult", "afterUpdate" );
					}, 0 );
				}
			},

			//query paging, sorting, and filtering
			query: {
				page: {
					enabled: false,
					index: 0, //nth page
					count: 1,
					size: 0
				},
				sort: {
					by: null, //currently we only support sort by one column sort
					asc: null
				},
				filter: {
					fn: function() {

						if (this.get( "ops" ) && this.get( "by" ) && this.get( "value" )) {

							var filter = queryableShadow.query.filter,
								ops = filter.ops,
								by = filter.by,
								value = filter.value,
								regex;

							if (ops == "equals") {
								regex = RegExp( "^" + value + "$", "i" );

							} else if (ops == "contains") {
								regex = RegExp( value, "i" );
							}

							return function() {
								return regex ? regex.test( this[by] ) : true;
							};
						}
					},
					//the property name of object
					by: "",
					value: "",
					ops: "",
					//is filter enabled
					enabled: function() {
						return !!this.get( "fn" );
					}
				},
				//is query enabled
				enabled: function() {
					return this.get( "page.enabled" ) || this.get( "sort.by" ) || this.get( "filter.enabled" );
				}
			},

			queryResult: function( disablePaging ) {
				"this.get('query')";
				//log( "queryResult is called" );

				//"this" refers to the Shadow object
				//wrap array into a jQuery object
				var queryResult = $( rootModel.get( path ) );

				//this will add an entry to modelLinks
				//subscriber *queryResult, publisher *query
				var queryProxy = this.cd( "query" );

				//run filter
				var fn = queryProxy.get( "filter.fn" );
				if (fn) {
					queryResult = queryResult.filter( fn ).get();
				} else {
					queryResult = queryResult.get();
				}

				rootModel.update( path + "*hasResult", queryResult.length > 0 );

				//run sort
				if (queryProxy.get( "sort.by" )) {
					queryResult.sortObject( queryProxy.get( "sort.by" ), queryProxy.get( "sort.asc" ) );
				}

				//run paging
				var page = queryProxy.get( "page" );

				if (!disablePaging && page.enabled) {
					var count = Math.ceil( queryResult.length / page.size ) || 1;
					if (count != page.count) {
						page.count = count;
						if (page.index > page.count - 1) {
							page.index = 0;
						}
						//
						via( path + "*query.page" ).triggerChange();
					}
					queryResult = queryResult.slice( page.index * page.size, (page.index + 1) * page.size );
				}

				return queryResult;
			},

			//the publisher should have a page attribute
			// the attribute value can also be string first,previous,next,last or disabled
			//or number 0, 1, 2 (starting from 0)
			// for example page="0" or page="first"
			changePage: function( e ) {
				var index;
				if (isObject( e )) {
					index = e.originalPublisher.attr( "page" );
					if (!index) {
						return;
					}
				} else {
					index = e;
				}

				var page = rootModel.get( path + "*query.page" );

				if (rDigit.test( index )) {

					index = +index;

				} else {

					if (index == "next") {

						index = page.index + 1;

					} else if (index == "previous") {

						index = page.index - 1;

					} else if (index == "first") {

						index = 0;

					} else if (index == "last") {

						index = page.count - 1;

					} else if (index == "disabled") {
						index = 0;
						queryableShadow.resetPaging();
					}
				}

				if (typeof index !== "number" || index < 0 || index > page.count - 1) {
					index = 0;
				}

				rootModel.update( path + "*query.page.index", index );
				queryableShadow.triggerQueryChange();
			},

			resetSort: function() {
				rootModel.set( path + "*query.sort.by", null )
					.set( path + "*query.sort.asc", null );
			},

			resetFilter: function() {
				rootModel.update( path + "*query.filter.by", "" )
					.update( path + "*query.filter.value", "" )
					.update( path + "*query.filter.ops", "" );
			},

			resetPaging: function() {
				rootModel.update( path + "*query.page.enabled", false )
					.update( path + "*query.page.size", 0 )
					.update( path + "*query.page.count", 1 )
					.update( path + "*query.page.index", 0 );
			},

			resetQuery: function() {
				queryableShadow.resetSort();
				queryableShadow.resetFilter();
				queryableShadow.resetPaging();
			}
		};

		this.extend( "*", queryableShadow )
			//manually make queryResult depend on the array
			//contacts*queryResult --> contacts
			.cd( "*queryResult" ).watchPath( path );

		// Because the tracking is automatic,  contacts*queryResult --watching--> contacts*query
		//if queryableShadow.autoQuery is false, we need to unwatch the model*query change,
		//so that we can manually control when model*queryResult need to be refreshed
		if (!queryableShadow.autoQuery) {
			//contacts*queryResult --> contacts*query
			this.cd( "*queryResult" ).unwatchPath( path + "*query" );
		}
	};

	extend( viaClasses, {

		//notify queryChanged
		queryChanged: "$click:*triggerQueryChange",

		//	<tbody data-sub="`queryableListView:.|#contactRow">
		//instead using listView whose parse context is raw items
		//queryableListView create view which subscribe items*queryableResult
		queryableListView:  //create queryable shadow objects to support query
			               "@createQueryable" +
							//render the whole list of items
			               "`forAll:*queryResult",


		//data-sub="`sort:.,firstName" //context path is items
		//set *query.sort.by to a preset value of a column
		//toggle *query.sort.by
		//notifyChange
		sort: "$click:*query.sort.by|*hardCode" +
		      "$click:*query.sort.asc|*toggle" +
		      "`queryChanged",

		//data-sub="`resetSort" //context path is items
		resetSort: "!init afterUpdate:*query.sort.by|*show;" +
		           "$click:*resetSort" +
		           "`queryChanged",

		//data-sub="`pager:.,#pagerTemplate"
		//render pager using the data under items*query.page
		pager: "`forAll:*query.page" +
		       "!init after*:*hasResult|*show|_" +
		       "`changePage" +
		       "`preventDefault",

		//this handle the "changePage" event raised by the buttons
		//inside the pager, like next/previous/show all/enable paging
		//this button raise the "changePage" event because it has "`pageButton"
		changePage: "$changePage:*changePage",

		//this is for the behavior of the enable paging button
		//enable when page size is set
		//trigger query when it is click
		applyPaging: "!init afterUpdate:*query.page.size|*enable" +
		             "$click:*query.page.enabled|*true" +
		             "`queryChanged",

		//<input type="button" value="Search" data-sub="`applyFilter"/>
		//this is for the behavior of search button
		//the button is enabled when filter is enabled
		//trigger query when button is click
		applyFilter: "`enable:*query.filter.enabled" +
		             "`queryChanged",

		//this is for the behavior of reset search button
		//show when search button is enabled
		//clear all search criterial when click
		resetFilter: "`show:*query.filter.enabled" +
		             "$click:*resetFilter" +
		             "`queryChanged",

		resetQuery: "$click:*resetQuery" +
		            "`queryChanged" +
		            "!init afterUpdate:*query.enabled|*show",

		withQueryResult: "`show:*hasResult",

		withoutQueryResult: "`hide:*hasResult"
	} );

	//#merge
})( jQuery, via );
//#end_merge
