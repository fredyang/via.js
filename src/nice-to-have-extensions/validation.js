//
//<@depends>event.js, model.js, declarative.js, template.js</@depends>
//#merge
(function( $, via ) {
	//#end_merge

	//#merge
	var extend = $.extend;
	var defaultOptions = via.options;
	var shadowRoot = via( "*" ).get();
	var rootModel = via();
	var RegExp = window.RegExp;
	var isArray = $.isArray;
	var trigger = via.trigger;
	var isString = via.util.isString;
	var viaFn = via.fn;
	var isObject = via.util.isObject;
	var slice = [].slice;
	var customSubsProps = via.customSubsProps;
	var isFunction = $.isFunction;
	var viaClasses = via.classes;
	var isBoolean = via.util.isBoolean;
	var isUndefined = via.util.isUndefined;
	var subscribe = via.subscribe;
	var toTypedValue = via.util.toTypedValue;
	//#end_merge

	defaultOptions.errors = {};

	var beforeUpdateAndValidate = "beforeUpdate validate",
		pathsOfInvalidModels = shadowRoot.pathsOfInvalidModels = [],
		invalidPathesModel = via( "*pathsOfInvalidModels" ),
		rEmpty = /^\s*$/,
		rEmail = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		rUrl = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
		rDateISO = /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
		rNumber = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
		rDigit = /^\d+$/,
		rInvalidDate = /Invalid|NaN/,
		rRegEx = /^(\/(\\[^\x00-\x1f]|\[(\\[^\x00-\x1f]|[^\x00-\x1f\\\/])*\]|[^\x00-\x1f\\\/\[])+\/[gim]*)(,(.*))*$/,
		rFirstToken = /(\w+)(,(.*))?/,
		rFirstTwoToken = /(\w+),(\w+)(,(.*))?/;

	/*
	 * 1. the objects in path "*pathsOfInvalidModels", it holds all the path of model which is in error
	 * 2. the object in path "model*errors", it holds all error message that is
	 * 3. the object in path "model*isValid", it determine whether the model is valid
	 * */

	//check whether model's path or the path of model's children
	// is listed in pathsOfInvalidModels
	function hasInvalidSubPathOfModel ( modelPath ) {
		if (modelPath === "") {
			//root Model
			return !pathsOfInvalidModels.length;
		}
		var subPath = modelPath + ".";

		for (var i = 0, invalidPath, length = pathsOfInvalidModels.length; i < length; i++) {
			invalidPath = pathsOfInvalidModels[i];
			if (invalidPath == modelPath || invalidPath.startsWith( subPath )) {
				return false;
			}
		}
		return true;
	}

	//model*isValid store a boolean value indicating whether
	//the model is valid or not, it will be only created when it is manually checked
	function getOrCreateIsValidFlag ( modelPath ) {
		var isValidPathOfModel = modelPath + "*isValid";
		//isValid is undefined initially
		var isValid = via.get( isValidPathOfModel );
		if (isUndefined( isValid )) {
			//create model first, they will be updated, when "*pathsOfInvalidModels" is updated
			//"*pathsOfInvalidModels" is updated when during the beforeUpdate event fire
			rootModel.set( isValidPathOfModel, null );
			subscribe( modelPath, "*pathsOfInvalidModels", "after*", synchronizeIsValidWithInvalidPathCount );
		}
		return isValid;

	}

	function synchronizeIsValidWithInvalidPathCount ( e ) {
		via.set( e.subscriber.path + "*isValid", hasInvalidSubPathOfModel( e.subscriber.path ) );
	}

	viaFn.isValid = function( subPath ) {

		var fullPath = this.fullPath( subPath ); // this.cd( subPath ).path;
		//check whether validation has been performed before
		//if so, just shortcut the process by calling isValid function
		var isValid = getOrCreateIsValidFlag( fullPath );
		if (isBoolean( isValid )) {
			return isValid;
		}

		//the following code try to trigger the "validate" event, so that the validator will
		// be called to check current value of the model
		//you can not call beforeUpdate, because there might be other non-validator handler
		//that are attached to beforeUpdate
		var allSubscriptions = via.subscriptions();
		var validatedPaths = {};

		for (var i = allSubscriptions.length - 1, subscription, publisherPath; i >= 0; i--) {

			subscription = allSubscriptions[i];
			var shouldRaiseValidationEvent = isString( (publisherPath = subscription.publisher) ) &&
			                                 !validatedPaths[publisherPath] &&
			                                 publisherPath.startsWith( fullPath ) &&
			                                 subscription.eventTypes.contains( "validate" );

			if (shouldRaiseValidationEvent) {

				validatedPaths[publisherPath] = true;

				trigger(
					publisherPath,
					publisherPath,
					"validate",
					rootModel.get( publisherPath ) //proposed value
				);
			}
		}

		//after validate fired, we can check the invalid paths count for the model,
		return hasInvalidSubPathOfModel( fullPath );
	};

	via.isValid = function( path ) {
		return rootModel.isValid( path );
	};

	extend( via.Event.prototype, {

		//1. add the error message to the *error object
		//2. add the model path to *pathsOfInvalidModels
		addError: function( error ) {

			this.publisher.createIfUndefined( "*errors", [] )
				.cd( "*errors" )
				.pushUnique( error );

			invalidPathesModel.pushUnique( this.publisher.path );

		},

		//1. remove the error message to the *error object
		//2. remove the model path to *pathsOfInvalidModels if necessary
		removeError: function( error ) {

			if (this.publisher.createIfUndefined( "*errors", [] )
				.cd( "*errors" )
				.removeItem( error ).isEmpty()) {

				invalidPathesModel.removeItem( this.publisher.path );
			}
		}

	} );

	function isModelRequired ( path ) {
		var subscriptionByModel = via( path ).subsFromOthers();// subscriptions.getByPublisher( path );
		for (var i = 0; i < subscriptionByModel.length; i++) {
			var subscription = subscriptionByModel[i];
			if (subscription.handler.get === via.handlers( "required" ).get) {
				return true;
			}
		}
		return false;
	}

	//a helper function for you to write
	//format("hello {0}", "fred"} output "hello fred"
	function stringFormat ( source ) {

		//$.each("fred", function (index, value)
		$.each( slice.call( arguments, 1 ), function( index, value ) {
			source = source.replace( new RegExp( "\\{" + index + "\\}", "g" ), value );
		} );
		return source;
	}

	//#debug
	via.debug.stringFormat = stringFormat;
	//#end_debug

	function buildErrorMessage ( validator, options ) {

		//named validator normally has a defautlError
		var defaultError = validator.name && defaultOptions.errors[validator.name];

		//if validator has buildError function, this take the highest priority
		if (validator.buildError) {

			//return userError || format.apply( null, [defaultError].concat( options.minlength ) );
			return validator.buildError( defaultError, options );

			//if defaultError is format string,
		} else {

			//userError is normally passed in options of each instance
			var userError = isObject( options ) ? options.error : options;

			if (defaultError && defaultError.contains( "{0}" )) {

				return stringFormat.apply( null, [defaultError].concat( userError.split( "," ) ) );

			} else {

				return userError || defaultError || validator.error;
			}
		}
	}

	function buildValidationHandler ( validator ) {

		var validationHandler = {
			get: function( e ) {
				//"this" refers to the handler
				//if it violate required rule, don't do further validation,
				//as we expect the required rule will capture it first.
				var isValid,
					violateRequiredRule,
					error = buildErrorMessage( validator, this.options );

				//if model is empty, only check the "require" validator
				//If it is required, then it is invalid, no further validation is checked
				//if it is not required, it is valid, no further validation is checked
				if (isEmptyString( e.proposed )) {

					if (!isModelRequired( e.publisher.path )) {
						isValid = true;
					} else {
						isValid = false;
						violateRequiredRule = true;
					}

				} else {

					isValid = validator.isValid( e.proposed, this.options );
				}

				if (!isValid) {
					//do not add error when the "required" rule has been vilodated
					//and the current rule is is not "required" rule
					//add error when the current rule is the "required rule"
					//or when "required" rule is not violated
					if (!violateRequiredRule || validator.name === "required") {
						e.error();
						e.addError( error );
					}

					//this is equivalent the following
					/*
					 if (validator.name === "required") {
					 // if current validator's name is required
					 // then add the error
					 if (violateRequiredRule) {
					 e.addError( error );
					 }
					 } else {
					 // if the current validator's name is not "required"
					 if (violateRequiredRule) {
					 //this is the tricky part
					 //don't add error!!, we want to by pass other error
					 // if "required" rule is not met
					 } else {
					 e.addError( error );
					 }
					 }
					 */

				} else {

					e.removeError( error );
				}

			}
		};

		//transfer validator's init to model handler
		if (validator.initialize) {
			validationHandler.initialize = validator.initialize;
			delete validator.initialize;
		}
		return validationHandler;
	}

	//this method is to create a common model handler using the name of common validator
	//and also add a class rule using the name of validator
	//so make sure the name of validator did not collide with common model handler
	//and special rule
	//
	//using a validator object
	//a validator is object like
	//{
	//  name: "validatorName",
	//  error: "error message"
	//  isValid: function( value, options ); /* options let user to help the isValid to work better */
	//  initialize: function(options); //allow user convert string value of modelEvent.options to the options passed in isValid function
	//  buildError: function(defaultMessage, options )
	//}
	via.validators = function( validator ) {

		if (isArray( validator )) {
			for (var i = 0; i < validator.length; i++) {
				via.validators( validator[i] );
			}
			return this;
		}

		var validatorName = validator.name;

		if (customSubsProps[validatorName]) {
			throw "validator name '" + validatorName + "' collide with name in via.rules";
		}

		if (via.handlers( validatorName )) {
			throw "validator name '" + validatorName + "' collide with name in via.handlers";
		}

		//add default error if applicable
		//user can localize errors message
		if (validator.error) {
			defaultOptions.errors[validatorName] = validator.error;
		}

		via.handlers( validatorName, buildValidationHandler( validator ) );

		//data-sub="`required:path" or data-sub="`required:path,options"
		viaClasses[validatorName] = "!beforeUpdate validate:.|*" + validatorName;

	};

	function buildRegexFn ( ex, reverse ) {
		return reverse ? function( value ) {
			return !ex.test( value );
		} : function( value ) {
			return ex.test( value );
		};
	}

	//	return function ( defaultError, options ) {
	//  return options.userError || format( defaultError, options.minlength ) ;
	//}
	function createBuildErrorFn ( /*options' propertyNames, like minLength, maxLength*/ ) {

		//return validator.buildError( defaultError, options );
		var props = slice.call( arguments, 0 );

		return function( defaultError, options ) {
			//for example, the validator rangelength
			//its validation has minLength, and maxLength
			//they are in options.minLength, and maxLength
			//Please enter a value between {0} and {1} characters long.
			//it convert to the following calls
			//stringFormat(defaultError, options.minLength, options.maxLength)
			return options.error ||
			       stringFormat.apply( null,
				       [defaultError].concat( $.map( props, function( value ) {
					       return options[value];
				       } ) ) );
		};
	}

	//validator.isValid( value, options );
	via.validators( [
		{
			name: "required",
			error: "This field is required.",
			//when it is checked it is always true
			isValid: function() { return true;}
		},
		{
			name: "email",
			error: "Please enter a valid email address.",
			isValid: buildRegexFn( rEmail )
		},
		{
			name: "url",
			error: "Please enter a valid URL.",
			isValid: buildRegexFn( rUrl )
		},
		{
			name: "date",
			error: "Please enter a valid date.",
			isValid: buildRegexFn( rInvalidDate, true )
		},
		{
			name: "dateISO",
			error: "Please enter a valid date (ISO).",
			isValid: buildRegexFn( rDateISO )
		},
		{
			name: "number",
			error: "Please enter a valid number.",
			isValid: buildRegexFn( rNumber )
		},
		{
			name: "digits",
			error: "Please enter only digits.",
			isValid: buildRegexFn( rDigit )

		},
		{
			name: "creditcard",
			error: "Please enter a valid credit card number.",
			isValid: function( value ) {
				if (/[^0-9\-]+/.test( value )) {
					return false;
				}

				var nCheck = 0,
					nDigit = 0,
					bEven = false,
					cDigit;

				value = value.replace( /\D/g, "" );

				for (var n = value.length - 1; n >= 0; n--) {
					cDigit = value.charAt( n );
					nDigit = parseInt( cDigit, 10 );
					if (bEven) {
						if ((nDigit *= 2) > 9) {
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
			name: "minlength",
			error: "Please enter at least {0} characters.",
			isValid: function( value, options ) {

				return value.length >= options.minlength;

			},
			initialize: function( publisher, subscriber, handler, options ) {
				//options should be like "16,you must be over {0} years old"
				var match;
				if (options && (match = rFirstToken.exec( options ))) {

					handler.options = {
						minlength: +match[1],
						error: match[3]
					};
				} else {
					throw "invalid options for minlength validator";
				}
			},

			buildError: createBuildErrorFn( "minlength" )
		},
		{
			name: "maxlength",
			error: "Please enter no more than {0} characters.",
			isValid: function( value, options ) {

				return value.length <= options.maxlength;

			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstToken.exec( options ))) {
					handler.options = {
						maxlength: +match[1],
						error: match[3]
					};
				} else {
					throw "invalid options for maxlength validator";
				}
			},
			buildError: createBuildErrorFn( "maxlength" )
		},
		{
			name: "rangelength",
			error: "Please enter a value between {0} and {1} characters long.",
			isValid: function( value, options ) {

				return value.length >= options.minlength &&
				       value.length <= options.maxlength;

			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstTwoToken.exec( options ))) {
					handler.options = {
						minlength: +match[1],
						maxlength: +match[2],
						error: match[4]
					};
				} else {
					throw "invalid options for rangelength validator";
				}
			},
			buildError: createBuildErrorFn( "minlength", "maxlength" )

		},
		{
			name: "min",
			error: "Please enter a value greater than or equal to {0}.",
			isValid: function( value, options ) {

				return value >= options.min;

			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstToken.exec( options ))) {
					handler.options = {
						min: +match[1],
						error: match[3]
					};
				} else {
					throw "invalid options for min validator";
				}

			},
			buildError: createBuildErrorFn( "min" )
		},
		{
			name: "max",
			error: "Please enter a value less than or equal to {0}.",
			isValid: function( value, options ) {

				return value <= options.max;

			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstToken.exec( options ))) {
					handler.options = {
						max: +match[1],
						error: match[3]
					};
				} else {
					throw "invalid options for max validator";
				}
			},
			buildError: createBuildErrorFn( "max" )
		},
		{
			name: "range",
			error: "Please enter a value between {0} and {1}.",
			isValid: function( value, options ) {

				return value >= options.min && value <= options.max;

			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstTwoToken.exec( options ))) {
					handler.options = {
						min: +match[1],
						max: +match[2],
						error: match[4]
					};
				} else {
					throw "invalid options for range validator";
				}
			},
			buildError: createBuildErrorFn( "min", "max" )
		},
		{
			name: "equal",
			error: "Please enter the same value again.",
			isValid: function( value, options ) {
				return rootModel.get( options.path ) === value;
			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstToken.exec( options ))) {

					handler.options = {
						path: match[1],
						error: match[3]
					};
				} else {
					throw "invalid options for equal validator";
				}
			}
		},
		{
			name: "regex",
			error: "Please enter a value match with required pattern.",
			isValid: function( value, options ) {
				return options.regex.test( value );
			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;

				if (options && (match = rRegEx.exec( options ))) {
					handler.options = {
						regex: eval( match[1] ),
						error: match[5]
					};
				} else {
					throw "invalid options for regex validator";
				}
			}
		},
		{
			name: "fixedValue",
			error: "Please enter a value {0}",
			isValid: function( value, options ) {
				return value == options.fixedValue;
			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (isString( options )) {
					match = /^(\w+)(,(.*))*$/.exec( options );
					if (match) {
						handler.options = {
							fixedValue: toTypedValue( match[1] ),
							error: match[3]
						};
					}
				} else if (isObject( options )) {
					handler.options = options;
				} else {
					throw "missing options in fixedValue validator";
				}
			},
			buildError: createBuildErrorFn( "fixedValue" )
		}
	] );

	function checkModel ( path, validator, options ) {
		if (isString( validator )) {
			subscribe( null, path, beforeUpdateAndValidate, "*" + validator, options );
		} else if (isFunction( validator )) {
			subscribe( null, path, beforeUpdateAndValidate, buildValidationHandler( {
				isValid: validator,
				error: options
			} ) );
		}
		return this;
	}

	//via("x").check(validatorName, error)
	//example
	//via("x").check("number", "my error message")
	//or
	//via("x").check(isValidFn, error)
	//example
	//via("x").check(function( value ) { return false; }, "my error message");
	viaFn.check = function( validator, options ) {
		checkModel( this.path, validator, options );
		return this;
	};

	viaFn.checkAll = function( validatorSet ) {
		var subPath, fullPath, validators, i, validator;
		for (subPath in validatorSet) {
			fullPath = this.fullPath( subPath );
			validators = validatorSet[subPath];
			for (i = 0; i < validators.length; i++) {
				validator = validators[i];
				if (isString( validator ) || isObject( validator )) {
					checkModel( fullPath, validator );
				} else if (isArray( validator )) {
					checkModel( fullPath, validator[0], validator[1] );
				}
			}
		}
		return this;
	};

	function isEmptyString ( value ) {
		return value === null || value === undefined || rEmpty.test( value );
	}

	//when path is deleted, remove the invalidPathesModel
	via.onDisposing( function( path ) {
		invalidPathesModel.removeItem( path );
	} );

	//add a click handler to element to validate
	customSubsProps.validate = function( elem, parseContext ) {
		//directly subscribe event instead of push entry into handlers,
		// so that it is the first subscriptions, and it will be evaluated first
		subscribe( parseContext.ns, elem, "click", "*validate" );
		getOrCreateIsValidFlag( parseContext.ns );
	};

	via.handlers( "validate", function( e ) {
		if (!via.isValid( e.subscriber.path )) {
			e.stopImmediatePropagation();
		}
	} );

	//a model handler, you should use it with model model*showError
	// like !after*:*errors|*showError
	via.handlers( "showError", function( e ) {
		//e.publisher points to "model*errors"
		if (e.publisher.isEmpty()) {

			e.subscriber
				.removeClass( "error" )
				.next( "span.error" )
				.remove();

		} else {

			e.subscriber
				.addClass( "error" )
				.next( "span.error" )
				.remove()
				.end()
				.after( "<span class='error'>" + e.publisher.get() + "</span>" );
		}
	} );

	viaClasses.showError = "!after*:*errors|*showError";
	//data-sub="`validate:path" or data-sub="`validate", add a click handler
	//to a button so that on click will validate
	viaClasses.validate = "@validate";

	//#merge
})( jQuery, via );
//#end_merge
