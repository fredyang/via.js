//
//<@depends>eventSubscription.js, modelProxy.js, declarative.js, template.js</@depends>
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
	var isUndefined = via.util.isUndefined;
	var subscribe = via.subscribe;
	var toTypedValue = via.util.toTypedValue;
	var mergeLogicalPath = via.mergeLogicalPath;
	var isPrimitive = via.util.isPrimitive;
	//#end_merge

	defaultOptions.errors = {
		defaultError: "Please enter a valid value"
	};

	var afterUpdateAndValidate = "afterUpdate validate",
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
		rFirstToken = /([^,]+)(,(.*))?/,
		rFirstTwoToken = /(\w+),(\w+)(,(.*))?/;

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

	function traverseModelNeedValidation ( path, process ) {

		//the following code try to trigger the "validate" event, so that the validator will
		// be called to check current value of the model
		//you can not call afterUpdate, because there might trigger other non-validator handler
		//that are attached to afterUpdate
		var allSubscriptions = via.subscriptions();
		var validatedPaths = {};

		for (var i = allSubscriptions.length - 1, subscription, publisherPath; i >= 0; i--) {

			subscription = allSubscriptions[i];
			var shouldRaiseValidationEvent = isString( (publisherPath = subscription.publisher) ) &&
			                                 !validatedPaths[publisherPath] &&
			                                 publisherPath.startsWith( path ) &&
			                                 subscription.eventTypes.contains( "validate" );

			if (shouldRaiseValidationEvent) {

				validatedPaths[publisherPath] = true;
				process( publisherPath );

			}
		}
	}

	function isModelRequired ( path ) {
		var subscriptionByModel = via( path ).subsFromOthers();// subscriptions.getByPublisher( path );
		for (var i = 0; i < subscriptionByModel.length; i++) {
			var subscription = subscriptionByModel[i];
			if (subscription.handler.get === via.handlers( "v_required" ).get) {
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

	function buildModelHandlerForValidation ( validator ) {

		var validationHandler = {

			get: function( e ) {
				//"this" refers to the handler
				//if it violate required rule, don't do further validation,
				//as we expect the required rule will capture it first.
				var isValid,
					violateRequiredRule,
					error = buildErrorMessage( validator, e.handler.options );

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

					isValid = validator.isValid( e.proposed, e.handler.options );
				}

				if (!isValid) {
					//do not add error when the "required" rule has been vilodated
					//and the current rule is is not "required" rule
					//add error when the current rule is the "required rule"
					//or when "required" rule is not violated
					if (!violateRequiredRule || validator.name === "required") {
						//e.error();
						e.publisher.addError( error );
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

					e.publisher.removeError( error );
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

		var handlerKey = "v_" + validatorName;
		via.handlers( handlerKey, buildModelHandlerForValidation( validator ) );

		//data-sub="`required:path" or data-sub="`required:path,options"
		viaClasses[validatorName] = "!afterUpdate validate:.|*" + handlerKey;

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
				return rootModel.get( options.comparePath ) === value;
			},
			initialize: function( publisher, subscriber, handler, options ) {
				var match;
				if (options && (match = rFirstToken.exec( options ))) {

					var comparePath = publisher.cd( match[1] ).path;
					handler.options = {
						comparePath: comparePath,
						error: match[3]
					};

					publisher.subscribe( comparePath, "afterUpdate", function( e ) {
						if (!this.isEmpty()) {
							trigger(
								this.path,
								this.path,
								"validate",
								this.get() //proposed value
							);
						}
					} );

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
			error: 'Please enter value "{0}"',
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

			subscribe( null, path, afterUpdateAndValidate, "*v_" + validator, options );

		} else if (isFunction( validator )) {

			subscribe( null, path, afterUpdateAndValidate, buildModelHandlerForValidation( {
				isValid: validator,
				error: options
			} ) );
		}
		return this;
	}

	function clearErrors ( path ) {
		var errorsModel = via( path + "*errors" );
		if (!errorsModel.isEmpty()) {
			errorsModel.clear();
			invalidPathesModel.removeItem( path );
		}
	}

	extend( viaFn, {

		/*
		 * 1. the objects in path "*pathsOfInvalidModels", it holds all the path of model which is in error
		 * 2. the object in path "model*errors", it holds all error message that is
		 * */
		isValid: function( subPath ) {

			var fullPath = this.fullPath( subPath ); // this.cd( subPath ).path;
			traverseModelNeedValidation( fullPath, function( publisherPath ) {
				trigger(
					publisherPath,
					publisherPath,
					"validate",
					rootModel.get( publisherPath ) //proposed value
				);
			} );

			//after validate fired, we can check the invalid paths count for the model,
			return hasInvalidSubPathOfModel( fullPath );
		},

		//via("x").check(validatorName, error)
		//example
		//via("x").check("number", "my error message")
		//
		//via("x").check(isValidFn, error)
		//example
		//via("x").check(function( value ) { return false; }, "my error message");
		check: function( validator, options ) {
			if (isObject( validator )) {
				var subPath,
					fullPath,
					validators,
					i,
					currentValidator,
					validatorSet = validator;

				for (subPath in validatorSet) {
					fullPath = this.fullPath( subPath );
					validators = validatorSet[subPath];
					for (i = 0; i < validators.length; i++) {
						currentValidator = validators[i];
						if (isString( currentValidator ) || isObject( currentValidator )) {
							checkModel( fullPath, currentValidator );
						} else if (isArray( currentValidator )) {
							checkModel( fullPath, currentValidator[0], currentValidator[1] );
						}
					}
				}
			} else {

				if (isFunction( validator ) || (isString( validator ) && validator.startsWith( "#" ))) {

					if (isString( validator )) {
						validator = this.helper( validator.substr( 1 ) );
					}

					subscribe( null, this.path, afterUpdateAndValidate, function( e ) {
						e.publisher.clearErrors();
						var errorMessage = validator( e.publisher.get() );
						if (isString( errorMessage )) {
							e.publisher.addError( errorMessage );
						}

						if (errorMessage === false) {
							e.publisher.addError( defaultOptions.errors.defaultError );
						}
					} );

				} else if (isString( validator )) {

					checkModel( this.path, validator, options );

				}

			}
			return this;
		},

		clearErrors: function( subPath ) {
			var fullPath = this.fullPath( subPath );
			clearErrors( fullPath );

			if (!isPrimitive( this.get( subPath ) )) {
				traverseModelNeedValidation( fullPath, clearErrors );
			}
		},

		addError: function( error ) {
			this.createIfUndefined( "*errors", [] )
				.cd( "*errors" )
				.pushUnique( error );

			invalidPathesModel.pushUnique( this.path );
			return this;

		},

		removeError: function( error ) {
			if (this.createIfUndefined( "*errors", [] )
				.cd( "*errors" )
				.removeItem( error ).isEmpty()) {

				invalidPathesModel.removeItem( this.path );
			}
			return this;
		}

	} );

	via.isValid = function( path ) {
		return rootModel.isValid( path );
	};

	function isEmptyString ( value ) {
		return value === null || value === undefined || rEmpty.test( value );
	}

	//when path is deleted, remove the invalidPathesModel
	via.onDisposing( function( path ) {
		invalidPathesModel.removeItem( path );
	} );

	via.handlers( {
		validate: function( e ) {
			if (!via.isValid( this.path )) {
				//because it is the first handler, e.stopImmediatePropagation will
				//stop process all other handler
				e.stopImmediatePropagation();
			}
		},

		//a model handler, you should use it with model model*showError
		// like !after*:*errors|*showError
		showError: function( e ) {
			//e.publisher points to "model*errors"
			if (e.publisher.isEmpty()) {

				this
					.removeClass( "error" )
					.next( "span.error" )
					.remove();

			} else {

				this
					.addClass( "error" )
					.next( "span.error" )
					.remove()
					.end()
					.after( "<span class='error'>" + e.publisher.get() + "</span>" );
			}
		}
	} );

	extend( customSubsProps, {

		check: function( elem, parseContext, subscriptions, options ) {
			if (!options) {
				throw "missing validator path";
			}
			if (!options.startsWith( "#" )) {
				options = "#" + options;
			}
			via( parseContext.ns ).check( options );
		},

		//add a click handler to element to validate
		validate: function( elem, parseContext /*, subscriptions, options*/ ) {
			//directly subscribe event instead of push entry into handlers,
			// so that it is the first subscriptions, and it will be evaluated first
			subscribe( parseContext.ns, elem, "click", "*validate" );
		},

		resetFormErrors: function( elem, parseContext, subscriptions, options ) {
			$( elem ).bind( "reset", function() {
				setTimeout( function() {
					$( elem ).find( ":input" ).trigger( "resetForm" );
					via( parseContext.ns ).clearErrors();
				}, 1 );
			} );
		}
	} );

	extend( viaClasses, {

		showError: "!after*:*errors|*showError",
		//data-sub="`validate:path" or data-sub="`validate", add a click handler
		//to a button so that on click will validate
		validate: "@validate:.",
		//don't use this : viaClasses.validate = "$click:.|*validate";
		//because it is not garantee to be the first click handler

		check: "@check:.",

		resetFormErrors: "@resetFormErrors:."

	} );

	//#merge
})( jQuery, via );
//#end_merge
