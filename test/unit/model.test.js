module( "model.js" );
var shadowNamespace = via.debug.shadowNamespace;
var rootModel = via();
via.options.autoImportSubs = false;

function testArea () {
	return $( "#qunit-fixture" );
}

function assertEmptyDb () {
	debug.removeAll();
	var root = via.get();
	var rootCopy = $.extend( {}, root );
	delete rootCopy.__via;

	var empty = $.isEmptyObject( rootCopy )
		&& $.isEmptyObject( via.util._modelLinks );

	if (via.subscriptions) {
		empty = empty && (via.subscriptions().length === 0);
	}
	ok( empty, "The root is empty" );
}

test( "array prototype extension", function() {

	var items = [1, 2];
	equal( 0, items.indexOf( 1 ), "indexOf array always works" );
	ok( items.contains( 1 ), "array 'contains' method returns true when array contain element" );

	items.remove( 1 );

	ok( !items.contains( 1 ), "array 'contains' method return false when array does not contain element" );

	equal( -1, items.indexOf( 1 ), "array.remove(item1) can remove item1, and item1 is in array" );

	items.pushUnique( 2 );
	equal( 1, items.length, "array.pushUnique will not push an item, if an item is already in the list" );

	var objects = [
		{name: "b"},
		{name: "a"},
		{name: "c"}
	];

	objects.sortObject( "name" );

	equal( $.map( objects,
		function( elem, index ) {
			return elem.name;
		} ).join( "" ), "abc", "array.sortObject(propertyName) can sort array in asc order" );

	objects.sortObject( "name", false );

	equal( $.map( objects,
		function( elem, index ) {
			return elem.name;
		} ).join( "" ), "cba", "array.sortObject(propertyName, false) can sort array in desc order" );

	var testString = "abcdefg";
	ok( testString.startsWith( "abc" ), "string.startsWith(x) return true if it begins with x" );
	ok( testString.endsWith( "efg" ), "string.endsWith(x) return true if it ends with x" );
	ok( testString.contains( "bcd" ), "string.contains(x) return true if it contains x" );

} );

test( "toTypedValue", function() {

	var toTypedValue = via.util.toTypedValue;
	ok( toTypedValue( "abc" ) === "abc", "a string can not be convert to other type will not be converted" );
	ok( toTypedValue( "1" ) === 1, "convert a number" );
	ok( toTypedValue( "true" ) === true, "convert true" );
	ok( toTypedValue( "false" ) === false, "convert false" );
	ok( toTypedValue( "" ) === "", "empty string will not be converted" );
	ok( toTypedValue( "undefined" ) === undefined, "can convert undefined" );
	deepEqual( toTypedValue( '{"name":"hello"}' ), {name: "hello"}, "can convert json object" );
	notEqual( toTypedValue( "{'name':'hello'}" ), {name: "hello"}, "single quote ' style json string" +
	                                                               " can not be converted json object" );
} );

test( "model creation", function() {
	strictEqual( "", rootModel.path, "via() return rootModel, and its context is empty string" );

	var rootShadowModel = via( "*" );
	strictEqual( rootShadowModel.path, shadowNamespace, "via(\"*\") return rootShadowModel, and its context is via namespace" );

	var rootShadowModel2 = rootModel.cd( "*" );
	equal( rootShadowModel2.path, shadowNamespace, "rootModel.cd(\"*\") return rootShadowModel2, and its context is via namespace" );

	ok( rootModel === rootShadowModel2.previous, "model.previous can return the previous model" );

	equal( rootModel.shadowModel().path, rootShadowModel.path, "model.shadowModel() can return shadow model" );

	equal( rootShadowModel.mainModel().path, rootModel.path, "model.mainModel() can return original model" );

	ok( "" === rootModel.parentModel().path, "rootModel.parentModel() return a rootModel" );

	var unExistsPath = via( "unExistsPath" );
	ok( true, "via(unExistsPath) will not throw exception" );

	var shadowOfUnExistsPath = via( "unExistsPath*" );
	ok( true, "via(unExistsPath*) will not throw exception" );

	strictEqual( shadowOfUnExistsPath.get(), undefined, "If a main model is undefined, then its shadow will not be automatic created" );

	rootModel.create( "unExistsPath", {} );
	strictEqual( shadowOfUnExistsPath.get(), undefined, "If a shadow model is created before main model is created," +
	                                                    "after main model is created, the shadow model" +
	                                                    "still cannot get the value of shadow model" );
	var shadowOfUnExistsPath2 = via( "unExistsPath*" );

	ok( shadowOfUnExistsPath2.get(), "after a main model is created, accessing its " +
	                                 "shadow will return a model, because shadow model will be" +
	                                 "automatically created  when it is accessed after" +
	                                 "its mail model has been defined" );

	rootModel.del( "unExistsPath" );
	strictEqual( unExistsPath.get(), undefined, "After a model, model.get() will get undefined" );
	strictEqual( rootModel.get( "unExistsPath*" ), undefined, "after a path of a model is deleted, then its shadow will be automatic deleted" );

} );

test( "via.toPhysicalPath and via.toLogicalPath", function() {
	var toPhysicalPath = via.util.toPhysicalPath;
	var toLogicalPath = via.util.toLogicalPath;
	equal( toPhysicalPath( '' ), "", "via.toPhysicalPath('') == ''" );
	equal( toPhysicalPath( '*' ), "__via", "via.toPhysicalPath('') == '__via'" );
	equal( toPhysicalPath( 'a.b' ), "a.b", "via.toPhysicalPath('a.b') == 'a.b'" );
	equal( toPhysicalPath( 'a.b*' ), "__via.a#b", "via.toPhysicalPath('a.b*') == '__via.a#b'" );
	equal( toPhysicalPath( 'a.b*c.d' ), "__via.a#b.c.d", "via.toPhysicalPath('a.b*c.d') == '__via.a#b.c.d'" );
	equal( toPhysicalPath( '*c.d' ), "__via.c.d", "via.toPhysicalPath('*c.d') == '__via.c.d'" );

	equal( toLogicalPath( '__via' ), "*", "via.toLogicalPath('__via') == '*'" );
	equal( toLogicalPath( 'a.b' ), "a.b", "via.toLogicalPath('a.b') == 'a.b'" );
	equal( toLogicalPath( '__via.a#b' ), "a.b*", "via.toLogicalPath('__via.a#b') == 'a.b*'" );
	equal( toLogicalPath( '__via.a#b.c.d' ), "a.b*c.d", "via.toLogicalPath('__via.a#b.c.d') == 'a.b*c.d'" );
} );

test( "extend model prototype", function() {
	var fn = via.fn;
	ok( via.fn, "via.fn (prototype) is defined" )
	ok( fn.create && fn.update && fn.del && fn.get, "prototype has basic function like create/update/remove/get" );

	ok( !rootModel.newMember, "model does not have newMember" );
	fn.newMember = {};
	ok( rootModel.newMember, "after model prototype is added with newMember, model now have newMember" );
	delete fn.newMember;
	ok( !rootModel.newMember, "after delete newMember from model prototype, model does not have newMember" );
} );

test( "basic CRUD method of model", function() {

	var path = "a";
	var value = "a";
	var newValue = "b";
	var result;

	ok( rootModel.get(), "rootModel.get() return the root" );
	ok( rootModel.get()[shadowNamespace], "By default, root has private storage as root[shadowNamespace]" );

	result = rootModel.create( path, value );
	equal( result, rootModel, "rootModel.create(path, value) return the model itself" );
	equal( value, rootModel.get( path ), "rootModel.get( path ) can retrieve the value set by" +
	                                     "root.create(path, value)" );

	result = rootModel.update( path, newValue );
	equal( result, rootModel, "rootModel.update(path, value) return the model itself" );
	equal( rootModel.get( path ), newValue, "root.get( path ) can retrieve the value" +
	                                        " updated by rootModel.update(path, newValue)" );

	rootModel.del( path );
	equal( rootModel.get( path ), undefined, "rootModel.remove(path) can delete the value" +
	                                         " at path" );

	var unExistsMultiSegmentPath = "djfkjdfk.jkjdfkj";

	strictEqual( rootModel.get( unExistsMultiSegmentPath ), undefined, "rootModel.get(invalidPath) will return undefined" );

	raises( function() {
		rootModel.create( unExistsMultiSegmentPath, value );
	}, function( e ) {
		var reg = new RegExp( unExistsMultiSegmentPath );
		return !!reg.exec( e );
	}, "rootModel.create(unExistsMultiSegmentPath, value) will result invalid path exception" );

	raises( function() {
		rootModel.update( unExistsMultiSegmentPath, value );
	}, function( e ) {
		var reg = new RegExp( unExistsMultiSegmentPath );
		return !!reg.exec( e );
	}, "rootModel.update(invalidPath, value) will result invalid path exception" );

	raises( function() {
		rootModel.del( unExistsMultiSegmentPath );
	}, function( e ) {
		var reg = new RegExp( unExistsMultiSegmentPath );
		return !!reg.exec( e );
	}, "rootModel.remove(invalidPath) will result invalid path exception" );

} );

test( "other CRUD method of model", function() {

	var f = "f";
	var obj = {
		a: "a",
		b: "b",
		getf: function() {
			return f;
		},
		setf: function( value ) {
			f = value;
		}
	};
	rootModel.extend( obj );

	var model = $.extend( {}, rootModel.helper() );
	delete model.__via;
	deepEqual( model, obj, "you can create complex object like model.create(obj) as a shortcut to model.create(path, obj)" );

	var obj2 = {
		a: "a2",
		b: "b2"
	};

	rootModel.extend( obj2 );
	var model2 = $.extend( {}, via.get() );
	delete model2.__via;

	deepEqual( model2, $.extend( {}, obj, obj2 ), "you can create complex object like model.create(obj) as a shortcut to model.create(path, obj)" );

	rootModel.set( "a", "a2" );
	equal( rootModel.get( "a" ), "a2", "set will update if path exists" );

	rootModel.set( "c", "c" );
	equal( rootModel.get( "c" ), "c", "set will create if path not exists" );

	equal( rootModel.get( "getf" ), f, "get can call a function in model" );
	rootModel.set( "setf", "f2" );
	equal( f, "f2", "model.get can also call a function to update model" );

	rootModel.createIfUndefined( "a", "a3" );
	equal( rootModel.get( "a" ), "a2", "createIfUndefined will not create if path exists" );

	rootModel.createIfUndefined( "d", "d" );
	equal( rootModel.get( "d" ), "d", "createIfUndefined will create if path not exists" );

	assertEmptyDb();
} );

/*test( "depenency lookup", function() {

 function fake () {
 this.abc = this.xyz ? this.xml : this.yyz;
 this.xyz = this.jump( "xx" ).get();
 this.abc = this.xyz123;
 return this.tmz + this.xml;
 }

 var x = via.debug.getSubjectPaths( fake.toString() );

 equal( x.toString(), "xyz,xml,yyz,xyz123,tmz",
 "getSubjectPath will only keep path on the right hand side, " +
 "and will only ignore model method, and will not double import" );

 } );*/

test( "test reference integrity in model remove", function() {

	var jsonObject = {
		a: "a",
		b: {
			c: "c"
		},
		d: function() {
			return this.get( "..a" );
		},
		e: function() {
			return this.get( "..d" );
		}
	};

	rootModel.extend( jsonObject );
	deepEqual( {
		a: "a",
		b: {
			c: "c"
		},
		d: "a",
		e: "a"
	}, {
		a: rootModel.get( "a" ),
		b: rootModel.get( "b" ),
		d: rootModel.get( "d" ),
		e: rootModel.get( "e" )
	}, "rootModel.create(jsonObject) will extend objDb" );

	deepEqual( via( "a" ).pathsOfWatchers(), ["d"], "via.create() will parse dependencies" +
	                                                "within value, and do something like " +
	                                                "via.debug.modelLinks[referencedPath].push(referencingPath)" );

	deepEqual( via( "d" ).pathsOfWatchers(), ["e"], "via.create() will parse dependencies" +
	                                                "within value, and do something like " +
	                                                "via.debug.modelLinks[referencedPath].push(referencingPath)" );

	equal( rootModel.get( "d" ), "a", "model.get(functionPath) will evaluate " +
	                                  "the function instead of returning the function" );
	//e-->d --> a
	//	raises( function() {
	//		rootModel.del( "a" );
	//	}, "rootModel.remove(referencedPath) will result in exception, because the path is" +
	//	   " referenced by other path" );
	//
	//	raises( function() {
	//		rootModel.del( "d" );
	//	}, "rootModel.remove(referencedPath) will result in exception, because the path is" +
	//	   " referenced by other path" );

	rootModel.del( "a" );
	rootModel.del( "d" );

	rootModel.del( "e" );

	equal( via( "d" ).pathsOfWatchers().length, 0, "after a path is deleted, the reference where the path is in referencing role, it is deleted. " );

	rootModel.del( "d" );

	equal( via( "a" ).pathsOfWatchers().length, 0, "after a path is deleted, the reference where the path is in referencing role, it is deleted. " );

	rootModel.del( "a" );

	ok( true, "after referencing path is removed, referenced path can be removed" );

	rootModel.del( "b" );
	assertEmptyDb();
} );

test( "remove model by force", function() {
	rootModel.extend( {
		a: "a",
		b: function() {
			return this.a;
		}
	} );

	rootModel.del( "a" );
	ok( true, "model can be deleted event it is reference by other model, after deleted the reference" +
	          "is also deleted" )

	equal( via( "a" ).pathsOfWatchers().length, 0, "after a path is deleted, the reference where the path is in referenced role" );

	rootModel.del( "b" );

} );

test( "model.helper()", function() {
	var fn = function() {
		return "x";
	};

	rootModel.create( "f", fn );
	equal( rootModel.helper( "f" ), fn, "you can get getfunc to return the function at the path" );
	rootModel.del( "f" );

} );

test( "model navigation1", function() {

	var originalmodel = via( "a" );
	var relativeModel = originalmodel.cd( "b" );
	equal( relativeModel.path, "a.b", "can navigate to relative path" );
	var shadowModel = originalmodel.shadowModel();
	equal( shadowModel.path, "__via.a", "can navigate to shadowModel" );
	var mainModel = shadowModel.mainModel();
	equal( mainModel.path, "a", "can navigate back to mainModel" );
	var popModel = mainModel.previous;
	equal( popModel, shadowModel, "popModel can pop out the old model" );

} );

test( "model navigation2", function() {
	rootModel.extend( {
		a: {
			b: {
				c: "c"
			}
		}
	} );
	var originalmodel = via( "a" );
	var relativeModel = originalmodel.cd( "b.c" );
	equal( relativeModel.path, "a.b.c", "can navigate to relative path" );
	var shadowModel = relativeModel.shadowModel();
	equal( shadowModel.path, "__via.a#b#c", "can navigate to shadowModel" );
	var mainModel = shadowModel.mainModel();
	equal( mainModel.path, "a.b.c", "can navigate back to mainModel" );
	var popModel = mainModel.previous;
	equal( popModel, shadowModel, "popModel can pop out the old model" );

	rootModel.del( "a" );

} );

test( "helpers", function() {
	ok( via.util.isPrimitive( null ), "null is primitive" );
	ok( via.util.isPrimitive( undefined ), "undefined is primitive" );
	ok( via.util.isPrimitive( true ), "boolean is primitive" );
	ok( via.util.isPrimitive( 1 ), "number is primitive" );
	ok( via.util.isPrimitive( "s" ), "string is primitive" );

	var obj = {
		a: "a",
		b: "b",
		c: {
			d: "d"
		}
	}

	via.util.clearObj( obj );
	deepEqual( obj, {
		a: null,
		b: null,
		c: {
			d: null
		}
	}, "via.clearObj(obj) can empty primitive value inside" );

	via( "a" ).watchPath( "b" );
	deepEqual( via( "b" ).pathsOfWatchers(), ["a"], "via.addLink will make modelLinks increment" );

	via( "a" ).watchPath( "b" );
	equal( via( "b" ).pathsOfWatchers().length, 1, "adding the same link can not be added twice" );

	via( "a" ).unwatchPath( "b" );
	equal( via( "b" ).pathsOfWatchers().length, 0, "via().removeSubjectPath will remove the reference" );

	var options = via.options;
	ok( options, "via.options will return the options object" );

} );

test( "array method of model", function() {

	function getModelEventForCompare ( modelEvent ) {
		var rtn = {
			publisher: modelEvent.publisher.path,
			eventType: modelEvent.eventType,
			originalPublisher: modelEvent.originalPublisher.path
		};

		if ("removed" in modelEvent) {
			rtn.removed = modelEvent.removed;
		}

		return rtn;
	}

	ok( via.fn.indexOf, "model array is defined" );
	var path = "array";
	var array = ["a", "b", "c"];
	var item1 = "d";

	rootModel.create( path, array );
	var model = via( path );
	//	var view = {};

	var modelEventForCompare;
	var originalModelEvent;

	equal( model.first(), "a", "model.firstItem can return the last item in the array" );
	equal( model.last(), "c", "model.lastItem can return the last item in the array" );
	equal( model.count(), 3, "model.itemCount() can return the length of the array" );

	equal( model.indexOf( "b" ), 1, "model.indexOfItem return the index of item in array" );
	model.push( item1 );
	equal( array[3], item1, "model.appendItem return the index" );

	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "afterCreate.child",
	//		originalPublisher: path + "." + (array.length - 1)
	//	}, "model.appendItem will trigger expected event" );

	var removedItem = model.pop();

	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "afterDel.child",
	//		originalPublisher: path + ".3",
	//		removed: item1
	//	}, "model.popItem will trigger expected event" );

	model.insertAt( 1, item1 );
	deepEqual( model.get(), ["a", "d", "b", "c"], "model.insertItemAt will can create the " +
	                                              "value at the index" );
	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "afterCreate",
	//		originalPublisher: path + ".1"
	//	}, "the modelEvent in modelHandler is expected, after calling model.insertItemAt" );

	model.removeItem( item1 );

	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "afterDel.child",
	//		originalPublisher: path + ".1",
	//		removed: item1
	//	}, "the modelEvent in modelHandler is expected, after calling model.removeItem" );

	deepEqual( array, ["a", "b", "c"], "model.removeItem is success" );

	model.prepend( item1 );

	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "afterCreate",
	//		originalPublisher: path + ".0"
	//	}, " the modelEvent in modelHandler is expected, after calling model.prependItem" );

	model.removeItem( item1 );
	deepEqual( array, ["a", "b", "c"], "array is reset by model.removeItem()" );

	model.updateItem( "a", "a1" );

	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "afterUpdate.child",
	//		originalPublisher: path + ".0",
	//		removed: "a"
	//	}, " the modelEvent in modelHandler is expected, after calling model.replaceItem" );
	model.updateItem( "a1", "a" );
	deepEqual( array, ["a", "b", "c"], "array is reset by model.replaceItem()" );

	model.clear();

	//	deepEqual( modelEventForCompare, {
	//		publisher: path,
	//		eventType: "create",
	//		originalPublisher: path
	//	}, " the modelEvent in modelHandler is expected, after calling model.clearItems" );

	deepEqual( array, [], "after model.clearItems() is called, the array is empty" );

	model.push( "b" );
	model.push( "c" );
	model.push( "a" );

	deepEqual( array, ["b", "c", "a"], "the result before sort is expected" );

	rootModel.del( path );
	//via.debug.removeView( view );
	assertEmptyDb();

} );

test( "via.mergeLogicalPath", function() {

	var mergeLogicalPath = via.mergeLogicalPath;

	equal( mergeLogicalPath( "a.b", undefined ), "a.b", "if index is not defined, use context as path" );

	equal( mergeLogicalPath( "a.b", "." ), "a.b", "if index is '.', use context as path" );

	equal( mergeLogicalPath( "a.b", ".c" ), "a.b.c", "if index is '.x', combine context and index as mergePath" );

	equal( mergeLogicalPath( "a.b", "*c" ), "a.b*c", "if index is '*x', combine context and index as mergePath" );

	equal( mergeLogicalPath( "a*b", "*c" ), "a*b*c", "if context is a*b,  index is *c, mergePath is a*b*c" );

	equal( mergeLogicalPath( "a", "..c" ), "c", "if index is '..x', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b", "..c" ), "a.c", "if index is '..x', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b.c", "...d" ), "a.d", "if index is '...x', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b.c.d", "....e" ), "a.e", "if index is '....x', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b", ".*c" ), "a*c", "if index is '.*c', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b.c", "..*d" ), "a*d", "if index is '..*d', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b.c.d", "...*e" ), "a*e", "if index is '...*x', combine context's context and index as mergePath" );

	equal( mergeLogicalPath( "a.b", "/d" ), "d", "you can use '/d' to get top level child d" );

	equal( mergeLogicalPath( "a.b", "/" ), "", "you can use '/' to get root" );

} );

test( "model.fullPath", function() {
	var model = via( "a.b.c" );

	equal( model.fullPath(), "a.b.c", "if subPath is not defined, return the model's path" );

	equal( model.fullPath( "d" ), "a.b.c.d",
		"if subpath does not have startPath like '*' or '.', by default is child path" );

	equal( model.fullPath( ".d" ), "a.b.c.d",
		"if subpath has startPath like '.', it will used that" );

	equal( model.fullPath( "*d" ), "a.b.c*d",
		"if subpath has startPath like '.', it will used that" );

	equal( model.fullPath( ".." ), "a.b", "you can use '..' to go up one level" );

	equal( model.fullPath( "..d" ), "a.b.d", "you can use '..d' to get slibling d" );

	equal( model.fullPath( "/d" ), "d", "you can use '/d' to get toplevel children d" );

	equal( model.fullPath( "/" ), "", "you can use '/' to get root" );

} );

test( "model method", function() {
	via.set( "adhoc", {
		x: 1,
		y: 2,
		calculate: function( operator ) {
			switch (operator) {
				case '+':
					return this.get( "x" ) + this.get( "y" );
				case '-':
					return this.get( "x" ) - this.get( "y" );
				case '*':
					return this.get( "x" ) * this.get( "y" );
				case '/':
					return this.get( "x" ) / this.get( "y" );
			}
		},
		firstName: "",
		lastName: "",
		changeName: function( firstName, lastName ) {
			//this point to the current model object
			this.set( "firstName", firstName );
			this.set( "lastName", lastName );
		}
	} );

	ok( $.isFunction( via().helper( 'adhoc.calculate' ) ), 'via.helper can return a function' );
	equal( via.get( "adhoc.calculate", "+" ), 3,
		"If a model.helper(path) is a function, model.get(path, p1, p2) will run in the raw context" );

	ok( $.isFunction( via().helper( 'adhoc.changeName' ) ), 'via.helper can return a function' );
	via.set( "adhoc.changeName", "john", "doe" );

	ok( via.get( 'adhoc.firstName' ) == 'john' && via.get( 'adhoc.lastName' ) == 'doe',
		"If a model.helper(path) is a function, model.set(path, p1, p2) will execute the function," +
		"and the function's context is model itself" );
	assertEmptyDb();

} )