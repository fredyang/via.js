//
//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var isFunction = $.isFunction;
	var commonViewHandlers = via.commonViewHandlers;
	var valueConverters = via.valueConverters;
	var commonModelHandlers = via.commonModelHandlers;
	var defaultOptions = via.options();
	var viaBindingSet = via.themes.via.bindingSet;
	var templateEngines = via.templateEngines;
	var specialParsers = via.specialParsers;
	//#end_merge

	if ( templateEngines.tmpl ) {

		via.compileTemplate( "ddl_tmpl", "<option value='${this.value($data)}'>${this.name($data)}</option>" );
	}

	if ( templateEngines.jsrender ) {

		via.compileTemplate( "ddl_jsrender", "<option value='{{=$ctx.value($data)}}'>{{=$ctx.name($data)}}</option>", "jsrender" );

	}

	extend( commonModelHandlers, {

		dropdown:extend(

			function ( modelEvent ) {
				//	function template( modelEvent ) {
				commonModelHandlers.template.call( this, modelEvent );
			},
			{
				buildOptions: function ( options ) {

					//name,value,engine
					var parts = (options || "").split( "," );

					options = parts.length === 1 ?
						//only engine name is specified
					{
						name: function ( item ) {
							return item.toString();
						},
						value: function ( item ) {
							return item.toString();
						},
						engine: options
					} :
						//all name, value, engine name is specified
					{
						name : function ( item ) {
							return item[parts[0]];
						},
						value : function ( item ) {
							return item[parts[1]];
						},
						engine: parts[2]
					};

					options.templateId = "ddl_" + (options.engine || defaultOptions.engine);
					return options;
				}
			}
		),

		//add a new item to to list view
		pushViewItem: function ( modelEvent ) {

			$( this ).renderTemplate( modelEvent.options, modelEvent.targetValue(), function ( $content ) {
				$content.appendTo( this ).view();
			} );

		},

		//remove an item from list view
		removeViewItem: function ( modelEvent ) {
			$( this ).children().eq( +modelEvent.targetIndex() ).remove();
		},

		//update an item in the list view
		updateViewItem: function ( modelEvent ) {
			$( this ).renderTemplate( modelEvent.options, modelEvent.targetValue(),
				function ( $content ) {
					$( this ).children().eq( modelEvent.targetIndex() ).replaceWith( $content );
					$content.view();
				} );
		},

		//show a view if model is not empty
		showIfTruthy : function ( modelEvent ) {
			$( this )[ modelEvent.isModelEmpty() ? "hide" : "show"]();
		},

		//show a view if model is falsy
		showIfFalsy: function ( modelEvent ) {

			$( this )[ modelEvent.isModelEmpty() ? "show" : "hide"]();
		},

		enableIfTruthy: function ( modelEvent ) {
			$( this ).attr( "disabled", modelEvent.isModelEmpty() );
		},

		enableIfFalsy: function ( modelEvent ) {
			$( this ).attr( "disabled", !modelEvent.isModelEmpty() );
		},

		//update text box only when the new value is different from the value of the text box
		//this is prevent circular update
		val : function ( modelEvent ) {
			var value = modelEvent.currentValue();
			if ( value !== $( this ).val() ) {
				$( this ).val( value );
			}
		}
	} );

	extend( commonViewHandlers, {

		//return a static value (from options) to be used to update model
		value : function ( viewEvent ) {
			return isFunction( viewEvent.options ) ?
				viewEvent.options() :
				viewEvent.options;
		},

		//return a eval value (from options) to be used to update model
		evalOptions: function ( viewEvent ) {
			return eval( viewEvent.options );
		},

		stringOptions: function ( viewEvent ) {
			return viewEvent.options;
		},

		numberOptions: function( viewEvent ) {
			return +viewEvent.options;
		},

		trueValue: function () {
			return true;
		},

		falseValue: function () {
			return false;
		},
		//return opposite value of the current model to be used to update model
		toggle: function ( viewEvent ) {
			return !viewEvent.targetValue();
		},

		trueIfCheck: function () {
			return this.checked;
		},

		trueIfUncheck: function () {
			return !this.checked;
		},

		returnFalse: function ( viewEvent ) {
			viewEvent.returnFalse();
		},

		preventDefault: function ( viewEvent ) {
			viewEvent.e.preventDefault();
		},

		stopBubble : function ( viewEvent ) {
			viewEvent.e.stopImmediatePropagation();
		}

	} );

	//valueConverter is used convert a string to a typed value
	//this is ued in viewHandlers
	extend( valueConverters, {

		toNumber: function ( value ) {
			return +value;
		},

		toDate: function ( value ) {
			return new Date( value );
		},

		toString: function ( value ) {
			return (value === null || value === undefined) ? "" : "" + value;
		}
	} );

	viaBindingSet.simpleList = "@mh:.,init|afterUpdate,*template;" +
	                           ".,afterCreate.child,*pushViewItem;" +
	                           ".,afterUpdate.child,*updateViewItem;" +
	                           ".,afterDel.child,*removeViewItem,_";

	specialParsers.lookup = function( view, binding, handlers, specialOptions ) {
		var rLookupOptions = /^(.+?),(.*)$/;
		var match = rLookupOptions.exec( specialOptions );
		var path = binding.path;

		handlers.mh.push(
			{
				path: match[1],
				modelEvents: "init",
				view: view,
				modelHandler: "*dropdown",
				options: match[2]
			}
		);

		if ( path ) {

			handlers.mh.push(
				{
					path: binding.path,
					modelEvents: "afterUpdate",
					view: view,
					modelHandler: "*val"
				}
			);

			handlers.vh.push( {
				path:binding.path,
				viewEvents: "change",
				view: view,
				viewHandler: "$val"
			} );
		}
	};

	via.classMatchers.textBox = function ( view ) {
		return $( view ).is( ":text" );
	};

	extend( viaBindingSet, {

		textBox: "@mh:.,init|after*,*val" +
		         "@vh:.,keyup,$val",
		//simple label
		//text: "@mh:.,init|after*,$text",

		//rich label
		label: "@mh:.,init|after*,$html"
	} );
	//#merge
})( jQuery, via );
//#end_merge


