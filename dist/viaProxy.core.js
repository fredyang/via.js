/*!
 * viaProxy.js JavaScript Library 0.2pre
 * http://semanticsworks.com
 *
 * Copyright 2011, Fred Yang
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license
 * http://www.opensource.org/licenses/gpl-2.0
 *
 * Date: Sat Dec 17 08:00:40 2011 -0500
 */
 window.jQuery && window.via || (function( $, window, undefined ) {

	/**
	 * a wrapper over a Proxy constructor
	 */
	var via = window.via = function ( context ) {
		return new Proxy( context );
	},
		extend = $.extend,
		root = {},
		isArray = $.isArray,
		isPlainObject = $.isPlainObject,
		isFunction = $.isFunction,
		rObjectMember = /this\.((?:\.?\w+)+)/g,
		primitiveTypes = { 'undefined':undefined, 'boolean':undefined, 'number':undefined, 'string':undefined },
		ns = "__via",
		rShadowRootPath = /__via\.(\w+)/,
		rPhysicalPath = /__via\.(\w+)(\.(.+))*/,
		/*
		 {
		 "customer.firstName": [ "customer.fullName" ],
		 "customer.lastName": [ "customer.fullName" ]
		 }
		 * */
		modelReferences = {},
		defaultOptions = {},
		rootProxy,
		shadowRoot = root[ns] = {},
		rUnderScore = /_/g,
		rDot = /\./g,
		hasOwn = root.hasOwnProperty,
		arrayPrototype = Array.prototype,
		slice = arrayPrototype.slice,
		//to be override in 03-modelHandler
		raiseEvent;



	function Proxy( context ) {
		context = context || "";
		this.context = toPhysicalPath( context, true /*tryCreateShadow == true */ );
	}

	var proxyPrototype = Proxy.prototype = {};

	arrayPrototype.indexOf = arrayPrototype.indexOf || function ( obj, start ) {
		for ( var i = (start || 0); i < this.length; i++ ) {
			if ( this[i] == obj ) {
				return i;
			}
		}
		return -1;
	};

	arrayPrototype.contains = arrayPrototype.contains || function ( item ) {
		return (this.indexOf( item ) !== -1);
	};

	arrayPrototype.remove = arrayPrototype.remove || function ( item ) {
		var position = this.indexOf( item );
		if ( position != -1 ) {
			this.splice( position, 1 );
		}
		return this;
	};

	arrayPrototype.pushUnique = arrayPrototype.pushUnique || function ( item ) {
		if ( !this.contains( item ) ) {
			this.push( item );
		}
		return this;
	};

	arrayPrototype.sortObject = arrayPrototype.sortObject || function ( by, asc ) {
		asc = isUndefined( asc ) ? true : false;
		if ( by ) {
			this.sort( function ( a, b ) {
				var av = a[by];
				var bv = b[by];
				if ( av == bv ) {
					return 0;
				}
				return  asc ? (av > bv) ? 1 : -1 :
					(av > bv) ? -1 : 1;
			} );
		} else {
			asc ? this.sort() : this.sort().reverse();
		}
	};

	var stringPrototype = String.prototype;

	stringPrototype.beginsWith = stringPrototype.beginsWith || function ( text ) {
		return this.indexOf( text ) === 0;
	};

	stringPrototype.contains = stringPrototype.contains || function ( text ) {
		return this.indexOf( text ) !== -1;
	};

	function isObject( val ) {
		return typeof val === "object";
	}

	function isString( val ) {
		return typeof val === "string";
	}

	function isNumber( val ) {
		return typeof val === "number";
	}

	function isPrimitive( obj ) {
		return (obj === null ) || (typeof(obj) in primitiveTypes);
	}

	function isUndefined( obj ) {
		return (obj === undefined);
	}

	extend( proxyPrototype, {

		version: "0.2pre",

		constructor: Proxy,

		pushProxy: function ( newProxy ) {
			newProxy.oldProxy = this;
			return newProxy;
		},

		childProxy: function( childPath ) {
			return this.pushProxy( new Proxy( via.joinPath( this.context, childPath ) ) );
		},

		parentProxy: function () {
			return this.pushProxy( new via( via.contextOfPath( this.context ) ) );
		},

		popProxy: function() {
			if ( this.oldProxy ) {
				return this.oldProxy;
			}
			throw "invalid operation, proxy.popProxy() failed because oldProxy is empty";
		},

		shadowProxy: function () {
			return this.childProxy( "*" );
		},

		mainProxy: function () {
			var mainProxyContext;
			if ( this.context === ns ) {
				mainProxyContext = "";
			} else {
				var match = rShadowRootPath.exec( this.context );
				if ( match && match[1] ) {
					mainProxyContext = match[1].replace( rUnderScore, "." );
				} else {
					throw "proxy at '" + this.context + "' is already main proxy";
				}
			}
			return this.pushProxy( via( mainProxyContext ) );
		},

		triggerChange: function ( subPath ) {
			var physicalPath = this.physicalPath( subPath );

			raiseEvent( physicalPath, physicalPath, "afterUpdate" );
			return this;
		},

		//to get the logicalPath of current proxy, leave subPath empty
		logicalPath: function ( subPath ) {
			return toLogicalPath( via.joinPath( this.context, subPath ) );
		},

		//to get the physicalPath of current proxy, leave subPath empty
		physicalPath: function ( subPath ) {
			return toPhysicalPath( via.joinPath( this.context, subPath ) );
		},

		get: function( keepOriginal, subPath ) {
			if ( isString( keepOriginal ) || isNumber( keepOriginal ) ) {
				subPath = "" + keepOriginal;
				keepOriginal = false;
			}

			var accessor = getAccessor( this.context, subPath );
			var rtn = !accessor.index ?
				accessor.hostObj :
				accessor.hostObj[accessor.index];

			return  !keepOriginal && isFunction( rtn ) ?
				rtn.call( accessor.hostObj ) :
				//it is not entirely true to say that, there is no way to directly change model.
				//Since returning object is a reference. But you should avoid the tamper returning
				//object directly unless that is really what you want.
				rtn;
		},

		call: function ( subPath ) {

			var accessor = getAccessor( this.context, subPath );
			var fn = accessor.hostObj[accessor.index];
			if ( !isFunction( fn ) ) {
				throw "object at '" + accessor.logicalPath + "' is not a function";
			}

			return fn.apply( accessor.hostObj, slice.call( arguments, 1 ) );
		},

		create: function( subPath, value, accessor /* accessor is used internally */ ) {
			var rtn;
			if ( isPlainObject( subPath ) ) {
				for ( var key in subPath ) {
					if ( hasOwn.call( subPath, key ) ) {
						rtn = this.create( key, subPath[key], value );
						if ( !rtn ) {
							return false;
						}
					}
				}
				return this;
			}

			accessor = accessor || getAccessor( this.context, subPath );

			if ( accessor.index in accessor.hostObj ) {
				throw "value at path: '" + accessor.logicalPath + "' has been defined, " +
				      "try use update method instead";
			}

			var physicalPath = accessor.physicalPath;

			if ( raiseEvent( physicalPath, physicalPath, "beforeCreate", value ).hasError ) {
				return false;
			}

			accessor.hostObj[accessor.index] = value;

			raiseEvent( physicalPath, physicalPath, "afterCreate" );

			traverseModel( physicalPath, value, true, parseDepends );
			return this;
		},

		/* accessor is used internally */
		update: function( subPath, value, accessor ) {
			if ( this.context !== "" && arguments.length === 1 ) {
				//allow you update like via("a").update(a);
				return rootProxy.update( this.context, subPath );
			}

			accessor = accessor || getAccessor( this.context, subPath );

			if ( !( accessor.index in accessor.hostObj ) ) {
				throw "value at path: '" + accessor.logicalPath + "' has been not defined, " +
				      "try use create method instead";
			}

			var physicalPath = accessor.physicalPath;

			if ( raiseEvent( physicalPath, physicalPath, "beforeUpdate", value ).hasError ) {
				return false;
			}

			var removeValue = accessor.hostObj[accessor.index];
			if ( removeValue === value ) {
				return this;
			}

			accessor.hostObj[accessor.index] = value;

			raiseEvent( physicalPath, physicalPath, "afterUpdate", undefined, removeValue );

			traverseModel( physicalPath, value, true, parseDepends );
			return this;
		},

		del: function ( subPath, force ) {
			if ( subPath === undefined ) {
				return rootProxy.del( this.context );
			}

			var accessor = getAccessor( this.context, subPath );

			if ( !force && modelReferences[subPath] && modelReferences[subPath].length ) {
				throw "can not remove path " + subPath + ", because it is referenced!";
			}

			var physicalPath = accessor.physicalPath;

			if ( !force && raiseEvent( physicalPath, physicalPath, "beforeDel" ).hasError ) {
				return false;
			}
			var removedValue = accessor.hostObj[accessor.index];

			traverseModel( physicalPath, removedValue, false, removePath );

			if ( isArray( accessor.hostObj ) ) {

				accessor.hostObj.splice( accessor.index, 1 );

			} else {

				delete accessor.hostObj[accessor.index];

			}

			raiseEvent( physicalPath, physicalPath, "afterDel", undefined, removedValue );

			for ( var i = 0; i < via.modelCleanups.length; i++ ) {
				via.modelCleanups[i]( physicalPath );
			}

			return this;
		},

		createOrUpdate: function ( subPath, valueToSet ) {

			var accessor = getAccessor( this.context, subPath );
			return ( accessor.index in accessor.hostObj ) ?
				this.update( subPath, valueToSet, accessor ) :
				this.create( subPath, valueToSet, accessor );
		},

		createIfUndefined: function ( subPath, valueToSet ) {
			var accessor = getAccessor( this.context, subPath );
			return ( accessor.index in accessor.hostObj ) ?
				this :
				this.create( subPath, valueToSet, accessor );
		},

		updateAll: function ( pairs ) {
			var rtn;
			for ( var key in pairs ) {
				if ( hasOwn.call( pairs, key ) ) {
					rtn = this.update( key, pairs[key] );
					if ( !rtn ) {
						return false;
					}
				}
			}
			return this;
		},

		isModelEmpty : function ( keepOriginal, subPath ) {
			var value = this.get( keepOriginal, subPath );
			return !value ? true :
				!isArray( value ) ? false :
					(value.length === 0);
		},

		//the following are array methods
		indexOf: function ( item ) {
			return this.get().indexOf( item );
		},

		contains: function ( item ) {
			return (this.indexOf( item ) !== -1);
		},

		first: function () {
			return this.get( "0" );
		},

		last:function () {
			var value = this.get();
			return value[value.length - 1];
		},

		push: function ( item ) {
			return this.create( this.get().length, item );
		},

		pushRange: function ( items ) {
			for ( var i = 0; i < items.length; i++ ) {
				this.push( items[i] );
			}
			return this;
		},

		pushUnique: function ( item ) {
			return !this.contains( item ) ?
				this.push( item ) :
				this;
		},

		pop: function () {
			return this.removeAt( this.get().length - 1 );
		},

		insertAt: function ( index, item ) {
			this.get().splice( index, 0, item );
			raiseEvent( this.context, this.context + "." + index, "afterCreate" );
			return this;
		},

		updateAt: function ( index, item ) {
			return this.update( index, item );
		},

		removeAt: function ( index ) {
			return this.del( index );
		},

		prepend: function ( item ) {
			return this.insertAt( 0, item );
		},

		swap: function ( oldItem, newItem ) {
			if ( oldItem == newItem ) {
				return this;
			}

			var index = this.indexOf( oldItem );

			if ( index != -1 ) {
				return this.updateAt( index, newItem );
			}
			throw "oldItem not found";
		},

		removeItem: function( item ) {
			var index = this.indexOf( item );
			return index !== -1 ? this.removeAt( index ) : this;
		},

		clear: function () {
			var items = this.get();
			items.splice( 0, items.length );
			raiseEvent( this.context, this.context, "init" );
			return this;
		},

		count: function () {
			return this.get().length;
		},

		sort: function ( by, asc ) {
			return via.raiseEvent( this.context, this.context, "init", this.get().sortObject( by, asc ) );
		}
	} );

	function getAccessor( context, subPath ) {

		if ( subPath === 0 ) {
			subPath = "0";
		}

		var i,
			index,
			hostObj = root,
			logicalPath = via.joinPath( context, subPath ),
			physicalPath = toPhysicalPath( logicalPath, true ),
			parts = physicalPath.split( "." );

		if ( parts.length === 1 ) {

			index = physicalPath;

		} else {

			//index is the last part
			index = parts[parts.length - 1];

			//traverse to the second last node in the parts hierarchy
			for ( i = 0; i < parts.length - 1; i++ ) {
				hostObj = hostObj[parts[i]];
				if ( hostObj === undefined ) {
					break;
				}
			}
		}

		if ( isPrimitive( hostObj ) ) {
			throw "invalid access proxy using path:" + logicalPath;
		}

		return {
			physicalPath: physicalPath,
			logicalPath: logicalPath,
			hostObj: hostObj,
			index: index
		};
	}

	function Shadow( mainPath ) {
		this.mainPath = mainPath;
	}

	Shadow.prototype = {
		constructor: Shadow,
		mainModel: function () {
			return rootProxy.get( this.mainPath );
		}
	};

	//tryCreateShadow is for internal use, to create shadow if the path is like "path*"
	function toPhysicalPath( logicalPath, tryCreateShadow ) {

		if ( !logicalPath ) {
			return "";
		}

		if ( logicalPath === "*" ) {
			return ns;
		}

		var pathParts = logicalPath.split( "*" );

		if ( pathParts.length === 1 ) {
			return logicalPath; //this is the case of "a.b", no "*" inside
		}

		var mainPath = pathParts[0];
		var childPath = pathParts[1];
		//convert "a.b.c" to "a_b_c"
		var flatPhysicalMainPath = mainPath.replace( rDot, "_" );

		if ( tryCreateShadow && mainPath ) {

			var fullShadowPath = ns + "." + flatPhysicalMainPath;
			if ( !shadowRoot[flatPhysicalMainPath] && rootProxy.get( mainPath ) !== undefined ) {
				rootProxy.create( fullShadowPath, new Shadow( mainPath ) );
			}
		}

		return !flatPhysicalMainPath ?
			ns + "." + childPath : //this is the case of "*b"
			childPath ?
				ns + "." + flatPhysicalMainPath + "." + childPath : //this is the case of "a*b"
				ns + "." + flatPhysicalMainPath; //this is the case of "a*"
	}

	function toLogicalPath( physicalPath ) {
		if ( physicalPath === ns ) {
			return "*";
		}
		var match = rPhysicalPath.exec( physicalPath );
		return  match && match[1] ?
			match[2] ? match[1].replace( rUnderScore, "." ) + "*" + match[3] : match[1].replace( rUnderScore, "." ) + "*" :
			physicalPath;
	}

	//called when update and create model
	function traverseModel( path, model, processCurrent, fn ) {
		var context,
			index,
			lastDotPosition = path.lastIndexOf( "." );

		if ( processCurrent ) {

			if ( lastDotPosition === -1 ) {
				context = "";
				index = path;
			} else {
				context = path.substring( 0, lastDotPosition );
				index = path.substring( lastDotPosition + 1 );
			}

			fn( context, index, model );
		}

		if ( !isPrimitive( model ) ) {

			for ( index in model ) {

				//do not remove the hasOwnProperty check!!
				if ( hasOwn.call( model, index ) ) {
					fn( path, index, model[index] );
					traverseModel( path + "." + index, model[index], false, fn );
				}
			}
		}
	}

	//sub function of traverseModel
	function parseDepends( context, index, value ) {

		if ( !isFunction( value ) ) {
			return;
		}

		var functionBody = value.toString(),
			match,
			dependPath,
			referencingPath,
			referencedPath;

		while ( (match = rObjectMember.exec( functionBody )) && (dependPath = match[1]) ) {

			if ( context ) {
				referencingPath = context + "." + index;
				referencedPath = context + "." + dependPath;
			} else {
				referencingPath = index;
				referencedPath = dependPath;
			}

			modelReferences[referencedPath] = modelReferences[referencedPath] || [];
			modelReferences[referencedPath].pushUnique( referencingPath );
		}
	}

	function removePath( contextPath, index ) {
		rootProxy.del( contextPath + "." + index );
	}

	//helpers
	extend( via, {

		fn: proxyPrototype,

		joinPath: function ( context, subPath ) {
			return !subPath ? context :
				context ? context + (subPath.toString().beginsWith( "*" ) ? subPath : "." + subPath)
					: subPath;
		},

		accessor: getAccessor,

		physicalPath : toPhysicalPath,

		logicalPath : toLogicalPath,

		clearObj : function clearObj( obj ) {
			if ( isPrimitive( obj ) ) {
				return null;
			}
			for ( var key in obj ) {
				if ( hasOwn.call( obj, key ) ) {
					obj[key] = clearObj( obj[key] );
				}
			}
			return obj;
		},

		isUndefined: isUndefined,

		isPrimitive : isPrimitive,

		isString: isString,

		isObject: isObject,

		ns: function () {
			return ns;
		},

		Shadow: Shadow,

		//the is an array of cleanup functions to clean all resource
		//such as dependencies data, shadow object
		//when a path is deleted from repository
		modelCleanups: [function ( path ) {

			//remove reference that path is in referencing role
			for ( var referencedPath in modelReferences ) {

				modelReferences[referencedPath].remove( path );

				if ( modelReferences[referencedPath].length === 0 ) {
					delete modelReferences[referencedPath];
				}
			}

			//remove reference that path is in referenced role
			for ( var key in modelReferences ) {
				if ( key.beginsWith( path ) ) {
					delete modelReferences[key];
				}
			}

			//delete shadow object
			if ( !path.beginsWith( ns ) ) {
				rootProxy.del( ns + "." + path.replace( rDot, "_" ) );
			}

		}],

		//this is useful for adding dependency manually
		addRef: function ( referencingPath, referencedPath ) {
			referencingPath = toPhysicalPath( referencingPath );
			referencedPath = toPhysicalPath( referencedPath );
			modelReferences[referencedPath] = modelReferences[referencedPath] || [];
			modelReferences[referencedPath].pushUnique( referencingPath );
			return this;
		},

		//this is useful for removing dependency manually
		removeRef: function ( referencingPath, referencedPath ) {
			referencingPath = toPhysicalPath( referencingPath );
			referencedPath = toPhysicalPath( referencedPath );
			modelReferences[referencedPath].remove( referencingPath );
			if ( !modelReferences[referencedPath].length ) {
				delete modelReferences[referencedPath];
			}
			return this;
		},

		modelReferences: modelReferences,

		//use this for configure options
		options: function( name, value ) {
			if ( name === undefined ) {
				return defaultOptions;
			}

			if ( isObject( name ) ) {
				extend( defaultOptions, name );
				return name;
			}

			if ( arguments.length === 1 ) {

				return defaultOptions[name];

			} else if ( value === undefined ) {

				delete  defaultOptions[name];

			} else {
				return (defaultOptions[name] = value);
			}

		},

		//get the model except the shadow
		getAll: function () {
			var rtn = extend( {}, root );
			delete rtn[ns];
			return rtn;
		},

		//empty everything in the repository
		empty: function () {
			for ( var key in root ) {
				if ( key !== ns ) {
					rootProxy.del( key, true );
				}
			}
		}
	} );

	rootProxy = new Proxy( "" );




	var rStarSuffix = /(\w+)?(\*?)(\.?)([^\s]*)/,
		rParentKey = /^(.+)\.\w+$/,
		rIndex = /^.+\.(\w+)$|\w+/,
		dummyView = {},
		RegExp = window.RegExp,
		/*
		 {
		 "customer.firstName": [
		 {
		 view : htmlElement,
		 modelHandler: "text",
		 modelEvents: "*",
		 options: "options"
		 }
		 ]
		 }
		 this is used to raiseEvent for that path, and the raiseEvent normally
		 trigger a modelHandler, so the object is to manage model events triggering
		 */
		modelHandlerData = {},
		/*it is used to hold shared model handlers
		 * {
		 *   key: function (modelEvent) {
		 *       //"this" refer the view in context
		 *   }
		 *
		 * }
		 * */
		commonModelHandlers = {},
		rEventSeparator = /\s*\|\s*/,
		rNoExtension = /^\w+(?!\w*\.\w+)/,
		rEventTypeFirstPart = /^(\w+)\.?/,
		jQueryFn = $.fn;

	//override the raiseEvent defined in 01-core-proxy.js module
	raiseEvent = function ( path, target, eventType, proposed, removed ) {

		//notify change of itself
		var modelEvent = new ModelEvent( path, target, eventType, proposed, removed );

		//the modelEvent can be changed in the findAndInvokeModelHandlers call
		findAndInvokeModelHandlers( modelEvent );

		if ( modelEvent.continueEventing && modelEvent.bubbleUp ) {
			modelEvent.eventType = rEventTypeFirstPart.exec( modelEvent.eventType )[1] + ".child";
			bubbleUpModelEvent( modelEvent );
		}

		return modelEvent;
	};


	//filter out the model handlers and invoke it
	function findAndInvokeModelHandlers( modelEvent ) {

		var modelHandlerObj,
			i,
			modelHandlerObjects = modelHandlerData[modelEvent.path];

		if ( modelHandlerObjects ) {

			for ( i = 0; i < modelHandlerObjects.length; i++ ) {

				modelHandlerObj = modelHandlerObjects[i];

				if ( shouldUpdateView( modelHandlerObj.modelEvents, modelEvent.eventType ) ) {

					//important!!
					modelEvent.options = modelHandlerObj.options;

					//we use the same modelEvent passed from outside
					invokeModelHandler( modelHandlerObj.view, modelHandlerObj.modelHandler, modelEvent );
				}

				if ( !modelEvent.continueEventing ) {
					break;
				}
			}
		}

		//cascade the change to other part of the model
		var dependents = modelReferences[modelEvent.path];
		var tempModelEvent;
		if ( dependents && dependents.length ) {
			for ( var j = 0; j < dependents.length; j++ ) {

				//create new instance of modelEvent in raiseEvent
				//	raiseEvent = function ( path, target, eventType, proposed, removed, options ) {
				tempModelEvent = raiseEvent(
					dependents[j],
					dependents[j],
					modelEvent.eventType, (modelEvent.proposed === undefined) ? undefined : rootProxy.get( true, dependents[j] )
				);

				if ( !tempModelEvent.continueEventing ) {
					break;
				}

				if ( tempModelEvent.hasError ) {
					modelEvent.hasError = true;
				}
			}
		}
	}

	//execute the true model handler
	//this function does not return anything, the result is carried in side in modelEvent
	function invokeModelHandler( view, modelHandler, modelEvent ) {

		if ( view === dummyView ) {
			view = null;
		}

		if ( isFunction( modelHandler ) ) {

			return modelHandler.call( view, modelEvent );

		} else if ( isString( modelHandler ) ) {
			var key1 = modelHandler.substring( 1 ),
				key2 = modelHandler.substring( 2 ),
				currentValue;

			if ( modelHandler.beginsWith( "*" ) ) {

				var commonModelHandler = commonModelHandlers[key1];

				if ( commonModelHandler ) {

					return commonModelHandler.call( view, modelEvent );

				}

			} else if ( modelHandler.beginsWith( "$" ) ) {

				if ( isFunction( jQueryFn[key1] ) ) {

					currentValue = modelEvent.currentValue();
					if ( "css,attr,prop".contains( key1 ) ) {

						var propName = modelEvent.options || modelEvent.targetIndex();
						$( view )[key1]( propName, currentValue );

					} else {

						$( view )[key1]( currentValue && currentValue.toString() );
					}
					return;
				}

			} else if ( modelHandler.beginsWith( "v." ) ) {

				if ( view[key2] ) {

					currentValue = modelEvent.currentValue();

					if ( isFunction( view[key2] ) ) {

						view[key2]( currentValue );

					} else {

						view[key2] = currentValue;

					}

					return;
				}
			}

		}
		throw "handler: " + modelHandler + " not found";
	}

	function bubbleUpModelEvent( modelEvent ) {
		var parentPath;

		while ( (parentPath = via.contextOfPath( modelEvent.path ) ) || true ) {
			//only change the path
			modelEvent.path = parentPath;
			findAndInvokeModelHandlers( modelEvent );

			//continueEventing has priority over bubbleUp
			if ( ( !modelEvent.continueEventing || !modelEvent.bubbleUp ) || parentPath === "" ) {
				break;
			}
		}
	}

	function shouldUpdateView( subscribedEvents, event ) {
		var regex;
		if ( subscribedEvents === "*" ) {
			return true;
		}

		subscribedEvents = subscribedEvents.split( rEventSeparator );

		for ( var i = 0; i < subscribedEvents.length; i ++ ) {

			var subscribeEvent = subscribedEvents[i];

			if ( subscribeEvent === event ) {
				return true;
			}

			//  /(\w+)?\*(\.(\w+))?/
			var match = rStarSuffix.exec( subscribeEvent );

			if ( match ) {
				if ( match[4] ) {
					if ( match[1] ) {
						//before*.parent
						if ( RegExp( "^" + match[1] + "\\w*\\." + match[4] ).test( event ) ) {
							return true;
						}
					} else {
						//*.parent
						if ( RegExp( "^\\w+\\." + match[4] ).test( event ) ) {
							return true;
						}
					}
				} else {

					if ( match[3] ) {
						//before*.
						// it only match beforeUpdate but not beforeUpdate.parent
						if ( match[1] ) {
							//before*. match beforeUpdate but not beforeUpdate.child
							regex = RegExp( "^" + match[1] + "(?!\\w*\\.\\w+)" );
						} else {
							//*.  match beforeUpdate but not beforeUpdate.child
							regex = rNoExtension;
						}
						if ( regex.test( event ) ) {
							return true;
						}
					} else {
						//before*
						if ( event.beginsWith( match[1] ) ) {
							return true;
						}
					}
				}
			}
		}

		return false;
	}

	//it support two overload
	//ModelEvent(event)
	//ModelEvent( path, target, eventType, proposed, removed, options);
	//normally, the modelEvent is like
	//	{
	//	    path: "", //always available
	//		target: "", //always available
	//		eventType: "beforeUpdate", //always available
	//		proposed: "", //available in beforeUpdate beforeAdd
	//		removed: "" //available in afterUpdate or afterDel,
	//	};
	function ModelEvent( currentPath, targetPath, eventType, proposed, removed ) {

		if ( isObject( currentPath ) ) {
			extend( this, currentPath );
		} else {
			this.path = currentPath;
			this.target = targetPath;
			this.eventType = eventType;
			!isUndefined( proposed ) && (this.proposed = proposed);
			!isUndefined( removed ) && (this.removed = removed);
		}
		// this.options  always set in findAndInvokeModelHandlers
	}

	ModelEvent.prototype = {

		constructor: ModelEvent,

		targetProxy: function () {
			return via( this.target );
		},

		//target is always where the actual update happens
		targetValue: function ( keepOriginal ) {
			return via().get( keepOriginal, this.target );
		},

		targetContext: function () {
			return via.contextOfPath( this.target );
		},

		targetIndex: function () {
			return via.indexOfPath( this.target );
		},

		//determine whether the event will be bubbled up to parent
		bubbleUp: true,

		//determine whether the event will be propagated to other
		//area of the model system, it include parent, and horizontal reference
		continueEventing: true,

		//this is useful for validation
		hasError: false,

		//value is the value of current path,
		// in most of the case you should use this,
		//because you path can be dependent of change of other path
		currentValue: function ( keepOriginal ) {
			return via().get( keepOriginal, this.path );
		},

		currentProxy: function () {
			return via( this.path );
		},

		isModelEmpty: function () {

			var options = this.options;

			if ( !options ) {
				options = false;
			} else if ( isString( options ) ) {
				options = (options === "true");
			} else {
				options = !!options;
			}

			return this.currentProxy().isModelEmpty( options );
		}
	};

	function buildModelHandlerOptions(view, modelHandler, options ) {

		if ( isString( modelHandler ) && modelHandler.beginsWith( "*" ) ) {

			modelHandler = commonModelHandlers[modelHandler.substring( 1 )];

		}

		if ( isFunction( modelHandler.buildOptions ) ) {

			options = modelHandler.buildOptions.call(view, options );
		}
		return options;
	}

	//this is for the use of isView function
	function markAsView( elem ) {
		$( elem ).data( ns, true );
	}

	markAsView( dummyView );

	//this is to make removeModelHandler and getModelHandlerData function
	//runs faster by Short-circuit
	function isView( elem ) {
		return $( elem ).data( ns ) === true;
	}

	extend( via, {

		//it support two overload
		//addModelHandler(path, modelEvents, modelHandler, options)
		//addModelHandler(path, modelEvents, views, modelHandler, options)
		//if modelEvent == "once" is equivalent to via.renderViews,
		//it is good for declarative purpose
		addModelHandler: function ( path, modelEvents, views, modelHandler, options ) {

			if ( modelEvents === "once" ) {
				return this.renderViews( path, views, modelHandler, options );
			}

			//parameter shifting
			//this is the case when views is missing like the following
			//addModelHandler(path, modelEvents, modelHandler, options)
			if ( isString( views ) || isFunction( views ) ) {
				options = modelHandler;
				modelHandler = views;
				views = dummyView;
			}

			//this means ignore options
			if ( options === "_" ) {
				options = undefined;
			}

			path = toPhysicalPath( path, true );
			views = $( views );
			//
			if ( views.length > 0 && !modelHandlerData[path] ) {
				modelHandlerData[path] = [];
			}

			views.each( function () {

				options = buildModelHandlerOptions(this, modelHandler, options );

				markAsView( this );
				modelHandlerData[path].push( {
					view: this,
					modelHandler: modelHandler,
					modelEvents: modelEvents,
					options: options
				} );

				if ( shouldUpdateView( modelEvents, "init" ) ) {
					//"this" refers to a view
					invokeModelHandler( this, modelHandler, new ModelEvent( {
						path: path,
						target: path,
						eventType: "init",
						options: options
					} ) );
				}
			} );
			return via;
		},

		//it support removeModelHandler(path), removeModelHandler(views)
		//normally you don't need to call it explicitly, it is called in removing view and removing model
		removeModelHandler: function( pathOrViews ) {

			if ( isString( pathOrViews ) ) {
				//it is a path
				var path = toPhysicalPath( pathOrViews );

				for ( var key in modelHandlerData ) {
					if ( key.beginsWith( path ) ) {
						delete modelHandlerData[key];
					}
				}

			} else if ( isObject( pathOrViews ) ) {
				//it is a view
				$( pathOrViews ).each( function ( index, view ) {

					if ( !isView( view ) ) {
						return;
					}

					for ( var path in modelHandlerData ) {

						var commonModelHandlers = modelHandlerData[path];

						for ( var i = commonModelHandlers.length - 1; i >= 0; i-- ) {
							if ( commonModelHandlers[i].view === view ) {
								commonModelHandlers.splice( i, 1 );
							}
						}

						if ( commonModelHandlers.length === 0 ) {
							delete modelHandlerData[path];
						}
					}
				} );

			}
			return via;
		},

		// help you to debug what is inside modelHandlerData, it supports
		// getModelHandlerData(),
		// getModelHandlerData(path),
		// getModelHandlerData(view)
		getModelHandlerData: function( pathOrView ) {

			if ( isString( pathOrView ) ) {
				//it is a path
				//delete a path
				return modelHandlerData[toPhysicalPath( pathOrView )];

			} else if ( isObject( pathOrView ) ) {
				//is a view
				if ( !isView( pathOrView ) ) {
					return;
				}

				var rtn = {};

				for ( var path in modelHandlerData ) {

					var commonModelHandlers = modelHandlerData[path];

					for ( var i = commonModelHandlers.length - 1; i >= 0; i-- ) {

						if ( commonModelHandlers[i].view === pathOrView ) {
							rtn[path] = rtn[path] || [];
							rtn[path].push( commonModelHandlers[i] );
						}
					}
				}
				return rtn;

			} else if ( ! pathOrView ) {

				return modelHandlerData;
			}
		},

		renderViews: function( path, views, modelHandler, options ) {
			path = toPhysicalPath( path, true );

			$( views ).each( function () {

				options = buildModelHandlerOptions(this, modelHandler, options );

				//"this" refers to a view
				invokeModelHandler( this, modelHandler, new ModelEvent( {
					path: path,
					target: path,
					eventType: "init",
					options: options
				} ) );
			} );
			return via;
		},

		ModelEvent : ModelEvent,

		//shared commonModelHandlers
		commonModelHandlers : commonModelHandlers,

		raiseEvent : raiseEvent,

		indexOfPath : function ( path ) {
			var match = rIndex.exec( path );
			return match[1] || match[0];
		},

		contextOfPath : function ( path ) {
			var match = rParentKey.exec( path );
			return match && match[1] || "";
		}

	} );

	via.modelCleanups.push( via.removeModelHandler );

	jQueryFn.addModelHandler = function ( modelPath, modelEvents, modelHandler, options ) {
		//"this" refers to the view, the jQuery object
		via.addModelHandler( modelPath, modelEvents, this, modelHandler, options );
		return this;
	};

	jQueryFn.renderViews = function ( path, modelHandler, options ) {
		//"this" refers to the view, the jQuery object
		via.renderViews( path, this, modelHandler, options );
		return this;
	};


/* depends: proxy.js, modelEvent.js, modelHandler.js */
/*depends */



	function unmarkView( elem ) {
		$( elem ).removeData( ns );
	}

	/* {
	 *   key: function (viewEvent) {
	 *      //this refer the the view
	 *   }
	 * }
	 * */
	var commonViewHandlers = {},

		/* convert stringValue to a typed value
		 * {
		 *   key: function (stringValue) {
		 *      return a typed value
		 *   }
		 * }
		 * */
		valueConverters = {},

		/* {
		 * "customer.firstName" : [elem1, elem2, view3]
		 * }
		 * it is used to record what path is the update target of the view's event
		 * when view is deleted, this entry can be used to unbind the event
		 * also path is deleted, this entry can also be used to unbind the event
		 * */
		viewHandlerData = {};

	function ViewEvent( path, options, jQueryEvent, triggerData ) {
		if ( isObject( path ) ) {
			extend( this, path );
		} else {
			this.path = path;
			this.options = options;
			this.e = jQueryEvent;
			this.triggerData = triggerData;
		}
	}

	ViewEvent.prototype = {

		constructor: ViewEvent,

		targetProxy: function () {
			return via( this.path );
		},

		targetValue: function( keepOriginal ) {
			return rootProxy.get( keepOriginal, this.path );
		},

		targetContext: function () {
			return via.contextOfPath( this.path );
		},

		targetIndex: function () {
			return via.indexOfPath( this.path );
		},

		updateModel: function ( value ) {
			return rootProxy.update( this.path, value );
		},

		returnFalse: function () {
			this.e.stopPropagation();
			this.e.preventDefault();
		},

		stopPropagation: function () {
			this.e.stopPropagation();
		},

		stopImmediatePropagation: function () {
			this.e.stopImmediatePropagation();
		}
	};

	extend( via, {

		//viewHandler(button1, "blur|click", "text", "customer.firstName");
		addViewHandler: function ( views, viewEvents, path, viewHandler, options ) {

			path = toPhysicalPath( path, true );

			var originalHandler = viewHandler;

			//this means ignore options
			if ( options === "_" ) {
				options = undefined;
			}

			if ( isString( viewHandler ) && viewHandler.beginsWith( "*" ) ) {

				viewHandler = commonViewHandlers[viewHandler.substring( 1 )];

			}

			if ( isFunction( viewHandler.buildOptions ) ) {

				options = viewHandler.buildOptions( views, options );
			}

			//this is viewHandler.initialize view is useful, when the view is does not
			//natively support the event.
			if ( isFunction( viewHandler.initialize ) ) {
				viewHandler.initialize( views );
			}

			$( views ).each( function () {

				markAsView( this );

				//if original viewEvents is "click,dblClick",
				//and it bind to path "firstName", it will convert to
				//click.__via.firstName,dblClick.__via.firstName, the reason is that
				//when path is deleted, the method removeViewHandler(pathOrView) need to unbind
				// event by a namespace, if firstName is deleted, we can unbind ".__via.firstName"
				viewEvents = $.map(

					viewEvents.split( rEventSeparator ),

					function ( originalEventName ) {
						return originalEventName + "." + ns + "." + path;
					}

				).toString();

				//bind an event with a namespace
				//pass the binding through event data
				//use logicalPath is for unbind event, so that you can
				//unbind a specific event that bind to a view, when
				//a model is deleted
				$( this ).bind(
					viewEvents,

					{
						viewHandler: viewHandler, //"text"
						path: path,    //customer.firstName
						options: options,
						originalHandler: originalHandler
					},

					masterViewHandler );

				viewHandlerData[path] = viewHandlerData[path] || [];
				viewHandlerData[path].pushUnique( this );

			} );

			return via;
		},

		removeViewHandler : function ( pathOrViews ) {

			//remove viewHandler by path
			if ( isString( pathOrViews ) ) {

				var path = toPhysicalPath( pathOrViews );

				$( viewHandlerData[path] ).unbind( "." + ns + "." + path );

				delete viewHandlerData[path];

				//remove viewHandler by view
			} else if ( isObject( pathOrViews ) ) {

				$( pathOrViews ).unbind( "." + ns );

				$( pathOrViews ).each( function () {

					for ( var path in viewHandlerData ) {
						viewHandlerData[path].remove( this );
					}

				} );
			}
			return via;
		},

		removeView : function ( deleteViews ) {

			$( deleteViews ).each( function ( index, view ) {

				if ( !isView( this ) ) {
					return;
				}

				via.removeModelHandler( view )
					.removeViewHandler( view );

				unmarkView( this );

			} );
			return via;
		},

		commonViewHandlers : commonViewHandlers,

		valueConverters: valueConverters,

		ViewEvent : ViewEvent,

		//getViewHandlerData(path) returns all the views that will update the model
		//getViewHandlerData(view) returns all the model that view will update
		//getViewHandlerData() returns viewHandlerData object
		getViewHandlerData: function ( pathOrView ) {
			if ( isString( pathOrView ) ) {
				//this is a path;
				return viewHandlerData[pathOrView];

			} else if ( isObject( pathOrView ) ) {
				if ( !isView( pathOrView ) ) {
					return;
				}

				var rtn = [];
				for ( var key in viewHandlerData ) {
					if ( hasOwn.call( viewHandlerData, key ) ) {
						if ( viewHandlerData[key].contains( pathOrView ) ) {
							rtn.push( key );
						}
					}
				}

				return rtn;

			} else if ( !pathOrView ) {
				return viewHandlerData;
			}
		},

		getHandlerData: function ( pathOrView ) {
			var modelData = via.getModelHandlerData( pathOrView );
			var viewData = via.getViewHandlerData( pathOrView );
			if ( isString( pathOrView ) ) {
				return {
					viewsToBeUpdated: modelData,
					viewsUpdatingMe: viewData
				};
			} else {
				return {
					modelsUpdatingMe: modelData,
					modelsToBeUpdated: viewData
				};
			}
		}
	} );

	via.modelCleanups.push( via.removeViewHandler );

	//a handler that handle all the view events that trigger a change of model
	//the e.data is defined when the masterViewHandler is bind to an view
	function masterViewHandler( e, triggerData ) {
		var eventData = e.data,
			options = eventData.options,
			viewEvent = new ViewEvent( eventData.path, options, e, triggerData ),
			viewHandler = eventData.viewHandler;


		if ( isFunction( viewHandler ) ) {

			return updateModel( viewEvent, viewHandler.call( this, viewEvent ) );

		} else if ( isString( viewHandler ) ) {

			var key1 = viewHandler.substring( 1 ),
				key2 = viewHandler.substring( 2 ),
				fn;

			//*xxx commonViewHandler
			if ( viewHandler.beginsWith( "*" ) ) {

				var commonViewHandler = commonViewHandlers[key1];
				if ( commonViewHandler ) {
					commonViewHandler.call( this, viewEvent );
					return;
				}

				//$xxx jQuery method
			} else if ( viewHandler.beginsWith( "$" ) ) {

				if ( isFunction( jQueryFn[key1] ) ) {

					return updateModel(
						viewEvent,
						( "css,attr,prop".contains( key1 ) ) ?
							$( this )[key1]( viewEvent.options || viewEvent.targetIndex() ) :
							$( this )[key1]()
					);
				}

				//p.xxx proxy method
			} else if ( viewHandler.beginsWith( "p." ) ) {

				if ( isFunction( proxyPrototype[key2] ) ) {
					//here execute the proxy method, "this" inside the function
					//does not refer to the view, but the the proxy itself
					viewEvent.targetProxy()[key2]( viewEvent );
					return;
				}

				//v.xxx view member
			} else if ( viewHandler.beginsWith( "v." ) ) {

				fn = this[key2];

				if ( isFunction( fn ) ) {
					return updateModel(
						viewEvent,
						fn.call( this, viewEvent )
					);
				}

				//m.xxx model member
			} else if ( viewHandler.beginsWith( "m." ) ) {

				fn = rootProxy.get( true, key2 );
				if ( isFunction( fn ) ) {
					return updateModel(
						viewEvent,
						fn.call( this, viewEvent )
					);
				}
			}
		}

		throw "view handler: '" + viewHandler + "' not found";
	}

	function updateModel( viewEvent, value ) {
		//if value is undefined, no need to update the model
		if ( value === undefined ) {
			return;
		}

		var options = viewEvent.options;
		if ( isString( options ) && options.beginsWith( "*" ) ) {
			var convert = valueConverters[options.substring( 1 )];
			if ( convert ) {
				value = convert( value );
			}
		}
		rootProxy.update( viewEvent.path, value );
	}

	var _cleanData = $.cleanData;

	$.cleanData = function ( elems ) {
		via.removeView( elems );
		_cleanData( elems );
	};

	via.forwardEvent = function ( fromEvent, toEvent, whenFn ) {

		var handler = function ( e ) {
			if ( whenFn( e ) ) {
				$( e.target ).trigger( extend( {}, e, {
					type: toEvent,
					currentTarget: e.target
				} ) );
			}
		};

		if ( $.event.special[toEvent] ) {
			throw "event '" + toEvent + "' has been defined";
		}

		$.event.special[toEvent] = {
			setup: function () {
				$( this ).bind( fromEvent, handler );
			},
			teardown: function () {
				$( this ).unbind( fromEvent, handler );
			}
		};

		return via;
	};

	function raiseViaEvent( e ) {

		var viaEventType = e.data,
			viaData = $( e.target ).data( "via" ),
			viaEventName = viaData && viaData.viewEvents && viaData.viewEvents[viaEventType];

		if ( viaEventName ) {
			$( e.target ).trigger( extend( {}, e, {
				type: viaEventType + "." + viaEventName,
				currentTarget: e.target
			} ) );
		}
	}

	//viaEvent is a special kind of view event, different from normal event like "click"
	//it is something like "action.delete", the "action" is 
	//via.addViewEvent("action", "click")
	via.addViaEvent = function ( viaEventType, originalEvent ) {
		$.event.special[viaEventType] = {
			setup: function () {
				//TODO: think again
				//make sure the handler is not double bound to the element
				//$( this ).unbind( originalEvent, raiseViewEvent );
				$( this ).bind( originalEvent, viaEventType, raiseViaEvent );
			},
			teardown: function () {
				$( this ).unbind( originalEvent, raiseViaEvent );
			}
		};
		return via;
	};

	jQueryFn.addViewHandler = function ( viewEvents, modelPath, viewHandler, options ) {
		via.addViewHandler( this, viewEvents, modelPath, viewHandler, options );
		return this;
	};



})( jQuery, window );