module( "01-core-proxy.js" );
var ns = via.ns();

test( "Array prototype test", function () {

	var x = [1, 2];
	equal( 0, x.indexOf( 1 ), "indexOf array always works" );
	x.remove( 1 );
	equal( -1, x.indexOf( 1 ), "array.remove(item1) can remove item1, and item1 is in array" );

	x.pushUnique( 2 );
	equal( 1, x.length, "array.pushUnique will not push an item, if an item is already in the list" );

} );

test( "proxy creation test", function () {
	var rootProxy = via();
	strictEqual( "", rootProxy.context, "via() return rootProxy, and its context is empty string" );

	var rootShadowProxy = via( "*" );
	strictEqual( ns, rootShadowProxy.context, "via(\"*\") return rootShadowProxy, and its context is via namespace" );

	var childProxy1 = rootProxy.childProxy( "*" );
	strictEqual( ns, childProxy1.context, "proxy.subProxy(\"*\") return rootShadowProxy, and its context is via namespace" );

	ok( rootProxy === childProxy1.popProxy(), "proxy.popProxy() can return the popProxy" );

	equal( rootProxy.shadowProxy().context, rootShadowProxy.context, "proxy.shadowProxy() can return shadow proxy" );

	equal( rootProxy.context, rootShadowProxy.mainProxy().context, "proxy.unShadowProxy() can return original proxy" );

	ok( "" === rootProxy.parentProxy().context, "rootProxy.parentProxy() return a rootProxy" );

	var invalidProxy = via( "invalid" );
	ok( true, "via(invalidPath) will not throw exception" );

	var invalidShadowProxy = via( "invalid*" );
	ok( true, "via(invalidShadowPath*) will not throw exception" );
	strictEqual( invalidShadowProxy.get(), undefined, "after a path has not value, then its shadow will not be automatic created" );

	via().create( "invalid", {} );
	strictEqual( invalidShadowProxy.get(), undefined, "after a path has value, the original shadowProxy still gets nothing" );
	via().del( "invalid" );
	strictEqual( invalidProxy.get(), undefined, "after a path of a proxy is deleted, proxy.get() will get undefined" );

	//
	via().create( "valid", {} );
	ok( via().get( "valid*" ), "if a path has value, then its shadow will be automatic created" );
	via().del( "valid" );
	strictEqual( via().get( "valid*" ), undefined, "after a path of a proxy is deleted, then its shadow will be automatic deleted" );

} );

test("via.physicalPath and via.logicalPath test", function () {

	equal("", via.physicalPath(''), "via.physicalPath('') == ''");
	equal("__via", via.physicalPath('*'), "via.physicalPath('') == '__via'");
	equal("a.b", via.physicalPath('a.b'), "via.physicalPath('a.b') == 'a.b'");
	equal("__via.a_b", via.physicalPath('a.b*'), "via.physicalPath('a.b*') == '__via.a_b'");
	equal("__via.a_b.c.d", via.physicalPath('a.b*c.d'), "via.physicalPath('a.b*c.d') == '__via.a_b.c.d'");
	equal("__via.c.d", via.physicalPath('*c.d'), "via.physicalPath('*c.d') == '__via.c.d'");

	equal("*", via.logicalPath('__via'), "via.logicalPath('__via') == '*'");
	equal("a.b", via.logicalPath('a.b'), "via.logicalPath('a.b') == 'a.b'");
	equal("a.b*", via.logicalPath('__via.a_b'), "via.logicalPath('__via.a_b') == 'a.b*'");
	equal("a.b*c.d", via.logicalPath('__via.a_b.c.d'), "via.logicalPath('__via.a_b.c.d') == 'a.b*c.d'");

});

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

test( "basic CRUD operation", function () {

	var rootProxy = via();
	var path = "a";
	var value = "a";
	var newValue = "b";
	var result;

	var root = rootProxy.get();

	ok( rootProxy.get(), "rootProxy.get() return the root" );
	ok( root[ns], "root has private storage as root[ns]" );

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

test( "other CRUD method", function () {

	var obj = {
		a: "a",
		b: "b"
	};
	via().create( obj );

	deepEqual( via.getAll(), obj, "you can create complex object like proxy.create(obj) as a shortcut to proxy.create(path, obj)" );

	var obj2 = {
		a: "a2",
		b: "b2"
	};

	via().updateAll( obj2 );
	deepEqual( via.getAll(), obj2, "you can create complex object like proxy.create(obj) as a shortcut to proxy.create(path, obj)" );

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
	var emptyDb = {
		__via: {
		}
	};
	var r = rootProxy.get();
	delete r.__via.validated;

	deepEqual( r, emptyDb, "via.clear() will empty via.debug.objDb" );
} );

test( "test removed by forced", function () {
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

test( "test get keep original", function () {
	var fn = function () {
		return "x";
	};

	via().create( "f", fn );

	equal( via().get( true, "f" ), fn, "if the keepOriginal parameter in get(keepOriginal, path) is true, then it will return the original" );

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

	via.clearObj(obj);
	deepEqual(obj, {
		a: null,
		b: null,
		c: {
			d: null
		}
	}, "via.clearObj(obj) can empty primitive value inside");

	via.addRef("a", "b");
	deepEqual(via.modelReferences["b"], ["a"], "via.addRef will make via.modelReferences increment");
	via.addRef("a", "b");
	equal(via.modelReferences["b"].length, 1, "adding the same ref using via.addRef will not succeed");
	via.removeRef("a", "b");
	ok(!via.modelReferences["b"], "via.removeRef will remove the reference");

	var options = via.options();
	ok(options, "via.options() will return the options object");
	via.options("a", "a");
	equal(options.a, "a", "via.options(key, value) can set options");
	equal(via.options("a"), "a", "via.options(key) can get value");
	via.options("a", undefined);
	ok(!("a" in options), "via.options(key, undefined) will delete the key in options");

} );

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

test( "proxy array method test", function () {
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

	via().del(path);
	via.removeView(view);
	assertEmptyDb();

} );