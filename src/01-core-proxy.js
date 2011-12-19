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
		shadowNamespace = "__via",
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
		shadowRoot = root[shadowNamespace] = {},
		rUnderScore = /_/g,
		rDot = /\./g,
		hasOwn = root.hasOwnProperty,
		arrayPrototype = Array.prototype,
		slice = arrayPrototype.slice,
		//to be override in 03-modelHandler
		raiseEvent;

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
		if ( via.debug.enableLog && this.console ) {
			console.log( Array.prototype.slice.call( arguments ) );
		}
	};
	//#end_debug

	//#merge
	raiseEvent = function ( currentPath, targetPath, eventType, proposed, removed ) {};

	via._setRaiseEvent = function( fn ) {
		raiseEvent = fn;
	};
	//#end_merge

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

		version: "@version",

		constructor: Proxy,

		pushProxy: function ( newProxy ) {
			newProxy.oldProxy = this;
			return newProxy;
		},

		childProxy: function( childPath ) {
			return this.pushProxy( new Proxy( joinPath( this.context, childPath ) ) );
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
			if ( this.context === shadowNamespace ) {
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
			return toLogicalPath( joinPath( this.context, subPath ) );
		},

		//to get the physicalPath of current proxy, leave subPath empty
		physicalPath: function ( subPath ) {
			return toPhysicalPath( joinPath( this.context, subPath ) );
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

			traverseModel( physicalPath, removedValue, false, function ( contextPath, index ) {
				log( "deleting children of " + contextPath + "." + index );
				rootProxy.del( contextPath + "." + index, force );
			} );

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
			logicalPath = joinPath( context, subPath ),
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
			return shadowNamespace;
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

			var fullShadowPath = shadowNamespace + "." + flatPhysicalMainPath;
			if ( !shadowRoot[flatPhysicalMainPath] && rootProxy.get( mainPath ) !== undefined ) {
				rootProxy.create( fullShadowPath, new Shadow( mainPath ) );
			}
		}

		return !flatPhysicalMainPath ?
			shadowNamespace + "." + childPath : //this is the case of "*b"
			childPath ?
				shadowNamespace + "." + flatPhysicalMainPath + "." + childPath : //this is the case of "a*b"
				shadowNamespace + "." + flatPhysicalMainPath; //this is the case of "a*"
	}

	function toLogicalPath( physicalPath ) {
		if ( physicalPath === shadowNamespace ) {
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

	//combine context and subPath to be a full a path
	//input : "a", "b" -> "a.b"
	//"a*" , "b" -> "a*b"
	//"a", "*"b" -> "a*b"
	function joinPath( context, subPath ) {
		return !subPath ? context :
			context ? context + (subPath.toString().beginsWith( "*" ) ? subPath : "." + subPath)
				: subPath;
	}

	//helpers
	extend( via, {

		fn: proxyPrototype,

		accessor: getAccessor,

		toPhysicalPath : toPhysicalPath,

		toLogicalPath : toLogicalPath,

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

		shadowNamespace: function () {
			return shadowNamespace;
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
			if ( !path.beginsWith( shadowNamespace ) ) {
				rootProxy.del( shadowNamespace + "." + path.replace( rDot, "_" ) );
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
			delete rtn[shadowNamespace];
			return rtn;
		},

		//empty everything in the repository
		empty: function () {
			for ( var key in root ) {
				if ( key !== shadowNamespace ) {
					rootProxy.del( key, true );
				}
			}
		}
	} );

	rootProxy = new Proxy( "" );

	//#merge
})( jQuery, window );
//#end_merge