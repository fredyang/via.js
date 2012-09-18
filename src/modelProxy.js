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
		rWatchedPath = /this\.(?:get)\s*\(\s*(['"])([\*\.\w/]+)\1\s*\)/g,

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

	//#merge
	trigger = function( currentTargetPath, targetPath, eventType, proposed, removed ) {
		return {
			hasError: function() {
				return false;
			}
		};
	};

	via._setTrigger = function( fn ) {
		trigger = fn;
	};
	//#end_merge

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
			return this;
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

			var originalValue = accessor.hostObj[accessor.index];
			//use "==" is purposeful, we want it to be little bit
			//flexible for example, if model value is null
			//and textbox value is "", we don't want to "" to
			//be set, same for "9" and 9
			if (originalValue == value) {
				return this;
			}

			if (!force && trigger( physicalPath, physicalPath, beforeUpdate, value ).hasError()) {
				return false;
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

			var accessor = this.accessor( subPath ),
				hostObj = accessor.hostObj,
				physicalPath = accessor.physicalPath,
				isHostObjectArray = isArray( hostObj );

			if (trigger( physicalPath, physicalPath, "beforeDel" ).hasError()) {
				return false;
			}

			var removedValue = hostObj[accessor.index];

			if (isHostObjectArray) {

				hostObj.splice( accessor.index, 1 );

			} else {

				delete hostObj[accessor.index];

			}

			for (var i = 0; i < disposingModelCallbacks.length; i++) {
				disposingModelCallbacks[i]( physicalPath, accessor.logicalPath, isHostObjectArray );
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
			trigger( this.path, this.path, "afterCreate" );
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
		},

		toJSON: function( subPath ) {
			return JSON.stringify( this.get( subPath ) );
		},

		compare: function( expression ) {
			return eval( "this.get()" + expression );
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
		//or it has a magic function name "_"
		if (!isFunction( value ) || value.name == "_") {
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

	function makeSome ( seeds ) {
		var rtn = [];
		for (var i = 0; i < seeds.length; i++) {
			rtn.push( new this( seeds[i] ) );
		}
		return rtn;
	}

	//helpers
	extend( via, {

		util: util = {

			factory: function( constructor, prototype ) {
				var F, rtn;

				if (isFunction( constructor )) {

					F = constructor;

				} else {

					F = function() {};
					prototype = constructor;
					constructor = function( seed ) {
						extend( this, seed );
					};
				}

				extend( F.prototype, prototype );
				rtn = function() {
					var f = new F();
					constructor.apply( f, arguments );
					return f;
				};

				rtn.makeSome = makeSome;
				return rtn;
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
			},

			_modelLinks: modelLinks

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
				return remaining ?
					(mergedContext ? mergedContext + match[2] + remaining : remaining) :
					(match[2] === "*" ? mergedContext + "*" : mergedContext);

				//if subPath is like .ab or *ab
			}
			return context + subPath;
		}
	} );

	$( "get,set,del,extend".split( "," ) ).each( function( index, value ) {
		via[value] = function() {
			return rootModel[value].apply( rootModel, slice.call( arguments ) );
		};
	} );

	rootModel = via();

	//#merge
	via.debug.shadowNamespace = shadowNamespace;
	via.debug.parseWatchedPaths = parseWatchedPaths;
	via.debug.removeAll = function() {
		for (var key in repository) {
			if (key !== shadowNamespace) {
				rootModel.del( key, true );
			}
		}
	};
	//#end_merge

	//#merge
})( jQuery, window );
//#end_merge