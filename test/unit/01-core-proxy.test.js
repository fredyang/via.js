module( "01-core-proxy.js" );
var shadowNamespace = via.shadowNamespace();

function assertEmptyDb() {
	//	ok( $.isEmptyObject( via.pureModel() ), "The root is empty" );
	//	ok( $.isEmptyObject( via.modelReferences ), "modelReferences is empty" );
	//	ok( $.isEmptyObject(via.getModelHandlerData()), "modelHandlerData is empty" );
	//	ok( $.isEmptyObject(via.getViewHandlerData()), "viewHandlerData is empty" );

	var empty = $.isEmptyObject( via.pureModel() )
		    && $.isEmptyObject( via.modelReferences )
		    && $.isEmptyObject( via.getModelHandlerData() )
		&& $.isEmptyObject( via.getViewHandlerData() );
	
	strictEqual(empty , true, "The root is empty");
}

test( "helper function test", function () {

	var items = [1, 2];
	equal( 0, items.indexOf( 1 ), "indexOf array always works" );
	ok( items.contains( 1 ), "array 'contains' method returns true when array contain element" );

	items.remove( 1 );

	ok( !items.contains( 1 ), "array 'contains' method return false when array does not contain element" );

	equal( -1, items.indexOf( 1 ), "array.remove(item1) can remove item1, and item1 is in array" );

	items.pushUnique( 2 );
	equal( 1, items.length, "array.pushUnique will not push an item, if an item is already in the list" );

	var objects = [
		{name:"b"},
		{name:"a"},
		{name:"c"}
	];

	objects.sortObject( "name" );

	equal( $.map( objects,
		function ( elem, index ) {
			return elem.name;
		} ).join( "" ), "abc", "array.sortObject(propertyName) can sort array in asc order" );

	objects.sortObject( "name", false );

	equal( $.map( objects,
		function ( elem, index ) {
			return elem.name;
		} ).join( "" ), "cba", "array.sortObject(propertyName, false) can sort array in desc order" );

	var testString = "abcdefg";
	ok( testString.beginsWith( "abc" ), "string.beginsWith(x) return true if it begins with x" );
	ok( testString.contains( "bcd" ), "string.contains(x) return true if it contains x" );

} );

test( "proxy creation test", function () {
	var rootProxy = via();
	strictEqual( "", rootProxy.context, "via() return rootProxy, and its context is empty string" );

	var rootShadowProxy = via( "*" );
	strictEqual( shadowNamespace, rootShadowProxy.context, "via(\"*\") return rootShadowProxy, and its context is via namespace" );

	var childProxy1 = rootProxy.childProxy( "*" );
	strictEqual( shadowNamespace, childProxy1.context, "proxy.subProxy(\"*\") return rootShadowProxy, and its context is via namespace" );

	ok( rootProxy === childProxy1.popProxy(), "proxy.popProxy() can return the popProxy" );

	equal( rootProxy.shadowProxy().context, rootShadowProxy.context, "proxy.shadowProxy() can return shadow proxy" );

	equal( rootProxy.context, rootShadowProxy.mainProxy().context, "proxy.unShadowProxy() can return original proxy" );

	ok( "" === rootProxy.parentProxy().context, "rootProxy.parentProxy() return a rootProxy" );

	var invalidProxy = via( "invalid" );
	ok( true, "via(invalidPath) will not throw exception" );

	var invalidShadowProxy = via( "invalid*" );
	ok( true, "via(invalidShadowPath*) will not throw exception" );
	strictEqual( invalidShadowProxy.get(), undefined, "If a model has no value, then its shadow will not be automatic created" );

	via().create( "invalid", {} );
	strictEqual( invalidShadowProxy.get(), undefined, "If a model has no value, the original shadowProxy still gets nothing" );

	via().del( "invalid" );
	strictEqual( invalidProxy.get(), undefined, "After a model, proxy.get() will get undefined" );

	//
	via().create( "valid", {} );
	ok( via().get( "valid*" ), "If a model has value, then its shadow will be automatic created" );
	via().del( "valid" );
	strictEqual( via().get( "valid*" ), undefined, "after a path of a proxy is deleted, then its shadow will be automatic deleted" );

} );

test( "via.toPhysicalPath and via.toLogicalPath test", function () {

	equal( "", via.toPhysicalPath( '' ), "via.toPhysicalPath('') == ''" );
	equal( "__via", via.toPhysicalPath( '*' ), "via.toPhysicalPath('') == '__via'" );
	equal( "a.b", via.toPhysicalPath( 'a.b' ), "via.toPhysicalPath('a.b') == 'a.b'" );
	equal( "__via.a_b", via.toPhysicalPath( 'a.b*' ), "via.toPhysicalPath('a.b*') == '__via.a_b'" );
	equal( "__via.a_b.c.d", via.toPhysicalPath( 'a.b*c.d' ), "via.toPhysicalPath('a.b*c.d') == '__via.a_b.c.d'" );
	equal( "__via.c.d", via.toPhysicalPath( '*c.d' ), "via.toPhysicalPath('*c.d') == '__via.c.d'" );

	equal( "*", via.toLogicalPath( '__via' ), "via.toLogicalPath('__via') == '*'" );
	equal( "a.b", via.toLogicalPath( 'a.b' ), "via.toLogicalPath('a.b') == 'a.b'" );
	equal( "a.b*", via.toLogicalPath( '__via.a_b' ), "via.toLogicalPath('__via.a_b') == 'a.b*'" );
	equal( "a.b*c.d", via.toLogicalPath( '__via.a_b.c.d' ), "via.toLogicalPath('__via.a_b.c.d') == 'a.b*c.d'" );

} );

test( "test proxy prototype extension", function () {
	var fn = via.fn;
	ok( via.fn, "via.fn (prototype) is defined" )
	ok( fn.create && fn.update && fn.del && fn.get, "prototype has basic function like create/update/remove/get" );

	var rootProxy = via();
	ok( !rootProxy.member1, "proxy does not have member1" );
	fn.member1 = {};
	ok( rootProxy.member1, "after proxy prototype is added with member1, proxy now have member1" );
	delete fn.member1;
	ok( !rootProxy.member1, "after delete member1 from proxy prototype, proxy does not have member1" );
} );

test( "basic CRUD method of proxy", function () {

	var rootProxy = via();
	var path = "a";
	var value = "a";
	var newValue = "b";
	var result;

	var root = rootProxy.get();

	ok( rootProxy.get(), "rootProxy.get() return the root" );
	ok( root[shadowNamespace], "root has private storage as root[shadowNamespace]" );

	result = rootProxy.create( path, value );
	equal( result, rootProxy, "rootProxy.create(path, value) return the proxy itself" );
	equal( value, rootProxy.get( path ), "rootProxy.get( path ) can retrieve the value set by" +
	                                     " rootProxy.create(path, value)" );

	result = rootProxy.update( path, newValue );
	equal( result, rootProxy, "rootProxy.update(path, value) return the proxy itself" );
	equal( rootProxy.get( path ), newValue, " rootProxy.get( path ) can retrieve the value" +
	                                        " updated by rootProxy.update(path, newValue)" );

	result = rootProxy.del( path );
	equal( rootProxy.get( path ), undefined, "rootProxy.remove(path) can delete the value" +
	                                         " at path" );

	var invalidPath = "djfkjdfk.jkjdfkj";

	raises( function () {
		rootProxy.get( invalidPath );
	}, function ( e ) {
		var reg = new RegExp( invalidPath );
		return !!reg.exec( e );
	}, "rootProxy.get(invalidPath) will result invalid path exception" );

	raises( function () {
		rootProxy.create( invalidPath, value );
	}, function ( e ) {
		var reg = new RegExp( invalidPath );
		return !!reg.exec( e );
	}, "rootProxy.create(invalidPath, value) will result invalid path exception" );

	raises( function () {
		rootProxy.update( invalidPath, value );
	}, function ( e ) {
		var reg = new RegExp( invalidPath );
		return !!reg.exec( e );
	}, "rootProxy.update(invalidPath, value) will result invalid path exception" );

	raises( function () {
		rootProxy.del( invalidPath );
	}, function ( e ) {
		var reg = new RegExp( invalidPath );
		return !!reg.exec( e );
	}, "rootProxy.remove(invalidPath) will result invalid path exception" );

} );

test( "other CRUD method of proxy", function () {

	var obj = {
		a: "a",
		b: "b"
	};
	via().create( obj );

	deepEqual( via.pureModel(), obj, "you can create complex object like proxy.create(obj) as a shortcut to proxy.create(path, obj)" );

	var obj2 = {
		a: "a2",
		b: "b2"
	};

	via().updateAll( obj2 );
	deepEqual( via.pureModel(), obj2, "you can create complex object like proxy.create(obj) as a shortcut to proxy.create(path, obj)" );

	via().createOrUpdate( "a", "a2" );
	equal( via().get( "a" ), "a2", "createOrUpdate will update if path exists" );

	via().createOrUpdate( "c", "c" );
	equal( via().get( "c" ), "c", "createOrUpdate will create if path not exists" );

	via().createIfUndefined( "a", "a3" );
	equal( via().get( "a" ), "a2", "createIfUndefined will not create if path exists" );

	via().createIfUndefined( "d", "d" );
	equal( via().get( "d" ), "d", "createIfUndefined will create if path not exists" );

	via.empty();
} );

test( "test reference integrity in model remove", function () {
	var rootProxy = via();

	var jsonObject = {
		a: "a",
		b: {
			c: "c"
		},
		d: function() {
			return this.a;
		},
		e: function () {
			return this.d();
		}
	};

	rootProxy.create( jsonObject );
	deepEqual( {
		a: "a",
		b: {
			c: "c"
		},
		d: "a",
		e: "a"
	}, {
		a: rootProxy.get( "a" ),
		b: rootProxy.get( "b" ),
		d: rootProxy.get( "d" ),
		e: rootProxy.get( "e" )
	}, "rootProxy.create(jsonObject) will extend objDb" );

	deepEqual( via.modelReferences["a"], ["d"], "via.create() will parse dependencies" +
	                                            "within value, and do something like " +
	                                            "via.modelReferences[referencedPath].push(referencingPath)" );

	deepEqual( via.modelReferences["d"], ["e"], "via.create() will parse dependencies" +
	                                            "within value, and do something like " +
	                                            "via.modelReferences[referencedPath].push(referencingPath)" );

	equal( rootProxy.get( "d" ), "a", "proxy.get(functionPath) will evaluate " +
	                                  "the function instead of returning the function" );
	//e-->d --> a
	raises( function () {
		rootProxy.del( "a" );
	}, "rootProxy.remove(referencedPath) will result in exception, because the path is" +
	   " referenced by other path" );

	raises( function () {
		rootProxy.del( "d" );
	}, "rootProxy.remove(referencedPath) will result in exception, because the path is" +
	   " referenced by other path" );

	rootProxy.del( "e" );

	deepEqual( via.modelReferences["d"], undefined, "after a path is deleted, the reference where the path is in referencing role, it is deleted. " );

	rootProxy.del( "d" );

	deepEqual( via.modelReferences["a"], undefined, "after a path is deleted, the reference where the path is in referencing role, it is deleted. " );

	rootProxy.del( "a" );

	ok( true, "after referencing path is removed, referenced path can be removed" );

	rootProxy.del( "b" );
	assertEmptyDb();
} );

test( "remove model by force", function () {
	via().create( {
		a: "a",
		b: function () {
			return this.a;
		}
	} );

	raises( function () {
		via().del( "a" );
	}, "path can not be deleted, if it is referenced" );

	via().del( "a", true );
	ok( true, "your can remove a path by force, even it is referenced" );
	equal( undefined, via.modelReferences["a"], "after a path is deleted, the reference where the path is in referenced role" );

	via().del( "b" );

} );

test( "get function or function result in model using keepOriginal parameter", function () {
	var fn = function () {
		return "x";
	};

	var keepOriginal = true;

	via().create( "f", fn );
	equal( via().get( keepOriginal, "f" ), fn, "if the keepOriginal parameter in get(keepOriginal, path) is true, then it will return the original" );
	equal( via().get( "f" ), "x", "if the keepOriginal parameter in get(keepOriginal, path) is false, then it will return evaluation" );
	via().del( "f" );

} );

test( "proxy navigation1", function () {

	var originalProxy = via( "a" );
	var childProxy = originalProxy.childProxy( "b" );
	equal( childProxy.context, "a.b", "can navigate to childProxy" );
	var shadowProxy = originalProxy.shadowProxy();
	equal( shadowProxy.context, "__via.a", "can navigate to shadowProxy" );
	var mainProxy = shadowProxy.mainProxy();
	equal( mainProxy.context, "a", "can navigate back to mainProxy" );
	var popProxy = mainProxy.popProxy();
	equal( popProxy, shadowProxy, "popProxy can pop out the old proxy" );

} );

test( "proxy navigation2", function () {
	via().create( {
		a: {
			b: {
				c: "c"
			}
		}
	} );
	var originalProxy = via( "a" );
	var childProxy = originalProxy.childProxy( "b.c" );
	equal( childProxy.context, "a.b.c", "can navigate to childProxy" );
	var shadowProxy = childProxy.shadowProxy();
	equal( shadowProxy.context, "__via.a_b_c", "can navigate to shadowProxy" );
	var mainProxy = shadowProxy.mainProxy();
	equal( mainProxy.context, "a.b.c", "can navigate back to mainProxy" );
	var popProxy = mainProxy.popProxy();
	equal( popProxy, shadowProxy, "popProxy can pop out the old proxy" );

	via().del( "a" );

} );

test( "helpers", function () {
	ok( via.isPrimitive( null ), "null is primitive" );
	ok( via.isPrimitive( undefined ), "undefined is primitive" );
	ok( via.isPrimitive( true ), "boolean is primitive" );
	ok( via.isPrimitive( 1 ), "number is primitive" );
	ok( via.isPrimitive( "s" ), "string is primitive" );

	var obj = {
		a: "a",
		b: "b",
		c: {
			d: "d"
		}
	}

	via.clearObj( obj );
	deepEqual( obj, {
		a: null,
		b: null,
		c: {
			d: null
		}
	}, "via.clearObj(obj) can empty primitive value inside" );

	via.addRef( "a", "b" );
	deepEqual( via.modelReferences["b"], ["a"], "via.addRef will make via.modelReferences increment" );

	via.addRef( "a", "b" );
	equal( via.modelReferences["b"].length, 1, "adding the same ref using via.addRef will not succeed" );

	via.removeRef( "a", "b" );
	ok( !via.modelReferences["b"], "via.removeRef will remove the reference" );

	var options = via.options();
	ok( options, "via.options() will return the options object" );

	via.options( "a", "a" );
	equal( options.a, "a", "via.options(key, value) can set options" );
	equal( via.options( "a" ), "a", "via.options(key) can get value" );

	via.options( "a", undefined );
	ok( !("a" in options), "via.options(key, undefined) will delete the key in options" );

} );

test( "array method of proxy", function () {

	function getModelEventForCompare( modelEvent ) {
		var rtn = {
			path: modelEvent.path,
			eventType: modelEvent.eventType,
			target: modelEvent.target
		};

		if ( "removed" in modelEvent ) {
			rtn.removed = modelEvent.removed;
		}

		return rtn;
	}

	ok( via.fn.indexOf, "proxy array is defined" );
	var path = "array";
	var array = ["a", "b", "c"];
	var item1 = "d";

	via().create( path, array );
	var proxy = via( path );
	var view = {};

	var modelEventForCompare;
	var originalModelEvent;

	via.addModelHandler( path, "after*|init", view, function ( modelEvent ) {
		modelEventForCompare = getModelEventForCompare( modelEvent );
		originalModelEvent = modelEvent;
	} );

	equal( proxy.first(), "a", "proxy.firstItem can return the last item in the array" );
	equal( proxy.last(), "c", "proxy.lastItem can return the last item in the array" );
	equal( proxy.count(), 3, "proxy.itemCount() can return the length of the array" );

	equal( proxy.indexOf( "b" ), 1, "proxy.indexOfItem return the index of item in array" );
	proxy.push( item1 );
	equal( array[3], item1, "proxy.appendItem return the index" );

	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "afterCreate.child",
		target: path + "." + (array.length - 1)
	}, "proxy.appendItem will trigger expected event" );

	var removedItem = proxy.pop();

	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "afterDel.child",
		target: path + ".3",
		removed: item1
	}, "proxy.popItem will trigger expected event" );

	proxy.insertAt( 1, item1 );
	deepEqual( proxy.get(), ["a", "d", "b", "c"], "proxy.insertItemAt will can create the " +
	                                              "value at the index" );
	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "afterCreate",
		target: path + ".1"
	}, "the modelEvent in modelHandler is expected, after calling proxy.insertItemAt" );

	proxy.removeItem( item1 );
	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "afterDel.child",
		target: path + ".1",
		removed: item1
	}, "the modelEvent in modelHandler is expected, after calling proxy.removeItem" );

	deepEqual( array, ["a", "b", "c"], "proxy.removeItem is success" );

	proxy.prepend( item1 );
	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "afterCreate",
		target: path + ".0"
	}, " the modelEvent in modelHandler is expected, after calling proxy.prependItem" );

	proxy.removeItem( item1 );
	deepEqual( array, ["a", "b", "c"], "array is reset by proxy.removeItem()" );

	proxy.swap( "a", "a1" );
	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "afterUpdate.child",
		target: path + ".0",
		removed: "a"
	}, " the modelEvent in modelHandler is expected, after calling proxy.replaceItem" );
	proxy.swap( "a1", "a" );
	deepEqual( array, ["a", "b", "c"], "array is reset by proxy.replaceItem()" );

	proxy.clear();
	deepEqual( modelEventForCompare, {
		path: path,
		eventType: "init",
		target: path
	}, " the modelEvent in modelHandler is expected, after calling proxy.clearItems" );
	deepEqual( array, [], "after proxy.clearItems() is called, the array is empty" );

	proxy.push( "b" );
	proxy.push( "c" );
	proxy.push( "a" );

	deepEqual( array, ["b", "c", "a"], "the result before sort is expected" );

	via().del( path );
	via.removeView( view );
	assertEmptyDb();

} );