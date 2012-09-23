//
//<@depends>eventSubscription.js, modelProxy.js, declarative.js, template.js</@depends>

//there are a few concepts here

//tabs refer to all controls that has a visibility change when user click on an object
//these include that the object that user click, here it is called tab selector
//and also that object holds the interesting content

//normally we group the tab selector into a holder, here it is called tabSelectorHolder
//and group tab content into another holder

//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var viaClasses = via.classes;
	var defaultOptions = via.options;
	//#end_merge

	defaultOptions.selectedClass = "selected";
	defaultOptions.tabIdAttribute = "data-tab";

	//	----------- the following update tab itself ------------
	//when model change, change view
	via.pipeline( {
		"updateTab": function( e ) {
			var options = e.handler.options.split( "," );
			var tabId = options[0];
			var selectedClass = options[1] || defaultOptions.selectedClass;

			if (e.publisher.get() == tabId) {
				this.addClass( selectedClass );
			} else {
				this.removeClass( selectedClass );
			}
		},
		selectTab: function( e ) {
			this.set( e.handler.options.split( "," )[0] );
		}
	} );

	//apply this class to the tab selector or the tab content like
	// data-sub="`tab:modelPath|tabId"
	//or
	// data-sub="`tab:modelPath|tabId,cssClassWhenSelected"
	//
	//when the model holding that tabId is changed,
	// the selected css class will be applied to the element with the tab id which match
	//the value of the model, and remove selected css class to the elements with tab id
	//which does not match with the model value
	//
	//<div class="tab" data-sub="`tab:modelPath|tabId">content</div>
	viaClasses.tab = "!init afterUpdate:.|*updateTab";

	//class which include tab class, with additonal behavior
	//
	//tabSelector is specific tab
	//apply this class to the tab selector such as <li />
	//additional to the behavior tab class
	//
	//when tab selector is clicked, save its id to model
	//data-sub="`tabSelector:modelPath|tabId"
	//data-sub="`tabSelector:modelPath|tabId,cssClassWhenSelected"
	//
	//<li data-sub="`tabSelector:modelPath|tabsId">xx</li>
	viaClasses.tabSelector = "$click:.|*selectTab" +
	                         "`preventDefault" +
	                         "`tab";

	//	----------- the following update tab holder ------------
	via.pipeline( "updateTabHolder", function( e ) {
		var selectedTabId = e.publisher.get(),
			options = (e.handler.options || "").split( "," ),
			tabIdAttribute = options[0] || defaultOptions.tabIdAttribute,
			selectedClass = options[1] || defaultOptions.selectedClass,
			childSelector = "[" + tabIdAttribute + "]";

		this.find( childSelector ).andSelf().each( function( index, elem ) {
			var $elem = $( elem ),
				tabId = $elem.attr( tabIdAttribute );
			if (tabId == selectedTabId) {
				$elem.addClass( selectedClass );
			} else {
				$elem.removeClass( selectedClass );
			}
		} );

	} );

	//when user click on a tab selector, update the model with tab attribute value
	via.userSubsProps.tabSelectorHolder = function( elem, parseContext, subscriptions, options ) {

		options = (options || "").split( "," );

		var path = parseContext.ns,
			tabIdAttribute = options[0] || defaultOptions.tabIdAttribute,
			handler = "attr*" + tabIdAttribute,
			delegateSelector = "[" + tabIdAttribute + "]";
		//using delegate subscription will create one subscription
		via( path ).subscribe( elem, "click", handler, null, delegateSelector );

	};

	//apply this class the holder of tab
	//data-sub="`tabHolder:doc.topModule|selectedClass,attributeOfSelectedId
	//data-sub="`tabHolder:doc.topModule|selected,topModule
	viaClasses.tabHolder = "!init100 afterUpdate:.|*updateTabHolder";

	//tabSelectorHolder is superset of tab holder
	//apply this class to the holder of tab selector such as ul
	//data-sub="`tabSelectorHolder:doc.topModule|selectedClass,attributeOfSelectedId">
	//<ul class="top_nav man" data-sub="`tabSelectorHolder:doc.topModule|selected,topModule">
	viaClasses.tabSelectorHolder = "@tabSelectorHolder:." +
	                               "`tabHolder" +
	                               "`preventDefault";

	//#merge
})
	( jQuery, via );
//#end_merge


