//#merge
(function ( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var defaultOptions = via.options();
	var shadowRoot = via( "*" ).get();
	var modelHandlerData = via.getModelHandlerData();
	var rootProxy = via();
	var RegExp = window.RegExp;
	var isArray = $.isArray;
	var raiseEvent = via.raiseEvent;
	var toPhysicalPath = via.toPhysicalPath;
	var commonModelHandlers = via.commonModelHandlers;
	var isString = via.isString;
	var proxyPrototype = via.fn;
	var isObject = via.isObject;
	var slice = [].slice;
	var specialParsers = via.specialParsers;
	//#end_merge

	defaultOptions.errors = {
		required: "This field is required.",
		email: "Please enter a valid email address.",
		url: "Please enter a valid URL.",
		date: "Please enter a valid date.",
		dateISO: "Please enter a valid date (ISO).",
		number: "Please enter a valid number.",
		digits: "Please enter only digits.",
		creditcard: "Please enter a valid credit card number.",
		equal: "Please enter the same value again.",
		accept: "Please enter a value with a valid extension.",
		maxlength: "Please enter no more than {0} characters.",
		minlength: "Please enter at least {0} characters.",
		rangelength: "Please enter a value between {0} and {1} characters long.",
		range: "Please enter a value between {0} and {1}.",
		max: "Please enter a value less than or equal to {0}.",
		min: "Please enter a value greater than or equal to {0}."
	};

	var invalidModelPaths = shadowRoot.invalidModelPaths = [],
		invalidModelPathsProxy = via( "*invalidModelPaths" ),
		rEmpty = /^\s*$/,
		rEmail = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		rUrl = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
		rDateISO = /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
		rNumber = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
		rDigit = /^\d+$/,
		rInvalidDate = /Invalid|NaN/,
		rRegEx = /^(\/(\\[^\x00-\x1f]|\[(\\[^\x00-\x1f]|[^\x00-\x1f\\\/])*\]|[^\x00-\x1f\\\/\[])+\/[gim]*)(,(.*))$/,
		rFirstToken = /(\w+)(,(.*))?/,
		rFirstTwoToken = /(\w+),(\w+)(,(.*))?/;

	function isValidModel( path ) {
		if ( path === "" ) {
			return !invalidModelPaths.length;
		}
		var subPath = path + ".";
		for ( var i = 0; i < invalidModelPaths.length; i++ ) {
			if ( invalidModelPaths[i] == path || invalidModelPaths[i].beginsWith( subPath ) ) {
				return false;
			}
		}
		return true;
	}

	proxyPrototype.isValid = function () {
		var invalidatedPath = this.context + "*invalidated";
		if ( rootProxy.get( invalidatedPath ) ) {
			return isValidModel( this.context );
		}

		rootProxy.create( invalidatedPath, true );

		for ( var path in  modelHandlerData ) {
			if ( !path.beginsWith( this.context ) ) {
				continue;
			}

			var handlerEntries = modelHandlerData[path];
			for ( var i = 0; i < handlerEntries.length; i++ ) {

				var handlerEntry = handlerEntries[i];

				if ( handlerEntry.modelEvents === "beforeUpdate" ) {

					raiseEvent( {
						path:path,
						eventType: handlerEntry.modelEvents,
						target: path,
						proposed: via().get( path )
					} );

					raiseEvent( {
						path:path,
						eventType: "init",
						target: path
					} );

					//the event only need to raised once, so stop checking other event entries
					break;
				}
			}
		}

		return isValidModel( this.context );
	};

	extend( via.ModelEvent.prototype, {

		addError: function ( error ) {

			this.currentProxy().createIfUndefined( "*errors", [] )
				.childProxy( "*errors" )
				.pushUnique( error );

			invalidModelPathsProxy.pushUnique( this.path );

		},

		removeError:function ( error ) {

			if ( this.currentProxy().createIfUndefined( "*errors", [] )
				.childProxy( "*errors" )
				.removeItem( error ).isModelEmpty() ) {

				invalidModelPathsProxy.removeItem( this.path );
			}
		}

	} );

	function allowModelEmpty( path ) {
		path = toPhysicalPath( path );
		var handlers = modelHandlerData[path];
		for ( var i = 0; i < handlers.length; i++ ) {
			var handler = handlers[i];
			if ( handler.modelHandler === "*required" ) {
				return false;
			}
		}
		return true;
	}

	function format( source ) {

		$.each( slice.call( arguments, 1 ), function( i, n ) {
			source = source.replace( new RegExp( "\\{" + i + "\\}", "g" ), n );
		} );
		return source;
	}

	//#debug
	via.debug.format = format;
	//#end_debug

	function buildValidationModelHandler( validator ) {

		var modelHandler = function ( modelEvent ) {
			//if it violate required rule, don't do further validation,
			//as we expect the required rule will capture it first.
			var isValid;
			var violateRequiredRule;

			//if model is empty, only check the "require" validator
			//If it is required, then it is invalid, no further validation is checked
			//if it is not required, it is valid, no further validation is checked
			if ( isEmpty( modelEvent.proposed ) ) {

				if ( allowModelEmpty( modelEvent.path ) ) {
					isValid = true;
				} else {
					isValid = false;
					violateRequiredRule = true;
				}

			} else {

				isValid = validator.isValid( modelEvent.proposed, modelEvent.options );
			}

			//non-ad-hoc validator normally has a defautlError
			var defaultError = validator.name && defaultOptions.errors[validator.name],
				options = modelEvent.options,
				//userError is normally passed in by instance
				userError = isObject( options ) ? options.userError : options,
				errorToShow;

			//if validator has buildError function, this take the highest priority
			if ( validator.buildError ) {

				//return userError || format.apply( null, [defaultError].concat( options.minlength ) );
				errorToShow = validator.buildError( defaultError, options );

				//if defaultError is format string,
			} else if ( defaultError && defaultError.contains( "{0}" ) ) {

				errorToShow = format.apply( null, [defaultError].concat( userError.split( "," ) ) );

			} else {

				errorToShow = userError || defaultError || validator.error;
			}

			//if it is invalid because it violate other rules (no required rules) or because it is required
			if ( !isValid && (!violateRequiredRule || validator.name === "required") ) {

				modelEvent.addError( errorToShow );

			} else {

				modelEvent.removeError( errorToShow );
			}

			if ( !isValid ) {
				modelEvent.hasError = true;
			}
		};

		//transfer validator's buildOptions to model handler
		if ( validator.buildOptions ) {
			modelHandler.buildOptions = validator.buildOptions;
			delete validator.buildOptions;
		}
		return modelHandler;
	}

	via.addValidator = function ( validator ) {

		if ( isArray( validator ) ) {
			for ( var i = 0; i < validator.length; i++ ) {
				via.addValidator( validator[i] );
			}
			return;
		}

		commonModelHandlers[validator.name] = buildValidationModelHandler( validator );

		//add default error if applicable
		if ( validator.name && validator.error ) {
			defaultOptions.errors[validator.name] = validator.error;
		}

		//enable declarative binding
		specialParsers[validator.name] = function ( view, binding, handlers ) {
			handlers.mh.push( {
				path: binding.path,
				modelEvents: "beforeUpdate",
				view: view,
				modelHandler: "*" + validator.name,
				options: binding[validator.name] === true ? undefined : binding[validator.name]
			} );
		};
	};

	function buildRegexFn( ex, reverse ) {
		return reverse ? function ( value ) {
			return !ex.test( value );
		} : function ( value ) {
			return ex.test( value );
		};
	}

	//	return something like :function ( defaultError, options ) {
	//  return options.userError || format.apply( null, [defaultError].concat( options.minlength ) );
	//}
	function buildErrorFn() {
		var props = slice.call( arguments, 0 );
		return function ( defaultError, options ) {
			return options.userError || format.apply( null, [defaultError].concat( $.map( props, function ( value ) {
				return options[value];
			} ) ) );
		};
	}

	via.addValidator( [
		{
			name: "required",
			//when it is checked it is always true
			isValid: function () { return true;}
		},
		{
			name: "email",
			isValid: buildRegexFn( rEmail )
		},
		{
			name: "url",
			isValid: buildRegexFn( rUrl )
		},
		{
			name: "date",
			isValid: buildRegexFn( rInvalidDate, true )
		},
		{
			name: "dateISO",
			isValid: buildRegexFn( rDateISO )
		},
		{
			name: "number",
			isValid: buildRegexFn( rNumber )
		},
		{
			name: "digits",
			isValid: buildRegexFn( rDigit )

		},
		{
			name: "creditcard",
			isValid: function( value ) {
				if ( /[^0-9\-]+/.test( value ) ) {
					return false;
				}

				var nCheck = 0,
					nDigit = 0,
					bEven = false,
					cDigit;

				value = value.replace( /\D/g, "" );

				for ( var n = value.length - 1; n >= 0; n-- ) {
					cDigit = value.charAt( n );
					nDigit = parseInt( cDigit, 10 );
					if ( bEven ) {
						if ( (nDigit *= 2) > 9 ) {
							nDigit -= 9;
						}
					}
					nCheck += nDigit;
					bEven = !bEven;
				}

				return (nCheck % 10) === 0;
			}

		},
		{
			name:"minlength",
			isValid:  function ( value, options ) {

				return value.length >= options.minlength;

			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstToken.exec( options )) ) {
					return {
						minlength: +match[1],
						userError: match[3]
					};
				}

				throw "invalid options for minlength validator";
			},


			buildError: buildErrorFn( "minlength" )
		},
		{
			name: "maxlength",
			isValid: function ( value, options ) {

				return value.length <= options.maxlength;

			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstToken.exec( options )) ) {
					return {
						maxlength: +match[1],
						userError: match[3]
					};
				}

				throw "invalid options for maxlength validator";
			},
			buildError: buildErrorFn( "maxlength" )
		},
		{
			name: "rangelength",
			isValid: function ( value, options ) {

				return value.length >= options.minlength && value.length <= options.maxlength;

			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstTwoToken.exec( options )) ) {
					return {
						minlength: +match[1],
						maxlength: +match[2],
						userError: match[4]
					};
				}
				throw "invalid options for rangelength validator";
			},
			buildError: buildErrorFn( "minlength", "maxlength" )

		},
		{
			name: "min",
			isValid: function ( value, options ) {

				return value >= options.min;

			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstToken.exec( options )) ) {
					return {
						min: +match[1],
						userError: match[3]
					};
				}

				throw "invalid options for min validator";
			},
			buildError: buildErrorFn( "min" )

		},
		{
			name: "max",
			isValid: function ( value, options ) {

				return value <= options.max;

			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstToken.exec( options )) ) {
					return {
						max: +match[1],
						userError: match[3]
					};
				}
				throw "invalid options for max validator";
			},
			buildError: buildErrorFn( "max" )
		},

		{
			name: "range",
			isValid:  function ( value, options ) {

				return value >= options.min && value <= options.max;

			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstTwoToken.exec( options )) ) {
					return {
						min: +match[1],
						max: +match[2],
						userError: match[4]
					};
				}
				throw "invalid options for range validator";
			},
			buildError: buildErrorFn( "min", "max" )
		},
		{
			name: "equal",
			isValid: function ( value, options ) {
				return rootProxy.get( options.path ) === value;
			},
			buildOptions: function ( options ) {
				var match;
				if ( options && (match = rFirstToken.exec( options )) ) {

					return {
						path: match[1],
						userError: match[3]
					};
				}

				throw "invalid options for equal validator";
			}
		},
		{
			name: "regex",
			isValid:  function ( value, options ) {
				return options.regex.test( value );
			},
			buildOptions : function ( options ) {

				var match;

				if ( options && (match = rRegEx.exec( options )) ) {
					return {
						regex: eval( match[1] ),
						userError: match[5]
					};
				}
				throw "invalid options for regex validator";
			}
		}
	] );

	//ad-hoc validate a path
	via.validate = function ( path, validator, error ) {
		return isString( validator ) ?
			via.addModelHandler( path, "beforeUpdate", "*" + validator, error ) :
			via.addModelHandler( path, "beforeUpdate", buildValidationModelHandler( validator ) );
	};

	function isEmpty( value ) {
		return value === null || value === undefined || rEmpty.test( value );
	}

	via.modelCleanups.push( function ( path ) {
		invalidModelPathsProxy.removeItem( path );
	} );

	commonModelHandlers.inlineError = function ( modelEvent ) {
		if ( modelEvent.isModelEmpty() ) {
			$( this ).removeClass( "error" ).next( "span.error" ).remove();
		} else {
			$( this ).addClass( "error" ).next( "span.error" ).remove()
				.end().after( "<span class='error'>" + modelEvent.currentValue() + "</span>" );
		}
	};

	specialParsers.inlineError = function ( view, binding, handlers ) {
		handlers.mh.push( {
			path: binding.path + "*errors",
			modelEvents: "after*",
			view: view,
			modelHandler: "*inlineError"
		} );
	};

	//#merge
})( jQuery, via );
//#end_merge
