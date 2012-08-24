 /*!
  * via.js JavaScript Library v0.2pre
  * © Fred Yang - http://semanticsworks.com
  * License: MIT (http://www.opensource.org/licenses/mit-license.php)
  *
  * Date: Fri Aug 24 00:55:09 2012 -0400
  */
(function( $, window, undefined ) {

	/**
	 * a wrapper over a Subscribable constructor,
	 * [value] is optional
	 */
	var via = window.via = function( path, value ) {
		return new Proxy( path, value );
	},
		Proxy = function( path, value ) {
			path = path || "";
			this.path = toPhysicalPath( path, true /* create shadow if necessary */ );
			if (!isUndefined( value )) {
				this.set( value );
			}
		},
		viaFn,
		extend = $.extend,
		repository = {},
		isArray = $.isArray,
		isFunction = $.isFunction,
		primitiveTypes = { 'undefined': undefined, 'boolean': undefined, 'number': undefined, 'string': undefined },
		shadowNamespace = "__via",
		rShadowKey = /^__via\.([^\.]+?)(?:\.|$)/,
		//try to match xxx in string this.get("xxx")
		rWatchedPath = /this\.(?:get|cd)\s*\(\s*(['"])([\*\.\w]+)\1\s*\)/g,

		//key is publisher
		//value is array of subscribers
		//{publisher:[subscriber,subscriber2]}
		modelLinks = {},
		defaultOptions = {},
		rootModel,
		shadowRoot = repository[shadowNamespace] = {},
		hasOwn = repository.hasOwnProperty,
		Array = window.Array,
		arrayPrototype = Array.prototype,
		stringPrototype = String.prototype,
		slice = arrayPrototype.slice,
		//to be override in 03-modelHandler
		trigger,
		beforeUpdate = "beforeUpdate",
		afterUpdate = "afterUpdate",
		beforeCreate = "beforeCreate",
		afterCreate = "afterCreate",
		rJSON = /^(?:\{.*\}|\[.*\])$/,
		rUseParseContextAsContext = /^\.(\.*)([\.\*])/,
		rBeginDotOrStar = /^[\.\*]/,
		rDotStar = /[\.\*]/,
		rHashOrDot = /#+|\./g,
		rHash = /#+/g,
		RegExp = window.RegExp,
		rParentKey = /^(.+)[\.\*]\w+$/,
		mergeLogicalPath,
		rIndex = /^.+\.(\w+)$|\w+/,
		util,
		isUndefined,
		isPrimitive,
		isString,
		isObject,
		isBoolean,
		isPromise,
		toTypedValue,
		toPhysicalPath,
		toLogicalPath,
		clearObj,
		clone;

	//#debug
	//if you are using debug version of the library
	//you can use debugging facilities provided here
	//they are also used in unit test to test some internal variable which is
	//not exposed in production version
	//In debug version, you can turn on logging by setting via.debug.enableLog = true
	//and turn on debugger by setting via.debug.enableDebugger = true
	//
	//In production version, there is no logging or debugger facilities
	via.debug = {};
	via.debug.enableLog = true;
	via.debug.enableDebugger = false;

	window.log = window.log || function() {
		if (via.debug.enableLog && this.console) {
			console.log( Array.prototype.slice.call( arguments ) );
		}
	};
	//#end_debug


	function augment ( prototype, extension ) {
		for (var key in extension) {
			if (!prototype[key]) {
				prototype[key] = extension[key];
			}
		}
	}

	augment( arrayPrototype, {
		indexOf: function( obj, start ) {
			for (var i = (start || 0); i < this.length; i++) {
				if (this[i] == obj) {
					return i;
				}
			}
			return -1;
		},

		contains: function( item ) {
			return (this.indexOf( item ) !== -1);
		},

		remove: function( item ) {
			var position = this.indexOf( item );
			if (position != -1) {
				this.splice( position, 1 );
			}
			return this;
		},

		removeAt: function( index ) {
			this.splice( index, 1 );
			return this;
		},

		pushUnique: function( item ) {
			if (!this.contains( item )) {
				this.push( item );
			}
			return this;
		},

		merge: function( items ) {
			if (items && items.length) {
				for (var i = 0; i < items.length; i++) {
					this.pushUnique( items[i] );
				}
			}
			return this;
		},
		sortObject: function( by, asc ) {
			if (isUndefined( asc )) {
				asc = true;
			}
			if (by) {
				this.sort( function( a, b ) {
					var av = a[by];
					var bv = b[by];
					if (av == bv) {
						return 0;
					}
					return  asc ? (av > bv) ? 1 : -1 :
						(av > bv) ? -1 : 1;
				} );
			} else {
				asc ? this.sort() : this.sort().reverse();
			}
		}
	} );

	augment( stringPrototype, {
		startsWith: function( text ) {
			return this.indexOf( text ) === 0;
		},
		contains: function( text ) {
			return this.indexOf( text ) !== -1;
		},
		endsWith: function( text ) {
			return this.lastIndexOf( text ) === this.length - text.length;
		}
	} );

	viaFn = Proxy.prototype = via.fn = via.prototype = {

		constructor: Proxy,

		//get()
		//get(true)
		//
		//subPath can be null, undefined, "", or "any string"
		//get(subPath)
		//get(subPath, p1, p2)
		//
		//does not support the following, as will be implemented as get((subPath = p1), p2)
		//get(p1, p2)
		get: function( subPath /*, p1, p2, .. for parameters of model functions*/ ) {

			var accessor = this.accessor( subPath, true );
			if (accessor) {
				var currentValue = !accessor.index ?
					accessor.hostObj :
					accessor.hostObj[accessor.index];

				if (isFunction( currentValue )) {

					return currentValue.apply( this.cd( subPath ).cd( ".." ), slice.call( arguments, 1 ) );

				} else {
					return currentValue;
				}
			}
		},

		helper: function( subPath, fn ) {
			var accessor;
			if (isFunction( subPath )) {
				fn = subPath;
				subPath = "";
			}
			if (!fn) {
				accessor = this.accessor( subPath, true );
				if (accessor) {
					return !accessor.index ?
						accessor.hostObj :
						accessor.hostObj[accessor.index];
				}
			} else {
				accessor = this.accessor( subPath );
				return ( accessor.index in accessor.hostObj ) ?
					this.update( subPath, fn, accessor ) :
					this.create( subPath, fn, accessor );
			}

		},

		//you must call with two arguments
		//if you want to update the current node of the proxy
		//use set(null, value)
		set: function( subPath, value ) {
			//allow set(path, undefined)
			if (arguments.length == 1) {
				if (this.path == "") {
					throw "root object can not changed";
				} else {
					rootModel.set( this.path, subPath );
					return this;
				}
			}

			var accessor = this.accessor( subPath );
			var currentValue = accessor.hostObj[accessor.index];

			if (isFunction( currentValue )) {

				if (currentValue.length) {
					//inside the function, "this" refer the parent proxy of path accessor.physicalPath
					return currentValue.apply( via( accessor.physicalPath ).cd( ".." ), slice.call( arguments, 1 ) );

				} else {

					//need to guard unwanted access via get(), which will passed in undefined
					throw "Function at " + accessor.logicalPath + " is not a setter method";
				}

			} else {

				return ( accessor.index in accessor.hostObj ) ?
					this.update( subPath, value, accessor ) :
					this.create( subPath, value, accessor );

			}
		},

		accessor: function( subPath, readOnly /*internal use only*/ ) {
			//if it is not readOnly, and access out of boundary, it will throw exception
			if (subPath === 0) {
				subPath = "0";
			}

			var i,
				index,
				hostObj = repository,
				logicalPath = this.fullPath( subPath ),
				physicalPath = toPhysicalPath( logicalPath, true /*create shadow if necessary*/ ),
				parts = physicalPath.split( "." );

			if (parts.length === 1) {

				index = physicalPath;

			} else {

				//index is the last part
				index = parts[parts.length - 1];

				//traverse to the second last node in the parts hierarchy
				for (i = 0; i < parts.length - 1; i++) {
					hostObj = hostObj[parts[i]];
					if (hostObj === undefined) {
						break;
					}
				}
			}

			if (isPrimitive( hostObj )) {
				if (readOnly) {
					return;
				}
				else {
					throw "invalid access model using path:" + logicalPath;
				}
			}

			return {
				physicalPath: physicalPath,
				logicalPath: logicalPath,
				hostObj: hostObj,
				index: index
			};
		},

		create: function( subPath, value, accessor /* accessor is used internally */ ) {

			accessor = accessor || this.accessor( subPath );

			if (accessor.index in accessor.hostObj) {
				throw "value at path: '" + accessor.logicalPath + "' has been defined, " +
				      "try use update method instead";
			}

			var physicalPath = accessor.physicalPath;

			if (trigger( physicalPath, physicalPath, beforeCreate, value ).hasError()) {
				return false;
			}

			accessor.hostObj[accessor.index] = value;

			trigger( physicalPath, physicalPath, afterCreate );

			traverseModel( physicalPath, value, extractWatchedPath );
			return this;
		},

		extend: function( subPath, object ) {
			var newModel;
			if (!object) {
				object = subPath;
				newModel = this;
			} else {
				newModel = this.cd( subPath );
			}
			for (var key in object) {
				newModel.set( key, object[key] );
			}
			return this;
		},

		/* accessor is used internally */
		//update(value)
		//update(subPath, value)
		//most of the time force is not used, by default is it is false
		//by in case you want to bypass validation you can explicitly set to true
		update: function( force, subPath, value, accessor ) {
			if (!isBoolean( force )) {
				accessor = value;
				value = subPath;
				subPath = force;
				force = false;
			}

			accessor = accessor || this.accessor( subPath );

			if (!( accessor.index in accessor.hostObj )) {
				throw "value at path: '" + accessor.logicalPath + "' has been not defined, " +
				      "try use create method instead";
			}

			var physicalPath = accessor.physicalPath;

			if (!force && trigger( physicalPath, physicalPath, beforeUpdate, value ).hasError()) {
				return false;
			}

			var originalValue = accessor.hostObj[accessor.index];
			if (originalValue === value) {
				return this;
			}

			accessor.hostObj[accessor.index] = value;

			trigger( physicalPath, physicalPath, afterUpdate, value, originalValue );

			traverseModel( physicalPath, value, extractWatchedPath );
			return this;
		},

		del: function( subPath ) {
			if (subPath === undefined) {
				if (this.path) {
					return rootModel.del( this.path );
				}
				return this;
			}

			var accessor = this.accessor( subPath );

			var physicalPath = accessor.physicalPath;

			//			if (!force && trigger( physicalPath, physicalPath, "beforeDel" ).hasError()) {
			if (trigger( physicalPath, physicalPath, "beforeDel" ).hasError()) {
				return false;
			}

			for (var i = 0; i < disposingModelCallbacks.length; i++) {
				disposingModelCallbacks[i]( physicalPath, accessor.logicalPath );
			}

			var removedValue = accessor.hostObj[accessor.index];

			if (isArray( accessor.hostObj )) {

				accessor.hostObj.splice( accessor.index, 1 );

			} else {

				delete accessor.hostObj[accessor.index];

			}

			trigger( physicalPath, physicalPath, "afterDel", undefined, removedValue );
			return this;
		},

		createIfUndefined: function( subPath, value ) {
			var accessor = this.accessor( subPath );
			return ( accessor.index in accessor.hostObj ) ?
				this :
				this.create( subPath, value, accessor );
		},

		//navigation methods
		pushStack: function( newModel ) {
			newModel.previous = this;
			return newModel;
		},

		cd: function( relativePath ) {
			return this.pushStack( via( this.fullPath( relativePath ) ) );
		},

		parentModel: function() {
			return this.cd( ".." );
		},

		shadowModel: function() {
			return this.cd( "*" );
		},

		siblingModel: function( path ) {
			return this.cd( ".." + path );
		},

		mainModel: function() {

			return this.pushStack( via( getMainPathFromShadow( this.path ) ) );
		},

		triggerChange: function( subPath ) {
			var physicalPath = this.physicalPath( subPath );
			trigger( physicalPath, physicalPath, afterUpdate );
			return this;
		},

		//path methods
		fullPath: function( subPath ) {
			//join the context and subPath together, but it is still a logical path
			return mergeLogicalPath( this.path, subPath );
		},

		//to get the logicalPath of current model, leave subPath empty
		logicalPath: function( subPath ) {
			return toLogicalPath( this.fullPath( subPath ) );
		},

		//to get the physicalPath of current model, leave subPath empty
		physicalPath: function( subPath ) {
			return toPhysicalPath( this.fullPath( subPath ) );
		},

		contextPath: function() {
			return contextOfPath( this.path );
		},

		indexPath: function() {
			return indexOfPath( this.path );
		},

		//array methods
		indexOf: function( item ) {
			return this.get().indexOf( item );
		},

		contains: function( item ) {
			return (this.indexOf( item ) !== -1);
		},

		first: function( fn ) {
			return fn ? this.filter( fn )[0] : this.get( "0" );
		},

		last: function() {
			var value = this.get();
			return value[value.length - 1];
		},

		push: function( item ) {
			return this.create( this.get().length, item );
		},

		pushRange: function( items ) {
			for (var i = 0; i < items.length; i++) {
				this.push( items[i] );
			}
			return this;
		},

		pushUnique: function( item ) {
			return !this.contains( item ) ?
				this.push( item ) :
				this;
		},

		pop: function() {
			return this.removeAt( this.get().length - 1 );
		},

		insertAt: function( index, item ) {
			this.get().splice( index, 0, item );
			trigger( this.path, this.path + "." + index, afterCreate );
			return this;
		},

		updateAt: function( index, item ) {
			return this.update( index, item );
		},

		removeAt: function( index ) {
			this.del( index );
			alignModelLinks( this.path, index );
			return this;
		},

		prepend: function( item ) {
			return this.insertAt( 0, item );
		},

		updateItem: function( oldItem, newItem ) {
			if (oldItem == newItem) {
				return this;
			}

			var index = this.indexOf( oldItem );

			if (index != -1) {
				return this.updateAt( index, newItem );
			}
			throw "oldItem not found";
		},

		removeItem: function( item ) {
			var index = this.indexOf( item );
			return index !== -1 ? this.removeAt( index ) : this;
		},

		removeItems: function( items ) {
			for (var i = 0; i < items.length; i++) {
				this.removeItem( items[i] );
			}
			return this;
		},

		clear: function() {
			var items = this.get();
			items.splice( 0, items.length );
			trigger( this.path, this.path, "create" );
			return this;
		},

		count: function() {
			return this.get().length;
		},

		filter: function( fn ) {
			return $( this.get() ).filter( fn ).get();
		},

		each: function( directAccess, fn ) {
			if (!isBoolean( directAccess )) {
				fn = directAccess;
				directAccess = false;
			}

			var hasChange, i, status, items;

			if (directAccess) {

				items = this.get();

				for (i = items.length - 1; i >= 0; i--) {
					//this in the fn refer to the parent array
					status = fn( i, items[i], items );
					if (status === true) {
						hasChange = true;
					} else if (status === false) {
						break;
					}
				}

				if (hasChange) {
					this.triggerChange();
				}

			} else {
				for (i = this.count() - 1; i >= 0; i--) {
					//this in the fn, refer to the parent model
					if (fn( i, this.cd( i ), this ) === false) {
						break;
					}
				}
			}
		},

		sort: function( by, asc ) {
			return trigger( this.path, this.path, "afterUpdate", this.get().sortObject( by, asc ) );
		},

		isEmpty: function( subPath ) {
			var value = this.get( subPath );
			return !value ? true :
				!isArray( value ) ? false :
					(value.length === 0);
		},

		isShadow: function() {
			return this.path.startsWith( shadowNamespace );
		},

		watchPath: function( watchedPath ) {
			watchPath( this.path, watchedPath );
			return this;
		},

		unwatchPath: function( watchedPath ) {
			unwatchPath( this.path, watchedPath );
			return this;
		},

		pathsWatching: function() {
			var key, links, rtn = [], path = this.path;
			for (key in modelLinks) {
				links = modelLinks[key];
				if (links.contains( path )) {
					rtn.push( key );
				}
			}
			return rtn;
		},

		pathsOfWatchers: function( deep ) {
			var rtn = modelLinks[this.path] || [];
			if (deep) {
				for (var i = 0; i < rtn.length; i++) {
					rtn.merge( via( rtn[i] ).pathsOfWatchers( deep ) );
				}
			}
			return rtn;
		}
	};

	function expandToHashes ( $0 ) {
		return $0 === "." ? "#" : //if it is "." convert to "#"
			Array( $0.length + 2 ).join( "#" ); ////if it is "#" convert to "##"
	}

	function getMainPathFromShadow ( shadowPath ) {
		if (shadowPath === shadowNamespace) {
			return "";
		}
		var match = rShadowKey.exec( shadowPath );
		return match ? convertShadowKeyToMainPath( match[1] ) : shadowPath;
	}

	function convertShadowKeyToMainPath ( key ) {
		return key.replace( rHash, reduceToDot );
	}

	function reduceToDot ( hashes ) {
		return hashes == "#" ? "." : // if is # return .
			Array( hashes.length ).join( "#" ); // if it is ## return #
	}

	/* processCurrent is used internally, don't use it */
	function traverseModel ( modelPath, modelValue, process, processCurrent ) {
		var context,
			index,
			indexOfLastDot = modelPath.lastIndexOf( "." );

		if (isUndefined( processCurrent )) {
			processCurrent = true;
		}

		if (processCurrent) {

			if (indexOfLastDot === -1) {
				context = "";
				index = modelPath;
			} else {
				context = modelPath.substring( 0, indexOfLastDot );
				index = modelPath.substring( indexOfLastDot + 1 );
			}

			process( context, index, modelValue );
		}

		if (!isPrimitive( modelValue )) {

			for (index in modelValue) {

				//do not remove the hasOwnProperty check!!
				//if (hasOwn.call( modelValue, index )) {
				process( modelPath, index, modelValue[index] );
				traverseModel( modelPath + "." + index, modelValue[index], process, false );
				//}
			}
		}
	}

	//sub function of traverseModel
	function extractWatchedPath ( context, index, value ) {

		//only try to parse function body
		//if it is a parameterless function
		//or it has a magic function name "no_watch"
		if (!isFunction( value ) || value.name == "no_watch") {
			return;
		}

		var functionBody = value.toString(),
			path = context ? context + "." + index : index,
			watchedPaths = parseWatchedPaths( functionBody );

		for (var i = 0; i < watchedPaths.length; i++) {
			watchPath( path, context ? mergeLogicalPath( context, watchedPaths[i] ) : watchedPaths[i] );
		}
	}

	function watchPath ( path, watchedPath ) {
		watchedPath = toPhysicalPath( watchedPath );
		modelLinks[watchedPath] = modelLinks[watchedPath] || [];
		modelLinks[watchedPath].pushUnique( path );
	}

	function unwatchPath ( path, watchedPath ) {
		watchedPath = toPhysicalPath( watchedPath );
		modelLinks[watchedPath].remove( path );
		if (!modelLinks[watchedPath].length) {
			delete modelLinks[watchedPath];
		}
	}

	function parseWatchedPaths ( functionBody ) {
		var memberMatch,
			rtn = [];

		while ((memberMatch = rWatchedPath.exec( functionBody ) )) {
			rtn.pushUnique( memberMatch[2] );
		}
		return rtn;
	}

	function contextOfPath ( path ) {
		var match = rParentKey.exec( path );
		return match && match[1] || "";
	}

	function indexOfPath ( path ) {
		var match = rIndex.exec( path );
		return match[1] || match[0];
	}

	var disposingModelCallbacks = [function /*removeModelLinksAndShadows*/ ( physicalPath, logicalPath ) {

		var watchedPath;

		//remove modelLinks whose publisherPath == physicalPath
		for (watchedPath in modelLinks) {
			unwatchPath( physicalPath, watchedPath );
		}

		//remove modelLinks whose subscriber == physicalPath
		for (watchedPath in modelLinks) {
			if (watchedPath.startsWith( physicalPath )) {
				delete modelLinks[watchedPath];
			}
		}

		//delete shadow objects,
		// which are under the direct shadow of main path
		for (var mainPath in shadowRoot) {

			var physicalPathOfShadow = shadowNamespace + "." + mainPath,
				logicalShadowPath = toLogicalPath( physicalPathOfShadow );

			if (logicalShadowPath == logicalPath ||
			    logicalShadowPath.startsWith( logicalPath + "*" ) ||
			    logicalShadowPath.startsWith( logicalPath + "." )) {
				rootModel.del( physicalPathOfShadow );
			}
		}
	}];

	//helpers
	extend( via, {

		util: util = {

			factory: function( Constructor, prototype ) {
				var F;
				if (isFunction( Constructor )) {
					F = eval( "(function " + Constructor.name + " () {})" );

				} else {
					F = function() {};
					prototype = Constructor;
					Constructor = null;
				}

				extend( F.prototype, prototype );

				return function() {
					var f = new F();
					if (Constructor) {
						Constructor.apply( f, arguments );
					}
					return f;
				};
			},

			//user do not need to use createShadowIfNecessary parameter
			//it is for internal use
			//it is only used in two places. It is, when a model is created
			// and when accessor is build,
			// even in these two case when the parameter is true,
			// shadow is not neccessary created
			// it is only created when
			// the the physical path is pointing to a shadow
			// and the main model has been created
			// and the shadow's parent is an object
			toPhysicalPath: toPhysicalPath = function( logicalPath, createShadowIfNecessary /* internal use*/ ) {

				var match, rtn = "", leftContext = "", mainValue, shadowKey, mainPath;
				//logicalPath = toLogicalPath(logicalPath);

				while ((match = rDotStar.exec( logicalPath ))) {
					//reset logical Path to the remaining of the search text
					logicalPath = RegExp.rightContext;
					leftContext = RegExp.leftContext;

					if (match[0] == ".") {

						if (rtn) {
							//mainPath = rtn + "." + leftContext
							if (rtn == shadowNamespace && createShadowIfNecessary && !shadowRoot[leftContext]) {
								mainPath = convertShadowKeyToMainPath( leftContext );
								if (!isUndefined( rootModel.get( mainPath ) )) {
									shadowRoot[leftContext] = {};
								}
								//!isUndefined( rootModel.get( mainPath ) )
								/*	if (createShadowIfNecessary &&
								 !shadowRoot[shadowKey] &&
								 rtn != shadowNamespace &&
								 !isUndefined( mainValue = rootModel.get( mainPath ) )) {
								 */
							}
							rtn = rtn + "." + leftContext;
							//shadowRoot[shadowKey]
							//if (rtn ==)
						} else {
							rtn = leftContext;
						}

					} else {

						//if match is "*", then it is shadow
						//if rtn is not empty so far
						if (rtn) {
							//shadowKey will be
							//convertMainPathToShadowKey
							shadowKey = ( rtn ? rtn.replace( rHashOrDot, expandToHashes ) : rtn) + "#" + leftContext;
							mainPath = rtn + "." + leftContext;
						} else {
							if (leftContext) {
								shadowKey = leftContext;
								mainPath = leftContext;

							} else {

								shadowKey = "";
								mainPath = "";
							}
						}

						rtn = shadowNamespace + (shadowKey ? "." + shadowKey : "");

						//only when main model exists , and host of the object exists
						//then create shadow
						if (createShadowIfNecessary &&
						    !shadowRoot[shadowKey] &&
						    rtn != shadowNamespace &&
						    !isUndefined( mainValue = rootModel.get( mainPath ) )) {

							shadowRoot[shadowKey] = {};
						}
					}
				}

				return !logicalPath ? rtn :
					rtn ? rtn + "." + logicalPath :
						logicalPath;
			},
			toLogicalPath: toLogicalPath = function( physicalPath ) {

				var index, logicalPath, mainPath, match;

				if (physicalPath === shadowNamespace) {
					return "*";
				}

				match = rShadowKey.exec( physicalPath );
				if (match) {
					// if physical path is like __via.key.x
					// convert the key path into mainPath
					index = RegExp.rightContext;
					mainPath = convertShadowKeyToMainPath( match[1] );
					logicalPath = mainPath + "*" + index;
					return toLogicalPath( logicalPath );

				} else {

					return physicalPath;
				}

			},
			isUndefined: isUndefined = function( obj ) {
				return (obj === undefined);
			},
			isPrimitive: isPrimitive = function( obj ) {
				return (obj === null ) || (typeof(obj) in primitiveTypes);
			},
			isString: isString = function( val ) {
				return typeof val === "string";
			},
			isObject: isObject = function( val ) {
				return $.type( val ) === "object";
			},
			isBoolean: isBoolean = function( object ) {
				return typeof object === "boolean";
			},
			toTypedValue: toTypedValue = function( stringValue ) {
				if (isString( stringValue )) {
					stringValue = $.trim( stringValue );
					try {
						stringValue = stringValue === "true" ? true :
							stringValue === "false" ? false :
								stringValue === "null" ? null :
									stringValue === "undefined" ? undefined :
										$.isNumeric( stringValue ) ? parseFloat( stringValue ) :
											//Date.parse( stringValue ) ? new Date( stringValue ) :
											rJSON.test( stringValue ) ? $.parseJSON( stringValue ) :
												stringValue;
					} catch (e) {}
				}
				return stringValue;
			},
			isPromise: isPromise = function( object ) {
				return !!(object && object.promise && object.done && object.fail);
			},
			clearObj: clearObj = function( obj ) {
				if (isPrimitive( obj )) {
					return null;
				}
				for (var key in obj) {
					if (hasOwn.call( obj, key )) {
						obj[key] = clearObj( obj[key] );
					}
				}
				return obj;
			},
			clone: clone = function( original, deepClone ) {
				return isPrimitive( original ) ? original :
					isArray( original ) ? original.slice( 0 ) :
						extend( !!deepClone, {}, original );
			},

			local: function( key, value ) {
				if (arguments.length == 1) {
					return toTypedValue( localStorage.getItem( key ) );
				} else {
					if (isUndefined( value )) {
						localStorage.removeItem( key );
					} else {
						localStorage.setItem( key, JSON.stringify( value ) );
					}
				}
			}
		},

		//add a callback function which will be run in
		//when a path is deleted
		// callback: function(physicalPath, logicalPath ) {}
		onDisposing: function( callback ) {
			disposingModelCallbacks.push( callback );
		},

		//use this for configure options
		options: defaultOptions,

		/*join the context and subPath together, but it is still a logical path*/
		/*convertSubPathToRelativePath by default is true, so that if you spedify subPath as "b"
		 * and  context is "a", it will be merged to "a.b" . If explicitly specify
		 * converttSubPathToRelativePath to false, they will not be merged, so the "b" will be
		 * returned as merge path*/
		mergeLogicalPath: mergeLogicalPath = function( context, subPath, convertSubPathToRelativePath
		                                               /*used internally*/ ) {

			if (!isUndefined( subPath )) {
				subPath = subPath + "";
				if (subPath.startsWith( "/" )) {
					return subPath.substr( 1 );
				}
			}
			if (isUndefined( convertSubPathToRelativePath )) {
				convertSubPathToRelativePath = true;
			}

			if (convertSubPathToRelativePath && subPath && context && !rBeginDotOrStar.test( subPath )) {
				subPath = "." + subPath;
			}

			if (!subPath || subPath == ".") {

				return context;

			} else if (!rBeginDotOrStar.test( subPath )) {

				return subPath;

			} else if (rUseParseContextAsContext.test( subPath )) {
				//if subPath is like ..xyz or .*xyz
				var match = rUseParseContextAsContext.exec( subPath ),
					stepsToGoUp = 1 + (match[1] ? match[1].length : 0),
					remaining = RegExp.rightContext,
					mergedContext = context;

				while (stepsToGoUp) {
					mergedContext = contextOfPath( mergedContext );
					stepsToGoUp--;
				}

				//use rule's context as context
				//.. or .*
				//$2 is either "." or "*"
				return remaining ? mergedContext + match[2] + remaining :
					match[2] === "*" ? mergedContext + "*" :
						mergedContext;

				//if subPath is like .ab or *ab
			}
			return context + subPath;
		}
	} );

	function alignModelLinks ( parentPath, deletedRowIndex ) {

		var oldItemPathToReplace;

		var temp = "(" + parentPath.replace( ".", "\\." ) + "\\.)(\\d+)|" +
		           "(" + parentPath.replace( ".", "#+" ) + "#+)(\\d+)";

		oldItemPathToReplace = new RegExp( temp, "g" );

		for (var key in modelLinks) {
			if (hasOwn.call( modelLinks, key )) {

				var paths = modelLinks[key];
				var newKey = key.replace( oldItemPathToReplace, indexReplacer );

				if (newKey !== key) {
					modelLinks[newKey] = paths;
					delete modelLinks[key];
				}

				for (var i = 0; i < paths.length; i++) {
					var oldPath = paths[i];
					var newPath = oldPath.replace( oldItemPathToReplace, indexReplacer );
					if (newPath != oldPath) {
						paths[i] = newPath;
					}
				}
			}
		}
	}

	function indexReplacer ( match, $1, $2, $3, $4 ) {
		if ($1) {
			return $1 + ($2 - 1);
		} else {
			return $3 + ($4 - 1);
		}
	}

	$( "get,set,del,extend".split( "," ) ).each( function( index, value ) {
		via[value] = function() {
			return rootModel[value].apply( rootModel, slice.call( arguments ) );
		};
	} );

	rootModel = via();



//<@depends>model.js</@depends>



	var dummy = {},
		handlerObjStore,
		rEventSeparator = / /,
		rEndWithStarDot = /\*\.$/,
		rDotOrStar = /\.|\*/g,
		rEventTypeFirstPart = /^(\w+)\.?/,
		getters,
		setters,
		converters,
		initializers,
		disposers,
		finalizers,
		$fn = $.fn,
		accessSubs,
		viewId = 0,
		subscriptionStore = [ ],
		subscribe,
		unsubscribe,
		rInit = /init(\d*)/,
		standardFilterKeys = "get,set,convert,initialize,finalize,dispose".split( "," );

	function returnFalse () {
		return false;
	}

	function returnTrue () {
		return true;
	}

	function Event ( publisher, originalPublisher, eventType, proposed, removed ) {
		this.publisher = tryWrapPublisherSubscriber( publisher );
		this.originalPublisher = tryWrapPublisherSubscriber( originalPublisher );
		this.type = eventType;
		this.proposed = proposed;
		this.removed = removed;
	}

	Event.prototype = {
		consturctor: Event,

		/*	isOriginal: function() {
		 return this.publisher.path == this.originalPublisher.path;
		 },

		 isBubbleUp: function() {
		 return (this.publisher.path != this.originalPublisher.path) &&
		 (this.publisher.path.startsWith( this.originalPublisher.path ));
		 },*/
		isDependent: function() {
			return (!this.publisher.path.startsWith( this.originalPublisher.path ));
		},

		stopPropagation: function() {
			this.isPropagationStopped = returnTrue;
		},

		stopImmediatePropagation: function() {
			this.isImmediatePropagationStopped = returnTrue;
			this.isPropagationStopped = returnTrue;
			this.isCascadeStopped = returnTrue;
		},

		stopCascade: function() {
			this.isCascadeStopped = returnTrue;
		},

		error: function() {
			this.hasError = returnTrue;
		},

		isCascadeStopped: returnFalse,
		isPropagationStopped: returnFalse,
		isImmediatePropagationStopped: returnFalse,
		hasError: returnFalse,
		level: 0
	};

	// raise model event,
	trigger = function( publisherPath, originalPublisherPath, eventType, proposed, removed ) {

		var e = new Event( publisherPath, originalPublisherPath, eventType, proposed, removed );

		//event can be changed inside the function
		findAndInvokeModelHandlers( e );

		if (!e.isPropagationStopped() && e.publisher.path) {

			if (e.isDependent()) {
				//if is dependent event, the original event has been
				// bubbled up in its direct hierarchy
				//we need to change the hierarchy by setting the target
				e.originalPublisher.path = e.publisher.path;
			}

			//continue to the same instance of event object
			do {

				e.publisher.path = e.publisher.contextPath();
				e.level++;
				e.type = rEventTypeFirstPart.exec( e.type )[1] + "." + e.level;
				findAndInvokeModelHandlers( e );

			} while (!e.isPropagationStopped() && e.publisher.path);
		}

		//restore previous values
		e.type = eventType;
		e.originalPublisher.path = originalPublisherPath;
		e.publisher.path = publisherPath;
		return e;
	};


	function getSubscriptionsBy ( target, match ) {
		if (isString( target )) {
			target = toPhysicalPath( target );
		}

		var rtn = [];
		for (var i = subscriptionStore.length - 1, item; i >= 0; i--) {
			item = subscriptionStore[i];
			if (match( item, target )) {
				rtn.push( item );
			}
		}
		return rtn;
	}

	accessSubs = {
		//subscriptions whose publisher is the parameter
		//publisher can be a model path or dom element, or object
		getByPublisher: function( publisher ) {
			return getSubscriptionsBy( publisher, function( item, target ) {
				return item.publisher == target;
			} );
		},

		//subscriptions whose subscriber is the parameter
		//subscriber can be a model path or dom element, or object
		getBySubscriber: function( subscriber ) {
			return getSubscriptionsBy( subscriber, function( item, target ) {
				return item.subscriber == target;
			} );
		},

		//object can be a model path or dom element, or object
		getByTarget: function( target ) {
			return !target ?
				subscriptionStore :
				getSubscriptionsBy( target, function match ( item, target ) {
					return item.subscriber == target || item.publisher == target;
				} );
		}
	};

	extend( via, {

		Event: Event,

		trigger: trigger,

		//function( subscriberOrPublisher ) {}
		subscriptions: accessSubs.getByTarget,

		//handler can be a function (e) {}
		// a string like "get set convert int"
		//or "*get *set *convert *int"
		//or it can be "*commonHandler"
		//or it can be { get:xx, set:xx, convert:xx, initialize: xx}
		//it can be a javascript object, dom element, but it can not be a jQuery object
		//subscriber can be null, "_", "null" to represent a case where there is not subscriber
		subscribe: subscribe = function( subscriber, publisher, eventTypes, handler, options, delegate ) {

			if (subscriber instanceof via) {
				subscriber = subscriber.path;
			}

			if (publisher instanceof via) {
				publisher = publisher.path;
			}

			if (isString( subscriber ) && subscriber.startsWith( "$" )) {
				subscriber = $( subscriber.substr( 1 ) );
			}

			if (subscriber && subscriber.jquery) {
				//subscriber is like $()
				//need to convert jQuery object into dom or raw element
				if (!subscriber.length && !subscriber.selector) {
					subscriber = null;
				} else {
					subscriber.each( function( index, element ) {
						//unwrap jQuery element
						subscribe( element, publisher, eventTypes, handler, options, delegate );
					} );
					return;
				}
			}

			if (isString( publisher ) && publisher.startsWith( "$" )) {
				publisher = $( publisher.substr( 1 ) );
			}

			if (publisher && publisher.jquery) {
				publisher.each( function( index, element ) {
					subscribe( subscriber, element, eventTypes, handler, options, delegate );
				} );
				return;
			}

			if (!publisher && publisher !== "") {
				throw "publisher can not be null";
			}

			if (!eventTypes) {
				throw "eventTypes can not be null";
			}

			//allow subscriber "", because this is the path of root model
			if (subscriber === "_" || subscriber == "null" || subscriber === null) {
				subscriber = dummy;
			}

			if (options === "_") {
				options = undefined;
			}

			var isPublisherModel = isString( publisher ),
				isSubscriberModel = isString( subscriber );

			markView( publisher );
			markView( subscriber );

			if (isPublisherModel) {
				//subscriber is a model
				publisher = toPhysicalPath( publisher );
			}

			if (isSubscriberModel) {
				//subscriber is a model
				subscriber = toPhysicalPath( subscriber );

			}

			if (isPublisherModel) {

				subscribeModelEvent( publisher, eventTypes, subscriber, handler, options );

			} else {

				subscribeViewEvent( publisher, eventTypes, subscriber, handler, options, delegate );
			}
		},

		//target is either subscriber or publisher
		unsubscribe: unsubscribe = function( target ) {

			var handler;

			if (isObject( target )) {
				if (!$( target ).viewId()) {
					return;
				}
				unMarkView( target );
			}

			for (var i = subscriptionStore.length - 1, subscription; i >= 0; i--) {
				subscription = subscriptionStore[i];
				handler = subscription.handler;

				if (canRemoveSubscriptionData( target, subscription.publisher, subscription.subscriber )) {

					//if publisher is an view object, need to unbind or undelegate
					//the jQuery event handler
					if (!isString( subscription.publisher )) {
						if (handler.delegateSelector) {
							$( subscription.publisher ).undelegate( handler.delegateSelector, subscription.eventTypes, viewHandlerGateway );

						} else {
							$( subscription.publisher ).unbind( subscription.eventTypes, viewHandlerGateway );
						}
					}

					handler.dispose &&
					handler.dispose( subscription.publisher, subscription.subscriber );

					subscriptionStore.splice( i, 1 );
				}

			}
		},

		//handlers( {
		//  handlerType: via.handlerType.model_model,
		//  handlers: {
		//          show: handler1,
		//          hide: handler2
		//      }
		//});

		//handlers ( {
		//  show: {
		//      type: via.handlerType.model_model,
		//      ...
		//  },
		//  hide: {
		//      ..
		//  }
		//});

		//handlers( "show",
		//  {
		//      type: xx,
		//      ...
		//  });


		//handlers( "show", xx,
		//  {
		//      ...
		//  });

		//a handler can be a string like "get set convert initialize finalize dispose"
		// or it can be an object
		/*
		 {
		 get: "xx" or function () {},
		 set: "xx" or function () {},
		 convert: "xx" or function () {},
		 initialize: "xx" or function () {},
		 finalize: "xx" or function () {},
		 dispose: "xx" or function () {}
		 }
		 */
		handlers: function( name, handler, overridingHandler ) {
			var key;
			if (isObject( name )) {
				for (key in name) {
					handlerObjStore[key] = buildHandlerObj( name[key] );
				}
				return;
			}

			if (isUndefined( name )) {
				return handlerObjStore;
			}

			if (isUndefined( handler )) {
				return handlerObjStore[name];
			}

			return (handlerObjStore[name] = overridingHandler ?
				extend( buildHandlerObj( handler ), overridingHandler ) :
				buildHandlerObj( handler ));

		},

		//common getter and setter are special filter in they way they are used
		//other filters use the key directly to reference the filters
		// but getters and setters need to use "*key" to reference getters and setters
		// if your getter/setter key does not begin with "*", then it will use the defaultGet
		//or defaultSet, and they key will become the getMethod, and optionally,
		// use options to pass the getProp value, the defaultGet/defaultSet
		// are not meant to be used directly like other common getters or setters
		filters: {

			//value = handler.get.apply( handler, [e].concat( extraParameters ) );
			//value = handler.get( e );
			//inside the getter function, 'this' refer to the handler
			//get(e)
			getters: getters = { },

			//handler.set( event, value )
			//inside setter function 'this' refer to the handler
			//set(e,value)
			setters: setters = { },

			//handler.convert( value, e );
			//inside converter function 'this' refer to handler
			converters: converters = {},

			//handler.initialize( publisher, subscriber, handler, options );
			//inside initialize function, 'this' refer to the window
			initializers: initializers = {},

			//handler.finalize( value );
			//inside the afterSet function, 'this' refer to the handler
			finalizers: finalizers = {
				//				saveLocal: function( value, e ) {
				//					util.local( e.publisher.path, value );
				//				}
			},

			//it is called when handler is unsubscribe
			//handler.dispose( publisher, subscriber);
			//inside dispose function 'this' refer to the handler
			disposers: disposers = {}
		}
	} );

	function defaultGet ( e ) {

		var getMethod = this.getMethod,
			//getProp is used for method like css, attr, prop
			//check code in via.$comboMethods.contains( getOrSetMethod )
			getProp = this.getProp,
			publisher = e.publisher;

		//"this" in the getMethod is model or jQuery
		return getProp ? publisher[getMethod]( getProp ) :
			isFunction( publisher[getMethod] ) ? publisher[getMethod]() :
				publisher[getMethod];
	}

	function defaultSet ( value, e ) {
		var setMethod = this.setMethod,
			//setProp is used for method like css, attr, prop
			setProp = this.setProp,
			subscriber = e.subscriber;

		setProp ? subscriber[setMethod]( setProp, value ) :
			isFunction( subscriber[setMethod] ) ? subscriber[setMethod]( value ) :
				subscriber[setMethod] = value;
	}

	//target is either publisher or subscriber
	function canRemoveSubscriptionData ( target, publisher, subscriber ) {
		if (target === publisher || target === subscriber) {
			return true;
		} else {
			//if target is model path
			if (isString( target )) {
				return ( isString( publisher ) && publisher.startsWith( target + "." )) ||
				       ( isString( subscriber ) && subscriber.startsWith( target + "." ));
			} else {
				return false;
			}
		}

	}

	function addSubscription ( publisher, eventTypes, subscriber, handlerObj ) {
		subscriptionStore.push( {
			publisher: publisher,
			subscriber: subscriber,
			eventTypes: eventTypes,
			handler: handlerObj
		} );
	}

	handlerObjStore = {

		triggerChange: {
			get: function( e ) {
				rootModel.triggerChange( this.options );
			}
		},
		saveLocal: {
			get: function( e ) {
				util.local( e.publisher.path, e.publisher.get() );
			}
		}
	};

	// -------- private ------------- //
	//the reason that we want to buildUniqueViewEventTypes is that
	//when unbind or undelegate the viewEventTypes, we want to the viewEventTypes
	//as unique as possible, check the unsubscribe method
	//
	//input: getUniqueViewEventTypes("click dblClick", viewWithViewId3, "customer")
	//output: "click.__via.3.customer dblClick.__via.3.customer"
	//input: getUniqueViewEventTypes("click dblClick", viewWithViewId3, viewWithViewId4)
	//output: "click.__via.3.4 dblClick.__via.3.4"
	//it try to append an event name with and ".__via.viewId.subscriberId"
	function buildUniqueViewEventTypes ( originalEventTypes, publisherView, subscriberModelPath ) {

		var publisherViewId = $( publisherView ).viewId();

		/*	if original viewEvents is "click dblClick",
		 and it bind to path "firstName", it will convert to
		 click.__via.firstName dblClick.__via.firstName, the reason is that
		 when path is deleted, the method unbind(object) need to unbind
		 event by a namespace, if firstName is deleted, we can unbind ".__via.firstName"*/
		return $.map(
			originalEventTypes.split( rEventSeparator ),
			function( originalEventName ) {
				return isString( subscriberModelPath ) ?
					originalEventName + "." + shadowNamespace + "." + publisherViewId + "." + subscriberModelPath :
					originalEventName + "." + shadowNamespace + "." + publisherViewId + "." + $( subscriberModelPath ).data( shadowNamespace );
			}
		).join( " " );
	}

	util.getUniqueViewEventTypes = buildUniqueViewEventTypes;

	//if object is dom element or jQuery selector then wrap into jQuery
	//if object is model path, wrap it into model
	//if it is pure object, return as it is
	//if it is _, return null
	function tryWrapPublisherSubscriber ( publisherOrSubscriber ) {
		if (isString( publisherOrSubscriber )) {
			return via( publisherOrSubscriber );

		} else if (publisherOrSubscriber == dummy) {
			return null;
		}
		else if (isObject( publisherOrSubscriber ) && !publisherOrSubscriber.nodeType) {
			//not a DOM element
			return publisherOrSubscriber;
		} else {
			return $( publisherOrSubscriber );
		}
	}

	//if entities is view, then mark it as view
	//this is serve two purpose, one for quick search
	//another is for namespace
	function markView ( object ) {
		if (isObject( object ) && !$( object ).data( shadowNamespace )) {
			$( object ).data( shadowNamespace, ++viewId );
		}
	}

	function unMarkView ( object ) {
		$( object ).removeData( shadowNamespace );
	}

	function replaceDotAndStar ( $0 ) {
		return $0 == "." ? "\\." : ".*";
	}

	function findMatchedEvents ( subscribedEvents, triggeringEvent ) {
		var match, rTemp, eventSubscribed, needToCheckStarDot, i;

		if (subscribedEvents === "*") {
			return "*";
		}

		subscribedEvents = subscribedEvents.split( rEventSeparator );

		for (i = 0; i < subscribedEvents.length; i++) {

			eventSubscribed = subscribedEvents[i];

			needToCheckStarDot = rEndWithStarDot.test( eventSubscribed );
			if (needToCheckStarDot) {
				eventSubscribed = eventSubscribed.replace( rEndWithStarDot, "" );
			}

			rTemp = eventSubscribed.replace( rDotOrStar, replaceDotAndStar );

			rTemp = needToCheckStarDot ? new RegExp( "^" + rTemp ) :
				new RegExp( "^" + rTemp + "$" );

			match = rTemp.test( triggeringEvent );
			if (match) {
				if (needToCheckStarDot) {

					//&& $.browser.msie, if rTemp is /^/, in IE, RegExp.rightContext
					//can return the "", which is wrong, have to do this hack
					var remaining = rTemp.source == "^" ? triggeringEvent : RegExp.rightContext;

					if (!remaining || !remaining.contains( "." )) {
						return subscribedEvents[i];
					}
				} else {
					return subscribedEvents[i];
				}
			}
		}
	}

	//e is mutable
	function findAndInvokeModelHandlers ( e ) {

		var subscription,
			observingModels,
			sideEvent,
			i,
			j,
			subscriptionsByPublisher = e.publisher.subsFromOthers();

		if (subscriptionsByPublisher.length) {

			for (i = 0; i < subscriptionsByPublisher.length; i++) {

				subscription = subscriptionsByPublisher[i];

				e.subscribedEvent = findMatchedEvents( subscription.eventTypes, e.type );
				if (e.subscribedEvent) {
					e.subscriber = tryWrapPublisherSubscriber( subscription.subscriber );
					executeHandlerObj( subscription.handler, e );
				}

				if (e.isImmediatePropagationStopped()) {
					return;
				}
			}
		}

		//only "after" event will do side tracking
		//because referencing model don't care about before state of referenced model
		//		if (event.eventType.startsWith( "after" )) {
		//			// wrap the following code there , if we want to improve performance
		//		}

		if (!e.isCascadeStopped()) {

			observingModels = modelLinks[e.publisher.path];

			if (observingModels) {
				for (j = 0; j < observingModels.length; j++) {

					//trigger = function( publisher, originalPublisher, eventType, proposed, removed ) {
					sideEvent = trigger(
						observingModels[j],
						e.originalPublisher.path,
						e.type
					);

					if (sideEvent.isImmediatePropagationStopped() || sideEvent.isImmediatePropagationStopped()) {
						return;
					}

					if (sideEvent.hasError()) {
						e.error();
					}
				}
			}
		}
	}

	//#debug
	function unwrapObject ( object ) {
		if (object) {
			if (!isUndefined( object.path )) {
				return via.util.toLogicalPath( object.path );
			} else {
				return object[0];
			}
		} else {
			return "null"
		}
	}

	//#end_debug

	function executeHandlerObj ( handlerObj, e, triggerData ) {

		//#debug
		log( unwrapObject( e.originalPublisher ),
			unwrapObject( e.publisher ),
			e.type,
			unwrapObject( e.subscriber ),
			handlerObj );
		//#end_debug

		var value,
			clonedEventArg;
		//e.handler = handlerObj;

		if (!isUndefined( triggerData )) {
			//in the get method "this" refer to the handler
			value = handlerObj.get.apply( handlerObj, [e].concat( triggerData ) );
		} else {
			//in the get method "this" refer to the handler
			value = handlerObj.get( e );
		}

		if (isPromise( value )) {
			clonedEventArg = extend( true, {}, e );
			value.done( function( value ) {
				if (handlerObj.convert) {
					//in the convert method "this" refer to the handler
					value = handlerObj.convert( value, e );
				}

				if (!isUndefined( value )) {
					//make sure it is a real promise object
					if (isPromise( value )) {
						value.done( function( value ) {
							setAndFinalize( handlerObj, value, clonedEventArg );
						} );

					} else {
						return setAndFinalize( handlerObj, value, e );
					}
				}
			} );
		} else {
			if (handlerObj.convert) {
				//in the convert method "this" refer to the handler
				value = handlerObj.convert( value, e );
			}

			if (!isUndefined( value )) {
				//make sure it is a real promise object
				if (isPromise( value )) {
					clonedEventArg = extend( true, {}, e );
					value.done( function( value ) {
						setAndFinalize( handlerObj, value, clonedEventArg );
					} );

				} else {
					return setAndFinalize( handlerObj, value, e );
				}
			}
		}

	}

	function setAndFinalize ( handler, value, e ) {
		if (!isUndefined( value )) {
			handler.set && handler.set( value, e );

			if (!isUndefined( value ) && handler.finalize) {
				return handler.finalize( value, e );
			}
		}
	}

	function subscribeModelEvent ( publisherPath, eventTypes, subscriber, handler, options ) {

		var match,
			delayMiniSecond,
			initEvent,
			handlerObj,
			events;

		events = eventTypes.split( " " );

		for (var i = 0; i < events.length; i++) {
			match = rInit.exec( events[i] );
			if (match) {
				initEvent = events[i];
				delayMiniSecond = +match[1];
				events.splice( i, 1 );
				eventTypes = events.join( " " );
				break;
			}
		}

		handlerObj = buildHandlerObj( handler, publisherPath, subscriber, options );

		if (eventTypes) {
			addSubscription( publisherPath, eventTypes, subscriber, handlerObj );
		}

		if (initEvent) {
			var init = function() {
				var e = new Event( publisherPath, publisherPath, initEvent );
				e.subscriber = tryWrapPublisherSubscriber( subscriber );
				executeHandlerObj( handlerObj, e );
			};

			if (delayMiniSecond) {
				setTimeout( init, delayMiniSecond );
			} else {
				init();
			}
		}
	}

	//subscribe jQuery event
	function subscribeViewEvent ( viewPublisher, eventTypes, subscriber, handler, options, delegateSelctor ) {

		//get/set/convert/[init]/[options]
		var needInit,
			eventSeedData,
			handlerObj,
			temp;

		temp = eventTypes.split( " " );

		if (temp.contains( "init" )) {
			needInit = true;
			eventTypes = temp.remove( "init" ).join( " " );
		}

		handlerObj = buildHandlerObj( handler, viewPublisher, subscriber, options );

		eventSeedData = {
			handler: handlerObj,
			subscriber: subscriber
		};

		if (eventTypes) {
			eventTypes = buildUniqueViewEventTypes( eventTypes, viewPublisher, subscriber );

			if (delegateSelctor) {
				handlerObj.delegateSelector = delegateSelctor;
				$( viewPublisher ).delegate( delegateSelctor, eventTypes, eventSeedData, viewHandlerGateway );

			} else {
				$( viewPublisher ).bind( eventTypes, eventSeedData, viewHandlerGateway );

			}

			//we have passed handler, subscriber, options as jQuery eventSeedData,
			//we still need to add them to subscriptions so that
			//the view event handler can be unbind or undelegate
			addSubscription( viewPublisher, eventTypes, subscriber, handlerObj );

			if (needInit) {
				if (delegateSelctor) {
					$( viewPublisher ).find( delegateSelctor ).trigger( eventTypes );
				} else {
					$( viewPublisher ).trigger( eventTypes );
				}
			}

		} else if (needInit) {

			$( viewPublisher ).one( "init", eventSeedData, viewHandlerGateway );
			$( viewPublisher ).trigger( "init" );

		}
	}

	//the general jQuery event handler
	function viewHandlerGateway ( e ) {

		e.publisher = tryWrapPublisherSubscriber( e.currentTarget );
		e.originalPublisher = tryWrapPublisherSubscriber( e.target );
		e.subscriber = tryWrapPublisherSubscriber( e.data.subscriber );

		var handlerObj = e.data.handler;
		delete e.data;

		if (arguments.length > 1) {
			executeHandlerObj( handlerObj, e, slice.call( arguments, 1 ) );

		} else {
			executeHandlerObj( handlerObj, e );
		}
	}

	function buildHandlerObj ( handler, publisher, subscriber, options ) {

		var handlerObject;

		handler = handler || "";

		if (isString( handler )) {

			// handler is like "*handlerKey" or "get set convert initialize finalize dispose"
			handlerObject = buildHandlerObjFromString( handler, publisher, subscriber );

		} else if (isFunction( handler ) || (isObject( handler ) && handler.get)) {

			handlerObject = handler;
			if (isFunction( handler )) {
				handlerObject.get = handler;
			}

			//if subscriber is a model and set is missing, use model set
			if (!handlerObject.set && !isUndefined( subscriber ) && isString( subscriber )) {
				handlerObject.set = "set";
			}

		} else {
			throw "invalid handler";
		}

		if (!isUndefined( publisher ) && !isUndefined( subscriber )) {
			initializeHandlerObject( handlerObject, publisher, subscriber, options );
		}

		decorateHandlerObjWithFilter( handlerObject, publisher, subscriber );

		return handlerObject;
	}

	function initializeHandlerObject ( handlerObject, publisher, subscriber, options ) {

		var initialize = handlerObject.initialize;

		if (isString( initialize )) {
			if (initialize.startsWith( "*" )) {
				initialize = initializers[initialize.substring( 1 )];
				if (!initialize) {
					throw "common initializer does not exist!";
				}
			} else {
				var path = initialize;
				if (!rootModel.helper( path )) {
					throw "initializer does not exist at path " + path;
				}
				initialize = function( publisher, subscriber, handlerObject, options ) {
					rootModel.set( path, publisher, subscriber, handlerObject, options );
				};
			}
		}
		if (initialize) {
			initialize( tryWrapPublisherSubscriber( publisher ), tryWrapPublisherSubscriber( subscriber ), handlerObject, options );
			delete handlerObject.initialize;
		} else if (!isUndefined( options )) {
			handlerObject.options = options;
		}

	}

	function ensureTargetHasAccessor ( accessorType, filterName, target ) {
		var missingMember;
		if (isString( target )) {

			if (!viaFn[filterName]) {

				missingMember = true;
			}

		} else {
			if (target.nodeType) {
				if (!$fn[filterName]) {
					missingMember = true;
				}
			} else if (!(filterName in target)) {
				missingMember = true;
			}
		}

		if (missingMember) {
			throw (accessorType == "get" ? "publisher" : "subscriber") +
			      " does not have a member " + filterName;
		}

	}

	function getModelHelperAsFilter ( handlerString, publisher, subscriber ) {
		if (handlerString.startsWith( "#" )) {
			handlerString = handlerString.substr( 1 );
			return isString( subscriber ) ? rootModel.helper( mergeLogicalPath( subscriber, handlerString ) ) :
				isString( publisher ) ? rootModel.helper( mergeLogicalPath( publisher, handlerString ) ) :
					rootModel.helper( handlerString );
		}
	}

	function buildHandlerObjFromString ( handlerString, publisher, subscriber ) {

		//get set convert initialize finalize dispose
		var handlerObject,
			modelMethod,
			filterKey,
			filterKeys = handlerString.split( rEventSeparator ),
			isPublisherModel = isString( publisher ),
			isSubscriberModel = isString( subscriber );

		if (filterKeys.length == 1) {
			if (handlerString.startsWith( "*" )) {
				handlerObject = handlerObjStore[handlerString.substr( 1 )];
				if (!handlerObject) {
					throw "common handler " + handlerString + " does not exist";
				}

				handlerObject = extend( {}, handlerObject );

			} else if ((modelMethod = getModelHelperAsFilter( handlerString, publisher, subscriber ))) {

				handlerObject = {
					get: modelMethod
				};

			} else if (!isUndefined( publisher ) && !isUndefined( subscriber )) {

				//infer handler from publisher and subscriber,
				if (isPublisherModel) {
					//When model change, handler
					//will get model's value using default get filter,
					//and update the view using default "set" filter or handler
					handlerObject = {
						get: "get",
						//if handlerString is null, then it should be the case when model subscribe model
						set: handlerString || "set"
					};

				} else if (isSubscriberModel) {
					// model subscribe view's change
					if (handlerString) {
						handlerObject = {
							get: handlerString,
							set: "set"
						};
					} else {
						//when model subscribe view without handler
						//the model is the handler by itself
						handlerObject = {
							get: rootModel.helper( subscriber )
						};
					}

				} else {
					//view subscribe view's event
					//this is rarely the case, but it is still supported
					//for example, a textBox subscribe the change of another textBox
					handlerObject = {
						get: handlerString,
						set: handlerString
					};
				}
			}

			//filterKeys has more than one keys
		} else {

			//the handler string has multiple filters
			handlerObject = { };

			for (var i = 0; i < standardFilterKeys.length; i++) {
				filterKey = filterKeys[i];
				if (filterKey && (filterKey !== "_" && filterKey != "null")) {
					if ((modelMethod = getModelHelperAsFilter( filterKey, publisher, subscriber ))) {
						handlerObject[standardFilterKeys[i]] = modelMethod;
					} else {
						handlerObject[standardFilterKeys[i]] = filterKey;
					}
				}
			}
		}
		return handlerObject;

	}

	function decorateHandlerObjWithFilter ( handlerObject, publisher, subscriber ) {
		attachFilter( handlerObject, "initialize", initializers );
		//
		attachAccessor( "get", handlerObject, publisher, subscriber );
		attachAccessor( "set", handlerObject, publisher, subscriber );
		//
		attachFilter( handlerObject, "convert", converters );
		attachFilter( handlerObject, "finalize", finalizers );
		attachFilter( handlerObject, "dispose", disposers );
	}

	function attachAccessor ( accessorType, handlerObj, publisher, subscriber ) {

		//by default handlerObj.get == "get", handlerObj.set = "set"
		var accessorKey = handlerObj[accessorType];

		//if handler's get/set filter is non-empty string, continue next
		//otherwise return
		if (!isString( accessorKey ) || accessorKey == "") {
			return;
		}

		var accessors = accessorType == "get" ? getters : setters;

		if (accessorKey.startsWith( "*" )) {

			accessorKey = accessorKey.substr( 1 );
			handlerObj[accessorType] = accessors[accessorKey];

			if (!handlerObj[accessorType]) {
				throw accessorKey + " does not exists common " + accessorType + " filter";
			}

		} else {

			var keys = accessorKey.split( "*" );

			//use defaultGet or defaultSet and decorate, if accessorKey does not begin with "*"
			// handler.setMethod = accessorKey or
			// handler.getMethod = accessorKey
			handlerObj[accessorType] = accessorType == "get" ? defaultGet : defaultSet;
			handlerObj[accessorType + "Method"] = keys[0];

			if (keys[1]) {
				//accessorKey = "css*color"
				handlerObj[accessorType + "Prop"] = keys[1];
			}

			if (!isUndefined( publisher ) && !isUndefined( subscriber )) {
				var publisherOrSubscriber = accessorType == "get" ? publisher : subscriber;
				ensureTargetHasAccessor( accessorType, keys[0], publisherOrSubscriber );
			}

		}
	}

	//filterType is like initialize, convert, finalize, dispose
	function attachFilter ( handler, filterType, filters ) {
		//because it is optional, we need make sure handler want to have this method
		var filterName = handler[filterType];
		if (isString( filterName )) {

			if (filterName.startsWith( "*" )) {
				handler[filterType] = filters[filterName.substr( 1 )];
			} else {
				handler[filterType] = function() {
					return rootModel.set.apply( rootModel, [filterName].concat( slice.call( arguments ) ) );
				};
			}
		}
	}

	via.onDisposing( unsubscribe );

	//subscription shortcut method for model
	extend( viaFn, {

		subscribe: function( publisher, events, handler, options, delegate ) {
			subscribe( this.path, publisher, events, handler, options, delegate );
			return this;
		},

		subscribedBy: function( subscriber, events, handler, options, delegate ) {
			subscribe( subscriber, this.path, events, handler, options, delegate );
			return this;
		},

		unsubscribe: function() {
			unsubscribe( this.path );
			return this;
		},

		subsFromOthers: function() {
			return accessSubs.getByPublisher( this.path );
		},

		subsFromMe: function() {
			return accessSubs.getBySubscriber( this.path );
		},

		subscriptions: function() {
			return accessSubs.getByTarget( this.path );
		},

		/*conditionally map an model event to a new model event based on a condition(predicate)

		 via("inventory").mapEvent(
		 "afterUpdate",
		 "inventoryLow",
		 function (value) {
		 return value <= 100;
		 }
		 );

		 compare to $fn.aliasEvent(),
		 aliasEvent works for an jQuery object, and it is unconditionaly*/
		mapEvent: function( sourceModelEventType, targetModelEventType, predicate ) {
			subscribe( this.path, this.path, sourceModelEventType, function( e ) {
				if (predicate( e.publisher.get(), e )) {
					trigger( e.publisher.path, e.publisher.path, targetModelEventType, e.proposed, e.removed );
				}
			} );
			return this;
		},

		saveLocalAfterUpdate: function( subPath ) {
			via.subscribe( null, this.fullPath( subPath ), "after*", "*saveLocal" );
			return this;
		}

	} );

	//subscription shortcut method for jQuery object
	extend( $fn, {

		subscribe: function( publisher, events, handler, options, delegate ) {
			if (this.length) {
				subscribe( this, publisher, events, handler, options, delegate );
			}
			return this;
		},

		subscribedBy: function( subscriber, events, handler, options, delegate ) {
			if (this.length) {
				subscribe( subscriber, this, events, handler, options, delegate );
			}
			return this;
		},

		unsubscribe: function() {
			return this.each( function() {
				unsubscribe( this );
			} );
		},

		subsFromOthers: function() {
			return accessSubs.getByPublisher( this[0] );
		},

		subsFromMe: function() {
			return accessSubs.getBySubscriber( this[0] );
		},

		subscriptions: function() {
			return accessSubs.getByTarget( this[0] );
		},

		initView: function( path, handler, options ) {
			subscribe( this, path, "init", handler, options );
			return this;
		},

		viewId: function() {
			return this.data( shadowNamespace );
		},

		//unconditionally trigger an new event of a single jQuery object
		// when old event trigger to the object
		//basically is it create alias for an event of a jQuery object
		//usage
		//$("button").aliasEvent("click", "update");
		aliasEvent: function( sourceEventType, targetTargetType ) {
			this.bind( sourceEventType, function( e ) {
				$( this ).trigger( targetTargetType );
			} );
		}
	} );

	// create a special jQuery (y) event based on an existing jQuery event (x)
	// when event x is raised, and predicate returns true, event y will raised
	// you can subscribe event y, like any jQuery event using
	//$("button").bind("y", fn);
	$.createFilterEvent = function( originalEventType, newEventType, predicate ) {
		var handler = function( e ) {
			if (predicate === true || predicate( e )) {
				$( e.target ).trigger( extend( {}, e, {
					type: newEventType,
					currentTarget: e.target
				} ) );
			}
		};

		if ($.event.special[newEventType]) {
			throw "event '" + newEventType + "' has been defined";
		}

		$.event.special[newEventType] = {
			setup: function() {
				$( this ).bind( originalEventType, handler );
			},
			teardown: function() {
				$( this ).unbind( originalEventType, handler );
			}
		};
		return this;
	};

	var _cleanData = $.cleanData;
	//when an dom element is remove unsubscribe it first
	$.cleanData = function( elems ) {
		$( elems ).each( function() {
			unsubscribe( this );
		} );
		_cleanData( elems );
	};



//


	var stage;

	via.stage = stage = function( actors ) {

		if (!isArray( actors )) {
			return stage( slice.call( arguments ) );
		}

		var i, actor, j, subscription, subs, publisher,
			subscriber, contextView, contextModel;

		for (i = 0; i < actors.length; i++) {
			actor = actors[i];
			subs = actor.subs;

			if (isModel( actor.actor )) {

				if (actor.model) {
					rootModel.set( actor.actor, actor.model );
				}
				contextModel = actor.actor; //model path

				contextView = actor.context;
			} else {
				contextView = actor.actor;
				contextModel = actor.context; //model path
			}

			if (contextModel instanceof via) {
				contextModel = contextModel.path;
			}

			if (isString( contextView ) && contextView.startsWith( "$" )) {
				contextView = contextView.substr( 1 );
			}

			contextView = contextView || document;
			if (subs) {
				if (!isArray( subs[0] )) {
					subs = [subs];
				}

				for (j = 0; j < subs.length; j++) {
					subscription = subs[j];

					subscriber = tryConvertToContextBoundObject( subscription[0], contextModel, contextView );
					publisher = tryConvertToContextBoundObject( subscription[1], contextModel, contextView );

					subscribe(
						subscriber,
						publisher,
						subscription[2], //eventTypes
						subscription[3], //handler
						subscription[4], //options,
						subscription[5] //delegate
					);
				}
			}
		}
		return via;
	};

	function isModel ( actor ) {
		return (actor instanceof via) || (isString( actor ) && !actor.startsWith( "$" ));
	}

	function tryConvertToContextBoundObject ( target, contextModel, contextView ) {
		if (isString( target )) {
			if (target.startsWith( "$" )) {
				//it is jQuery object
				target = target.substr( 1 );

				if (target) {

					target = $( contextView ).findAll( target );

				} else {

					target = $( contextView );
				}

			} else if (target == ".") {

				target = contextModel;

			} else if (target !== "_") {

				target = mergeLogicalPath( contextModel, target );
			}
		}

		return target;
	}

	via.application = function( application ) {
		var actors = [],
			model,
			view,
			i,
			models = application.models,
			views = application.views;

		if (models) {
			for (i = 0; i < models.length; i++) {
				model = models[i];
				actors.push( {
					actor: model.path,
					model: model.value,
					context: model.contextView,
					subs: model.subs
				} );
			}
		}

		if (views) {
			for (i = 0; i < views.length; i++) {
				view = views[i];
				actors.push( {
					actor: view.view,
					context: view.contextModel,
					subs: view.subs
				} );
			}
		}
		stage( actors );
		return via;
	};

//
//<@depends>event.js, model.js</@depends>


	var
		//a declaration is like @property:value or @property
		rDeclaration = /\s*([`@$!])([#\w\. \*]+)(:([\*\.\w$\/][^`@$!]*))*/g,

		rSemicolonSeparator = /\s*;\s*/g,
		//rCommaSeparator = /\s*,\s*/g,
		//match a,b or a,b,c
		//try to match myclass|path|options|delegate or myclass|path
		rClassPropertyValue = /^([^|]+)(\|([^|]+))?(\|(.+?))??$/,
		//match the "|" in "a|b" and " | " in "a | b"
		rSubscriptionValueSeperator = /\s*\|\s*/g,
		klass = "class",
		reservedPropNames = "sub,pub,class,theme,ns,options".split( "," ),
		allClassDefinitions = {},
		customSubsProps,
		viaClasses;

	defaultOptions.theme = "via";
	defaultOptions.subsAttr = "data-sub";
	defaultOptions.autoImportSubs = true;

	//build preliminary rule object from a string
	function convertStringToDataSub ( dataSubString ) {
		if (!dataSubString) {
			return;
		}
		var rtn = {},
			match, propertyName, propertyValue, seperator;

		while ((match = rDeclaration.exec( dataSubString ))) {

			seperator = match[1];

			propertyName = $.trim( match[2] );
			propertyValue = $.trim( match[4] ) || null;

			// currently we only support either "@", "`" , "$" and "!" seperator
			if (seperator == "`") {
				//this is class rule in "`" form
				//convert like the following
				// `myClass:path,options --> class:myClass,path,options
				// `myClass --> class:myClass
				propertyValue = propertyValue ? propertyName + "|" + propertyValue : propertyName;
				propertyName = "class";

			} else if (seperator == "$") {
				//convert
				// $event:path|handler|options|delegate --> @pub:event|path|handler|options|delegate
				propertyValue = propertyName + "|" + propertyValue;
				propertyName = "pub";

			} else if (seperator == "!") {
				//!event:path|handler|options|delegate --> @sub:path|events|handler|options|delegate
				//this.get().splice( index, 0, item );
				propertyValue = propertyValue.split( rSubscriptionValueSeperator );
				propertyValue.splice( 1, 0, propertyName );
				propertyValue = propertyValue.join( "|" );
				propertyName = "sub";
			}

			if (rtn[propertyName]) {

				rtn[propertyName] = rtn[propertyName] + ";" + propertyValue;

			} else {
				rtn[propertyName] = propertyValue;
			}
		}
		return rtn;
	}

	//returns true if it a theme has classRules, otherwise false
	//a classRules can be is direct classRules, or inherited from parentThemes
	function hasTheme ( themeName ) {

		if (!themeName || !via.themes[themeName]) {
			return false;
		}

		if (!via.themes[themeName].loaded) {

			var classRulesOfTheme = loadClassRulesOfTheme( themeName );
			if (!classRulesOfTheme) {
				return false;
			}

			//combine all the class rules into allClassDefinitions,
			//each class rule is fully qualified as themeName.className (eg. via.textBox)
			for (var i = classRulesOfTheme.length - 1, classRules; (classRules = classRulesOfTheme[i]); i--) {
				for (var className in classRules) {
					var classRule = classRules[className];
					var fullClassName = themeName + "." + className;
					//always overwrite the definition
					allClassDefinitions[fullClassName] = classRule;
				}
			}
			via.themes[themeName].loaded = true;

		}

		return true;
	}

	//return an array of classRules
	//like [ {textBox: "..."} , {label: ".."} ]
	//because a theme may have parentThemes, and parentTheme may have its classRules
	//this method try to aggregate all the classRules into an array
	function loadClassRulesOfTheme ( themeName ) {
		var theme = via.themes[themeName],
			rtn = [],
			parentThemes = theme.parentThemes;

		if (!parentThemes && themeName != "via") {
			parentThemes = "via";
		}

		if (parentThemes == "null") {
			parentThemes = undefined;
		}

		theme.classes && rtn.push( theme.classes );

		if (parentThemes) {
			parentThemes = parentThemes.split( ";" );
			for (var i = 0; i < parentThemes.length; i++) {
				rtn = rtn.concat( loadClassRulesOfTheme( parentThemes[i] ) );
			}
		}
		return rtn;
	}

	//parseContext can be default parseContext, it can be class' parseContext
	function addSubsFromClassProperties ( elem, parseContext, subscriptions ) {

		var matchClassPropertyValue,
			parts,
			className,
			classNs,
			extraClassData,
			dataSubDefinedInClass,
			pub,
			sub,
			classeReferences,
			classDeclaration,
			//because 'class' is reserved word in JavaScript,
			// we can not use parseContext.class, so use parseContext[klass] instead
			//classPropertyValue is like
			// "class1|path1|options1|delegate1;class2|path2|options2|delegate2"
			classReferenceString = parseContext[klass];

		//if parseContext does not have class declaration, or there is no theme
		if (!classReferenceString || classReferenceString === "_" || !hasTheme( parseContext.theme )) {
			return;
		}

		classeReferences = classReferenceString.split( rSemicolonSeparator );

		for (var i = 0; i < classeReferences.length; i++) {
			//@class:className
			//@class:className|ns
			//@class:className|ns|options
			matchClassPropertyValue = rClassPropertyValue.exec( classeReferences[i] );
			className = matchClassPropertyValue[1];
			classDeclaration = $.trim( allClassDefinitions[parseContext.theme + "." + className] );
			dataSubDefinedInClass = convertStringToDataSub( classDeclaration );

			if (dataSubDefinedInClass) {

				//@class:myClass|ns2[|extraClassData]
				//classNs == "ns2"
				classNs = matchClassPropertyValue[3];
				//extraClass data contains everything after classNs
				extraClassData = matchClassPropertyValue[5];

				//if via.classes.myClass == "@ns:ns1 @pub:xx @sub:xx"
				//then parseContextDefinedInClassRule.ns == "ns1"
				//
				//we need to recalculate the parseContextDefinedInClassRule.ns here
				//based on parseContext.ns, classNs and parseContextDefinedInClass.ns
				dataSubDefinedInClass.ns = mergeLogicalPath(
					mergeLogicalPath( parseContext.ns, classNs ),
					dataSubDefinedInClass.ns
				);

				dataSubDefinedInClass.theme = parseContext.theme;

				if (extraClassData) {
					var temp = extraClassData.split( rSubscriptionValueSeperator );
					if (temp.length == 2) {
						dataSubDefinedInClass.options = temp[1];
					} else {
						dataSubDefinedInClass.options = extraClassData;
					}
				} else {

					dataSubDefinedInClass.options = parseContext.options;
				}

				if (extraClassData) {
					//In method addSubsFromSubPubRules, by default,
					// if a subscription does not have an option defined,
					// the subscription will inherite parseContext.options (in this case, it is classOptions)
					// if the subscritpion already have a options defined, it will ignore the parseContext.options
					//
					//for example, we have the following
					//viaClasses.myClass = "@pub:click|.|handler|predefinedOptions@sub:...";
					//@class:myClass|ns|classOptions
					//by default "predefinedOptions" will be used, and classOptions will be ignored
					//
					//
					//But if we want to merge them together,  which means we want to used options
					//as "predefinedOptions,classOptions"
					//
					//we need to use this special logic here
					//
					//1. define the class with only <strong>one</strong> subscription either pub or sub like this
					//viaClasses.myClass = "@pub:click|.|handler|predefinedOptions";
					//
					//2 reference the class rule @class:myClass|ns|classOptions or `myClass:ns|classOption
					//the subscription will be @pub:click|ns|handler|predefinedOptions|classOptions
					//
					sub = dataSubDefinedInClass.sub;
					pub = dataSubDefinedInClass.pub;

					if (!sub && pub && pub.split( ";" ).length == 1) {
						//debugger;
						parts = pub.split( rSubscriptionValueSeperator );

						//parts[4] is options
						//if options is undefined
						if (isUndefined( parts[3] )) {
							dataSubDefinedInClass.pub += "|" + extraClassData;
						} else {
							dataSubDefinedInClass.pub += extraClassData;
						}

					} else if (!pub && sub && sub.split( ";" ).length == 1) {
						//debugger;
						parts = sub.split( rSubscriptionValueSeperator );
						if (isUndefined( parts[3] )) {
							dataSubDefinedInClass.sub += "|" + extraClassData;
						} else {
							dataSubDefinedInClass.sub += extraClassData;
						}

					}
				}

				//
				addSubs( elem, dataSubDefinedInClass, subscriptions );
			}
		}

	}

	//propName can be "theme" and "ns"
	function inheritParentProp ( elem, propName ) {

		var $parent = $( elem );

		while (($parent = $parent.parent()) && $parent.length) {

			var dataSub = $parent.dataSub();

			if (dataSub && dataSub[propName]) {

				return dataSub[propName];
			}
		}
		return "";
	}

	function addSubsFromSubPubProperties ( elem, parseContext, subscriptions ) {
		buildSubsBySubOrPub( "sub", elem, parseContext, subscriptions );
		buildSubsBySubOrPub( "pub", elem, parseContext, subscriptions );
	}

	//subscriptionType can be either "sub" or "pub"
	function buildSubsBySubOrPub ( subscriptionType, elem, parseContext, subscriptions ) {

		var i,
			subscriptionParts,
			publisher,
			eventTypes,
			subscriber,
			options,
			subscriptionEntries = parseContext[subscriptionType] && parseContext[subscriptionType].split( ";" );

		if (subscriptionEntries) {

			for (i = 0; i < subscriptionEntries.length; i++) {

				subscriptionParts = $.trim( subscriptionEntries[i] );
				if (!subscriptionParts) {
					continue;
				}

				subscriptionParts = subscriptionParts.split( rSubscriptionValueSeperator );

				if (subscriptionParts) {

					if (subscriptionType == "sub") {
						//for @sub, the syntax is @sub:path|events|handler|options|delegate
						publisher = subscriptionParts[0];
						publisher = publisher.startsWith( "$" ) ?
							publisher :
							mergeLogicalPath( parseContext.ns, publisher );

						eventTypes = subscriptionParts[1];
						subscriber = elem;

					} else {
						//for @pub, the syntax is @pub:events|path|handler|options|delegate
						publisher = elem;
						eventTypes = subscriptionParts[0];
						subscriber = subscriptionParts[1];
						subscriber = subscriber.startsWith( "$" ) ?
							subscriber :
							mergeLogicalPath( parseContext.ns, subscriber );
					}

					options = subscriptionParts[3];
					options = toTypedValue( options ? options : parseContext.options );

					subscriptions.push( {
						publisher: publisher,
						eventTypes: eventTypes,
						subscriber: subscriber,
						handler: subscriptionParts[2],
						options: options,
						delegate: subscriptionParts[4]
					} );
				}
			}
		}
	}

	//parseContext can be default parseContext, it can be class parseContext
	function addSubsFromCustomProperties ( elem, parseContext, subscriptions ) {

		for (var propName in parseContext) {

			if (hasOwn.call( parseContext, propName ) && !reservedPropNames.contains( propName )) {

				if (customSubsProps[propName]) {
					//if a rule is defined, call the rule

					//let's say rule name is "foo"
					var options = parseContext[propName] == "." ?

						//if "foo" is specified in classRules like
						//class:foo,.,fooValue, the rule value "fooValue"
						// is saved in parseContext.options
						parseContext.options :

						//if "foo" is defined like @foo:fooValue, the rule value "fooValue"
						// is saved in rules.foo
						parseContext[propName];

					customSubsProps[propName]( elem, parseContext, subscriptions, options );
				} else {

					//if rule is not defined, simply save it to element parseContext
					//parseContext is not necessary elem parseContext
					//it can be class parseContext
					$( elem ).dataSub()[propName] = parseContext[propName];
				}
			}
		}
	}

	//it returns an array of subscriptions,
	//if elem has custom rule
	// , it may or may not create side effect
	//
	//although this can be call multiple times, because of the side effect, it should
	//not be exposed in production, although it can be used for debugging purpose
	function buildSubscriptionObjects ( elem ) {
		var elementDataSub = $.trim( $( elem ).attr( defaultOptions.subsAttr ) );

		if (!elementDataSub) {
			return;
		}

		elementDataSub = convertStringToDataSub( elementDataSub );

		$( elem ).dataSub( elementDataSub );

		if (elementDataSub.ns && elementDataSub.ns !== ".") {
			//this is the case when path is not empty, but it is not "."

			if (rBeginDotOrStar.exec( elementDataSub.ns )) {
				//this is the case when path begin with . or *
				// like .firstName or *.index,
				elementDataSub.ns = mergeLogicalPath( inheritParentProp( elem, "ns" ), elementDataSub.ns );
			}

		} else {

			//this is the case when defaultParseContext.ns is not available
			//or when it is "."
			elementDataSub.ns = inheritParentProp( elem, "ns" );
		}

		//if userRule.theme is not available,
		// if userRule.ns is null, then use default theme
		// otherwise disable theme
		elementDataSub.theme = elementDataSub.theme ||
		                       inheritParentProp( elem, "theme" ) ||
		                       defaultOptions.theme;

		var subscriptions = [];

		addSubs( elem, elementDataSub, subscriptions );

		return subscriptions.length ? subscriptions : undefined;
	}

	function addSubs ( elem, parseContext, subscriptions ) {
		addSubsFromClassProperties( elem, parseContext, subscriptions );
		addSubsFromCustomProperties( elem, parseContext, subscriptions );
		addSubsFromSubPubProperties( elem, parseContext, subscriptions );
	}

	function importSubs ( elem ) {

		//only elem has data-sub="xxx" attribute
		//prevent a elem from being processed twice
		if (!$( elem ).attr( defaultOptions.subsAttr ) || !$( elem ).dataSub()) {

			var i,
				subscription,
				//when buildSubscriptionObjects(elem) is called
				// $(elem).dataSub() will not be empty anymore
				subscriptions = buildSubscriptionObjects( elem );

			if (subscriptions) {
				for (i = 0; i < subscriptions.length; i++) {
					subscription = subscriptions[i];
					subscribe(
						subscription.subscriber,
						subscription.publisher,
						subscription.eventTypes,
						subscription.handler,
						subscription.options,
						subscription.delegate
					);
				}
			}
		}

		$( elem ).children().each( function() {
			importSubs( this );
		} );
	}

	extend( via, {

		//propName: function( elem, parseContext, subscriptions, options ) {
		//		 subscriptions.push("...");
		//}
		customSubsProps: customSubsProps = {},

		importSubs: function() {
			importSubs( document.documentElement );
		},

		themes: {
			//themes.via is the default theme
			via: {

				//#debug
				//parentThemes: undefined,
				//#end_debug

				classes: viaClasses = {}
			}
		},

		classes: viaClasses
	} );

	//	$.expr[":"].sub = function( elem ) {
	//		return !!$( elem ).attr( defaultOptions.subsAttr );
	//	};

	//findAll is different from find in that it not only find its children
	//but it also find elements of itself.
	extend( $fn, {

		findAll: function( selector ) {

			if (this.length === 0) {
				return this;
			} else {
				var rtn = this.filter( selector );
				this.each( function() {
					rtn = rtn.add( $( this ).find( selector ) );
				} );
				return rtn;
			}
		},

		importSubs: function() {
			return this.each( function() {
				importSubs( this );
			} );
		},

		//default parseContext of the element
		dataSub: function( value ) {
			if (isUndefined( value )) {
				return this.data( "datasub" );
			}
			return this.data( "datasub", value );
		}

	} );

	/*
	 the auto parse works only if you not using AMD to download
	 the via library, if you using AMD, then you need to manually
	 call via.parse

	 There is a difference between $(document).bind("ready", handler)
	 and $(handler).If the ready event has already fired and you
	 try to .bind("ready"),the bound handler will not be executed.
	 Ready handlers bound like $(document).bind("ready", handler)
	 are executed after any bound by $(handler). Here we want to use
	 $(document).bind("ready", handler) because if the via library is
	 loaded with asynchronous module definition, ready event should
	 be already fired, we disable auto wireup, so that user can
	 manually wireup where it is appropriate.
	 */
	(function() {

		var fn = function() {
			if (defaultOptions.autoImportSubs) {
				via.importSubs();
			}
		};

		if ($.isReady) {

			//this is when the viajs is loaded aysnchronously
			setTimeout( fn, 10 );

		} else {
			//this is when the viajs is loaded using synchronously using <script> tag
			//we want to run after all the function bound $(fn)
			$( document ).bind( "ready", fn );
		}

	})();

	//#debug
	//this method should be used for debugging purpose only.
	// should not be used in production
	$fn.buildSubscriptionObjects = function() {
		return buildSubscriptionObjects( this[0] );
	};

	via.debug.convertStringToDataSub = convertStringToDataSub;
	via.debug.allClassDefinitions = allClassDefinitions;
	via.debug.clearClassDeclarations = function() {
		$.each( via.themes, function( key ) {
			via.themes[key].loaded = false;
		} );
	}
	//#end_debug

//
//<@depends>event.js, model.js, declarative.js</@depends>


	var template,
		templateEngines = {},
		renderInside = {
			initialize: "*buildTemplateOptions",
			get: "get", //extensible
			convert: "*template",
			set: "html", //extensible
			finalize: "*importSubs"
		};

	function buildTemplateHandler ( getter, setter, finalizer ) {
		return extend( {}, renderInside,
			isObject( getter ) ? getter : {
				get: getter,
				set: setter,
				finalize: finalizer
			} );
	}

	//options can be : templateId,wrapItem,engineName
	//
	//or it can be
	// {
	//  templateId: "xxx",
	//  wrapItem: true,
	//  engineName: "xxx"
	//}
	initializers.buildTemplateOptions = function( publisher, subscriber, handler, options ) {
		if (isString( options )) {

			options = options.split( "," );
			handler.templateId = $.trim( options[0] );
			handler.useDataSourceAsArrayItem = $.trim( options[1] ) == "true";
			handler.engineName = options[2];

		} else if (isObject( options ) && options.templateId) {

			extend( handler, options );

		} else {

			if (!(handler.templateId = $( subscriber ).data( "defaultTemplate" ))) {

				var templateSource = $.trim( $( subscriber ).html() );
				if (templateSource) {
					$( subscriber ).empty();
					handler.templateId = "__" + $.uuid++;
					template.compile( handler.templateId, templateSource );
					$( subscriber ).data( "defaultTemplate", handler.templateId );
				} else {
					throw "missing template";
				}
			}
		}
	};

	//this converter is used in handlers which can want to convert data
	// to markup, these handler includes foreach, and buildTemplateHandler
	//which is the core of all templateHandler
	converters.template = function( dataSource, e ) {

		if (dataSource && (
			(isArray( dataSource ) && dataSource.length) || //if dataSource is an array, it has item(s)
			!isArray( dataSource ) //or dataSource is non-array
			)) {

			//if useDataSourceAsArrayItem is true, wrap data with [], so that it is an item of an array, explicitly
			//some template engine can automatically wrap your data if it is not an array.
			//if you data is already in array, it treat it as an array of items.
			//however, if you want to want to treat your array as item, you need to wrap it by your
			//self, useDataSourceAsArrayItem is for this purpose

			var publisher = e.publisher,

				handler = this,

				//handler.templateId, handler.useDataSourceAsArrayItem, handler.engineName is
				//built in during initialization , see initializers.buildTemplateOptions
				content = renderTemplate(

					handler.templateId,

					handler.useDataSourceAsArrayItem ? [dataSource] : dataSource,

					//this context can be used to access model within the template
					{
						modelPath: publisher.path,
						e: e,
						get: function( /*subPath*/ ) {
							//this function run in the context of window
							return publisher.get.apply( publisher, slice.call( arguments ) );
						}
					},
					handler.engineName );

			if (isPromise(content)) {
				return content;
			}
			if (isString( content )) {

				content = $.trim( content );
			}

			//to work around a bug in jQuery
			// http://jsfiddle.net/jgSrn/1/
			return $( $( "<div />" ).html( content )[0].childNodes );
			//			if (rtn.length == 1 && rtn[0].nodeType == 3) {
			//				return content;
			//			} else {
			//				return rtn;
			//			}
			//return rtn;
			//return rtn.selector || !rtn.length ? content : rtn;
			//return content;
		} else {
			return "";
		}
	};

	//when the template is render, need to recursively import declarative subscritpions
	finalizers.importSubs = function( value, e ) {
		//e.subscriber.children().importSubs();
		$( value ).importSubs();

	};

	//add reusable event handler
	via.handlers( {
		renderInside: renderInside,
		render: buildTemplateHandler( "get", "replaceWith" )
	} );

	//data-sub="@class:foreach|path|templateId"
	//or data-sub="`foreach:path|templateId"
	viaClasses.foreach = "!init after*.:.|*renderInside";

	viaClasses.renderInside = "!init.:.|*renderInside";

	//data-sub="@class:render|path|templateId"
	//or data-sub="`render:path|templateId"
	viaClasses.render = "!init:.|*render";

	//$("div").renderInside(templateId, path)
	//$("div").renderInside(templateId, path, fn)
	$fn.renderInside = function( templateId, modelPath, templateHandlerExtension ) {

		modelPath = modelPath || "";

		if (isFunction( templateHandlerExtension )) {
			templateHandlerExtension = {
				finalize: templateHandlerExtension
			};
		}

		return this.initView(

			modelPath,

			templateHandlerExtension ?
				extend( {}, renderInside, templateHandlerExtension ) :
				"*renderInside",

			templateId
		);
	};

	//$("div").render(path, templateId)
	$fn.render = function( path, templateOptions, templateHandlerExtension ) {

		if (isFunction( templateHandlerExtension )) {
			templateHandlerExtension = {
				finalize: templateHandlerExtension
			};
		}

		return this.initView(
			path,
			templateHandlerExtension ? extend( {}, via.handlers( "render" ), templateHandlerExtension ) : "*render",
			templateOptions
		);
	};

	function getTemplateEngine ( engineName ) {
		engineName = engineName || template.defaultEngine;
		if (!engineName) {
			throw "engine name is not specified or default engine name is null";
		}
		var engine = templateEngines[engineName];
		if (!engine) {
			throw "engine '" + engine + "' can not be found.";
		}
		return engine;

	}

	//this is called by converters.renderTemplate
	function renderTemplate ( templateId, dataSource, renderContext, engineName ) {

		var engine = getTemplateEngine( engineName, templateId );

		templateId = $.trim( templateId );

		if (!engine.isTemplateLoaded || engine.isTemplateLoaded( templateId )) {

			return engine.render( templateId, dataSource, renderContext );

		} else {
			var defer = $.Deferred();
			template.load( templateId ).done( function() {
				var content = engine.render( templateId, dataSource, renderContext );
				var rtn = $( content );
				defer.resolve( rtn.selector || !rtn.length ? content : rtn );
			} );
			return defer.promise();

		}
	}

	via.template = template = {

		defaultEngine: "",

		/*
		 via.template.myEngine = {
		 render: function( templateId, data, context ) {},
		 compile: function( templateId, source ) {},
		 isTemplateLoaded: function( templateId ) {}
		 };
		 */
		engines: function( name, engine, notDefaultEngine ) {
			if (!name) {
				return templateEngines;
			}
			if (!engine) {
				return templateEngines[name];
			}

			templateEngines[name] = engine;
			if (!notDefaultEngine) {
				template.defaultEngine = name;
			}
		},

		//dynamically load a template by templateId,
		//it is called by template.render
		//The default implementation required matrix.js
		//but you can override this, all you need
		// is to return is that a promise, when the promise is
		// done, the template should be ready to used
		load: function( templateId ) {
			if (typeof matrix == "undefined") {
				throw "The method via.template.load require matrix.js," +
				      "or you need override the method";
			}
			return matrix( templateId + ".template" );
		},

		//this should be called by via.template.load after the method
		//get the source of the template
		compile: function( templateId, source, engineName ) {
			var engine = getTemplateEngine( engineName );
			return engine.compile( templateId, source );
		},

		//build a customized handler which handle the change of model
		//by default
		//getFilter is "get" which is to get model value,
		// it can be a string or function (e) {}
		//
		//setFitler is "html" which is to change the content of the view
		//it can be a string or function (e, value)
		buildTemplateHandler: buildTemplateHandler
	};

//<@depends>event.js, model.js, declarative.js, template.js</@depends>


	var viewValueAdapters,
		toString = function( value ) {
			return (value === null || value === undefined) ? "" : "" + value;
		};

	extend( true, via.filters, {

		getters: {

			getOriginalModel: function( e ) {
				return e.originalPublisher.get();
			},

			//this is gateway to adapter function defined in viewAdapter.get
			getViewValue: function( e ) {
				return this.getViewValue( e.publisher );
			}
		},
		setters: {

			//this is gateway to adapter function defined in viewAdapter.set
			setViewValue: function( value, e ) {
				return this.setViewValue( e.subscriber, value, e );
			}
		},
		converters: {

			toString: toString,

			toTypedValue: toTypedValue

			/*	toggle: function( value ) {
			 return !value;
			 },

			 toNumber: function( value ) {
			 return +value;
			 },

			 toDate: function( value ) {
			 return new Date( value );
			 },


			 toJsonString: function( value ) {
			 return JSON.stringify( value );
			 },
			 toJsonObject: function( value ) {
			 return JSON.parse( value );
			 }*/
		}
	} );

	via.handlers( {

		//set view value with model value
		updateViewValue: {
			initialize: function( publisher, subscriber, handler, options ) {
				var adapter = findViewValueAdapter( subscriber, options );
				if (!adapter || !adapter.set) {
					throw "can not find set method for view";
				}
				handler.setViewValue = adapter.set;
				if (adapter.initialize && !subscriber.data( "accesserInitialized" )) {
					adapter.initialize( subscriber );
					subscriber.data( "accesserInitialized", true );
				}
			},
			get: "get",
			set: "*setViewValue"
		},

		//set model value with view value
		updateModelValue: {
			initialize: function( publisher, subscriber, handler, options ) {
				var adapter = findViewValueAdapter( publisher, options );
				if (!adapter || !adapter.get) {
					throw "can not find get method for view";
				}
				handler.getViewValue = adapter.get;
				if (adapter.initialize && !publisher.data( "accesserInitialized" )) {
					adapter.initialize( publisher );
					subscriber.data( "accesserInitialized", true );

				}
			},
			get: "*getViewValue",
			set: "set"
		},

		//add model handlers
		//render <select> options
		options: {
			//this is actually the execute function, in this handler
			//there is no set, the content of the view is render
			//in the get function.
			get: function( e ) {

				var options = this.options,
					subscriber = e.subscriber,
					value = subscriber.val();

				subscriber.children( "option[listItem]" )
					.remove().end().append(
					function() {
						var html = "";
						$( e.publisher.get() ).each( function() {
							html += "<option listItem='1' value='" + options.value( this ) + "'>" + options.name( this ) + "</option>";
						} );
						return html;
					} ).val( value );

				if (subscriber.val() !== value) {
					$( subscriber.trigger( "change" ) );
				}
			},

			initialize: function( publisher, subscriber, handlerObj, options ) {
				if (options) {
					var parts = options.split( "," );
					var textColumn = parts[0];
					var valueColumn = parts[1] || parts[0];

					handlerObj.options = {
						name: function( item ) {
							return item[textColumn];
						},
						value: function( item ) {
							return item[valueColumn];
						}
					};

				} else {

					handlerObj.options = {
						name: function( item ) {
							return item.toString();
						},
						value: function( item ) {
							return item.toString();
						}
					};
				}
			}
		},
		//a handler is a function , it become the getFilter of real handler
		hide: function( e ) {
			var effect = this.effect;
			if (!effect) {
				this.effect = this.options;
			}
			$( e.subscriber )[ e.publisher.isEmpty() ? "show" : "hide"]( effect );
		},
		show: function( e ) {
			var effect = this.effect;
			if (!effect) {
				this.effect = this.options;
			}
			$( e.subscriber )[ e.publisher.isEmpty() ? "hide" : "show"]( effect );
		},
		showPlural: function( e ) {
			var value = e.publisher.get(),
				count = value.length || value;
			e.subscriber[ count > 1 ? "show" : "hide"]();
		},

		textCount: function( e ) {
			var value = e.publisher.get(),
				count = ( "length" in value) ? value.length : value;

			e.subscriber.text( count );
		},

		enable: function( e ) {
			$( e.subscriber ).attr( "disabled", e.publisher.isEmpty() );
		},
		disable: function( e ) {
			$( e.subscriber ).attr( "disabled", !e.publisher.isEmpty() );
		},
		//this is useful for debugging
		//via.classes.showValue = "!init after*:.|*showValue"";
		showValue: function( e ) {
			e.subscriber.html( "<span style='color:red'>" + e.publisher.path + " : " + JSON.stringify( e.publisher.get() ) + "</span>" );
		},
		//the following are array model handlers
		//
		//handle when an item is appended to the array,
		// an event afterCreate.x (x is number) will be raised, and this handler will be triggered
		//
		//the reason to use getOriginalModel is that
		//the handler may be attached to the items array
		appendTmplItem: buildTemplateHandler(
			"*getOriginalModel", //getFilter
			"append"  //setFilter
		),
		//handle when an item is updated in an array,
		//an event afterUpdate.x (x is number) will be raised
		updateTmplItem: buildTemplateHandler(
			//getFilter
			function( e ) {
				return e.publisher.get( childIndex( e ) );
			},
			//setFilter
			function( value, e ) {
				e.subscriber.children().eq( +childIndex( e ) ).replaceWith( value );
			} ),
		//handle when an item is removed from an array,
		//an event afterDel.1 will be raised
		removeTmplItem: {
			get: function( e ) {
				e.subscriber.children().eq( +childIndex( e ) ).remove();
			}
		},

		addClass: function( e ) {
			if (e.publisher.get()) {
				e.subscriber.addClass( this.options );
			} else {
				e.subscriber.removeClass( this.options );
			}
		},

		removeClass: function( e ) {
			if (e.publisher.get()) {
				e.subscriber.removeClass( this.options );
			} else {
				e.subscriber.addClass( this.options );
			}
		},

		//--------------add view handlers------------------------
		del: function( e ) {
			e.subscriber.del();
		},

		"++": function( e ) {
			e.subscriber.set( e.subscriber.get() + 1 );
		},
		"--": function( e ) {
			e.subscriber.set( e.subscriber.get() - 1 );
		},

		hardCode: {
			initialize: function( publisher, subscriber, handlerObj, options ) {
				handlerObj.hardCode = toTypedValue( options );
			},
			get: function( e ) {
				e.subscriber.set( this.hardCode );
			}
		},
		"null": function( e ) {
			e.subscriber.set( null );
		},
		"true": function( e ) {
			e.subscriber.set( true );
		},
		"false": function( e ) {
			e.subscriber.set( false );
		},
		toggle: function( e ) {
			var subscriber = e.subscriber;
			subscriber.set( !subscriber.get() );
		},
		zero: function( e ) {
			e.subscriber.set( 0 );
		},
		preventDefault: function( e ) {
			e.preventDefault();
		},
		stopPropagation: function (e) {
			e.stopPropagation();
		},
		alert: function( e ) {
			alert( isUndefined( this.options ) ? e.subscriber.get() : this.options );
		},
		log: function( e ) {
			console.log( isUndefined( this.options ) ? e.subscriber.get() : this.options );
		},
		sort: {
			initialize: function( publisher, subscriber, handlerObj, options ) {
				options = options.split( "," );
				handlerObj.by = options[0];
				handlerObj.asc = !!options[1];
			},
			get: function( e ) {
				e.subscriber.sort( this.by, this.asc );
				this.asc = !this.asc;
			}
		}
	} );

	//get the index of the item in a array
	function childIndex ( e ) {
		var diff = e.originalPublisher.path.substr( e.publisher.path.length + 1 ),
			positionOfDot = diff.indexOf( "." );
		return positionOfDot == -1 ? diff : diff.substr( 0, positionOfDot );
	}

	//the last view adapter will be matched first
	function findViewValueAdapter ( $elem, adpaterName ) {
		var i, viewValueAdapter;
		//the last view adapter will be matched first
		if (adpaterName) {
			for (i = viewValueAdapters.length - 1; i >= 0; i--) {
				viewValueAdapter = viewValueAdapters[i];
				if (viewValueAdapter.name == adpaterName) {
					return viewValueAdapter;
				}
			}
		} else {
			for (i = viewValueAdapters.length - 1; i >= 0; i--) {
				viewValueAdapter = viewValueAdapters[i];
				if (viewValueAdapter.match && viewValueAdapter.match( $elem )) {
					return viewValueAdapter;
				}
			}
		}
	}

	function getCheckableControlValue ( $elem ) {
		var elem = $elem[0];
		if (elem.value == "true") {
			return true;
		} else if (elem.value == "false") {
			return false;
		} else if (elem.value !== "on") {
			return elem.value;
		} else {
			return elem.checked;
		}
	}

	viewValueAdapters = [
		{
			//the default view adapter
			name: "textBoxOrDropDown",
			get: function( $elem ) {
				return $elem.val();
			},
			set: function( $elem, value ) {
				if ($elem.val() !== value) {
					$elem.val( value );
				}
			},
			match: returnTrue
			//			match: function( $elem ) {
			//				//return $elem.is( ":text,select:not([multiple])" );
			//			}
		},
		{
			name: "checkbox",
			get: getCheckableControlValue,
			set: function setCheckbox ( $elem, value ) {
				var elem = $elem[0];
				if (isBoolean( value )) {
					elem.checked = value;
				} else {
					elem.checked = (value == elem.value);
				}
			},
			match: function( $elem ) {
				return $elem.is( ":checkbox" );
			}
		},
		{
			name: "radio",
			get: getCheckableControlValue,
			set: function( $elem, value, e ) {
				var elem = $elem[0];
				if (!elem.name) {
					elem.name = e.publisher.path;
				}
				elem.checked = ( toString( value ) == elem.value );
			},
			match: function( $elem ) {
				return $elem.is( ":radio" );
			}
		},
		{
			name: "listBox",
			get: function( $elem ) {
				var options = [];
				$elem.children( "option:selected" ).each( function() {
					options.push( this.value );
				} );
				return options;
			},
			set: function( $elem, value ) {

				$elem.children( "option:selected" ).removeAttr( "selected" );

				function fn () {
					if (this.value == itemValue) {
						this.selected = true;
						return false;
					}
				}

				for (var i = 0, itemValue; i < value.length; i++) {
					itemValue = value[i];
					$elem.children( "option" ).each( fn );
				}
			},
			match: function( $elem ) {
				return $elem.is( "select[multiple]" );
			}
		}
	];

	//add view adapter
	//the last added using the method, will be evaluated first
	/*
	 a view adapter is is like {
	 name: "adapterName", //optional if match is present
	 get: function (e) {},
	 set: function( e, value ) {},
	 initialize: function ($elem) {}
	 match: function ($elem) { reutrn true; } //optional if name is present
	 }
	 * */
	via.addViewValueAdapters = function( viewValueAdapter ) {
		if (isArray( viewValueAdapter )) {
			for (var i = 0; i < viewValueAdapter.length; i++) {
				viewValueAdapters.push( viewValueAdapter[i] );
			}
			return;
		}
		viewValueAdapters.push( viewValueAdapter );
	};

	extend( customSubsProps, {

		caption: function( elem, parseContext, subscriptions, options ) {
			$( elem ).prepend( "<option value=''>" + options + "</option>" );
		},
		//#debug
		//use @debug
		debug: function( /*elem, parseContext, subscriptions, options*/ ) {
			debugger;
		},
		//#end_debug

		//it is used to synchronize control with viewAdapter with the model value
		//make sure you register the viewAdapter with the type of control
		//
		//@val:eventType,updateDirection,adapterName,
		// such as @val:keypress,updateModel,date
		val: function( elem, parseContext, subscriptions, options ) {

			var updateDirection,
				updateEvent,
				path = parseContext.ns;

			options = options || "";

			if (!options) {
				updateEvent = "change";
			} else {
				options = options.split( "," );
				updateEvent = options[0] || "change"; //by default it is "change"
				updateDirection = options[1]; //undefined, updateView or updateModel
			}

			if (!updateDirection || updateDirection == "updateView") {
				subscriptions.push( {
					publisher: path,
					eventTypes: "init1 after*",
					subscriber: elem,
					handler: "*updateViewValue",
					options: options[2]
				} );
			}

			if (!updateDirection || updateDirection == "updateModel") {

				subscriptions.push( {
					publisher: elem,
					eventTypes: updateEvent,
					subscriber: path,
					handler: "*updateModelValue",
					options: options[2]
				} );

			}

		},

		focus: function( elem ) {
			$( elem ).focus();
		},

		//data-sub="`updateButton"
		aliasEvent: function( elem, parseContext, subscriptions, options ) {
			setTimeout( function() {
				var i, events, eventPairs = options.split( ";" ),
					$view = $( elem );

				for (i = 0; i < eventPairs.length; i++) {
					events = eventPairs[i].split( "," );
					$view.aliasEvent( events[0], events[1] );
				}
			}, 1 );
		},

		init: function( elem, parseContext, subscriptions, options ) {
			var methodName = options;
			//var methodName = options.split( "," )[0];
			rootModel.get( methodName, elem, parseContext, subscriptions, options );
		}


	} );

	extend( viaClasses, {
		//	<tbody data-sub="`listView:.,#contactRow">
		//listView is used to render a list of items using a item template
		//the publisher should be a array model, the class can also update
		// the view, when the data change
		//
		//
		listView: //render whole list of items
			"!init after*.:.|*renderInside" +
				//render newly appended data item by appending it to end of the view
			"!afterCreate.1:.|*appendTmplItem" +
				//render the updated data item in the view
			"!afterUpdate.1:.|*updateTmplItem" +
				//delete the deleted data item in the view
			"!afterDel.1:.|*removeTmplItem",

		fullyLoadedListView: "!init after*:.|*renderInside",

		//a general class rule to synchronize
		// the control with viewAdapter to a model
		//`val:path
		//`val:path|keypress
		//`val:path|updateModel
		//`val:path|updateView
		val: "@val:.",

		//data-sub="`options:path"
		options: "!init after*:.|*options",

		//data-sub="`show:path"
		show: "!init after*:.|*show",

		//data-sub="`hide:path"
		hide: "!init after*:.|*hide",

		//data-sub="`enableLater:path"
		enableLater: "!after*:.|*enable",

		//data-sub="`disableLater:path"
		disableLater: "!after*:.|*disable",

		//data-sub="`enable:path"
		enable: "!init after*:.|*enable",

		//data-sub="`disable:path"
		disable: "!init after*:.|*disable",

		//data-sub="`html:path"
		html: "!init after*:.|get html *toString",

		//data-sub="`text:path"
		text: "!init after*:.|get text *toString",

		showPlural: "!init after*:.|*showPlural",

		//data-sub="`showValue:path"
		showValue: "!init after*:.|*showValue",

		textCount: "!init after*:.|*textCount",

		//data-sub"`alert:_,hello"
		//"hello" will be passed as options
		//and alert handler will alert it
		alert: "$click:.|*alert",

		preventDefault: "$click:.|*preventDefault",

		deleteButton: "@aliasEvent:click,delete",

		updateButton: "@aliasEvent:click,update",

		editButton: "@aliasEvent:click,edit",

		cancelButton: "@aliasEvent:click,cancel",

		pageButton: "@aliasEvent:click,changePage"

	} );

	$.createFilterEvent( "keyup", "enter",
		function( e ) {
			return (e.keyCode === 13);
		}
	).createFilterEvent( "keyup", "esc",
		function( e ) {
			return (e.keyCode === 27);
		}
	);

	//augment jQuery Event type
	//when you attach a handler to parent element to handle the event from children
	//we want to know the children element's row index of all the rows
	$.Event.prototype.selectedRowIndex = function() {
		return this.publisher.children().filter( this.originalPublisher.parents() ).index();
	};





})( jQuery, window );

