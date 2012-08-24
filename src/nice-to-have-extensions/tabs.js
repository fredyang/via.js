//
//<@depends>event.js, model.js, declarative.js, template.js</@depends>

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
	via.handlers( {
		"updateTab": function( e ) {
			var options = this.options.split( "," );
			var tabId = options[0];
			var selectedClass = options[1] || defaultOptions.selectedClass;

			if (e.publisher.get() == tabId) {
				e.subscriber.addClass( selectedClass );
			} else {
				e.subscriber.removeClass( selectedClass );
			}
		},
		selectTab: function( e ) {
			e.subscriber.set( this.options.split( "," )[0] );
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
	via.handlers( "updateTabHolder", function( e ) {
		var selectedTabId = e.publisher.get(),
			options = (this.options || "").split( "," ),
			selectedClass = options[0] || defaultOptions.selectedClass,
			tabIdAttribute = options[1] || defaultOptions.tabIdAttribute,
			childSelector = this.options || "[" + tabIdAttribute + "]";

		e.subscriber.find( childSelector ).andSelf().each( function( index, elem ) {
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
	via.customSubsProps.tabSelectorHolder = function( elem, parseContext, subscriptions, options ) {

		var path = parseContext.ns,
			options = (options || "").split( "," ),
			tabIdAttribute = options[1] || defaultOptions.tabIdAttribute,
			childSelector = this.options || "[" + tabIdAttribute + "]";

		$( elem ).delegate( childSelector, "click", function() {
			via.set( path, $( this ).attr( tabIdAttribute ) );
		} );
	};

	//apply this class the holder of tab
	//<div data-sub="`tabHolder:focus,div.tab">
	viaClasses.tabHolder = "!init100 afterUpdate:.|*updateTabHolder";

	//tabSelectorHolder is superset of tab holder
	//apply this class to the holder of tab selector such as ul
	//<ul data-sub="`tabSelectorHolder:focus,li">
	viaClasses.tabSelectorHolder = "@tabSelectorHolder" +
	                                  "`tabHolder" +
	                                  "`preventDefault";

	//#merge
})
	( jQuery, via );
//#end_merge


