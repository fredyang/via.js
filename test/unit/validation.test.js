module( "validation.test.js" );

test( "validation", function() {

	via.set( "a", null );
	via( "a" ).check( "required" );

	//	via.validators("a", {
	//		isValid: function (value) {
	//			return !$.isNaN(value) && (value >= 10);
	//		},
	//		error: "it must be over 9"
	//	});

	strictEqual( via( "a*errors" ).get(), undefined, "before isValid call, model*errors is undefined" );
	equal( via( "a" ).isValid(), false, "when a model is required, its value cannot be null" );
	equal( via( "a*errors" ).get().length, 1, "after isValid is called, model*errors is created" );

	via.set( "b", "" );
	via( "b" ).check( "required" );
	ok( true, "a validator can be a string, which reference to a common validator" );

	equal( via( "b" ).isValid(), false, "when a model is required, its value cannot be empty string" );

	via.set( "c", 0 );
	via( "c" ).check( "required" )

	equal( via( "c" ).isValid(), true, "when a model is required, its value can be 0" );

	via.set( "d", null );
	via( "d" ).check( {
		isValid: function( value ) {
			return false;
		},
		error: ""
	} );

	ok( true, "A validator can be an object" )
	equal( via( "d" ).isValid(), true, "By default a model is not required. If it is null, all validators are by-passed" );

	via.set( "e", 1 );
	via( "e" ).check( function( value ) {
		return false;
	}, "" );

	ok( true, "A validator can be just a function" );
	equal( via( "e" ).isValid(), false, "a validator is called, when a value is not null" );

	via.set( "f", null );

	via( "f" ).check( "required" );

	ok( via( "f" ).isValid() === false && via().get( "f*errors" ).length === 1, "If required validation is not passed, other validators will not be evaluated" );

	via().create( "g", 1 );
	via( "g" ).check( function( value ) {
		return false;
	} );

	via( "g" ).isValid();
	var errors = via().get( "g*errors" );
	ok( (errors.length == 1 && errors[0] == via.options.errors.defaultError),
		"if a custom validator is used, and it return false, the error message is via.options.errors.defaultError" );

	equal( via().isValid(), false, "parent model is invalid if any of child models is invalid" );

	via().create( "h", "h" );
	via( "h" ).check( "number" );

	via( "h" ).isValid();
	equal( via().get( "h*errors" )[0], via.options.errors.number, "error message can be preset in via.options('errors').validatorName" );

	via().create( "i", "i" );
	var myerror = "xxxx";
	via( "i" ).check( "number", myerror );

	via( "i" ).isValid();
	equal( via().get( "i*errors" )[0], myerror, "error message can be set manually set as an option" );

	via.validators( {
		name: "dummy1",
		isValid: function( value ) {
			return false;
		},
		error: "{1},{0}"
	} );

	via().create( "j", "j" );
	via( "j" ).check( "dummy1", "a,b" );
	via( "j" ).isValid();
	equal( via().get( "j*errors" )[0], "b,a", "error message can be formatted" );

	via.validators( {
		name: "dummy2",
		isValid: function( value ) {
			return false;
		},
		error: "a",
		buildError: function( errorFormat, options ) {
			return errorFormat + "," + options;
		}
	} )
	via().create( "k", "k" );
	via( "k" ).check( "dummy2", "b" );
	via( "k" ).isValid();
	equal( via().get( "k*errors" )[0], "a,b", "error message can be build with validator.buildError" );

	via().create( "l", "jskdjf" );
	via( "l" ).check( "email" );
	via( "l" ).isValid();
	equal( via().get( "l*errors" )[0], via.options.errors.email, "can check invalid email" );

	via().create( "m", "x@gmail.com" );
	via( "m" ).check( "email" );
	ok( via( "m" ).isValid(), "can check valid email" );

	via().create( "n", "n" );
	via( "n" ).check( "minlength", "2" );
	via( "n" ).isValid();
	equal( via().get( "n*errors" )[0], via.debug.stringFormat( via.options.errors.minlength, 2 ), "minlength can check invalid input" );

	via().create( "o", "oo" );
	via( "o" ).check( "minlength", "2" );
	ok( via( "o" ).isValid(), "minlength can check valid input" );

	via().create( "p", "ppp" );
	via( "p" ).check( "maxlength", "2" );
	via( "p" ).isValid();
	equal( via().get( "p*errors" )[0], via.debug.stringFormat( via.options.errors.maxlength, 2 ), "maxlength can check invalid input" );

	via().create( "q", "qq" );
	via( "q" ).check( "maxlength", "2" );
	ok( via( "q" ).isValid(), "maxlength can check valid input" );

	via().create( "r", "r" );
	via( "r" ).check( "rangelength", "2,3" );
	via( "r" ).isValid();
	equal( via().get( "r*errors" )[0], via.debug.stringFormat( via.options.errors.rangelength, 2, 3 ), "rangelength can check invalid input" );

	via().create( "s", "sss" );
	via( "s" ).check( "rangelength", "2,3" );
	ok( via( "s" ).isValid(), "rangelength can check valid input" );

	via().create( "t", 99 );
	via( "t" ).check( "min", "100" );
	via( "t" ).isValid();
	equal( via().get( "t*errors" )[0], via.debug.stringFormat( via.options.errors.min, 100 ), "min can check invalid input" );

	via().create( "u", 101 );
	via( "u" ).check( "min", "100" );
	ok( via( "u" ).isValid(), "min can check valid input" );

	via().create( "v", 101 );
	via( "v" ).check( "max", "100" );
	via( "v" ).isValid();
	equal( via().get( "v*errors" )[0], via.debug.stringFormat( via.options.errors.max, 100 ), "max can check invalid input" );

	via().create( "x", 100 );
	via( "x" ).check( "max", "100" );
	ok( via( "x" ).isValid(), "max can check valid input" );

	via().create( "y", 99 );
	via( "y" ).check( "range", "100,200" );
	via( "y" ).isValid();
	equal( via().get( "y*errors" )[0], via.debug.stringFormat( via.options.errors.range, 100, 200 ), "range can check invalid input" );

	via().create( "z", 101 );
	via( "z" ).check( "range", "100,200" );
	ok( via( "z" ).isValid(), "range can check valid input" );

	via.extend( {
		password: "123",
		repeatPassword: null
	} );

	via( "repeatPassword" ).check( "equal", "password" );
	via.set( "repeatPassword", "abc" );
	equal( via.get( "repeatPassword*errors" )[0], via.options.errors.equal, "equal validator works" );
	//
	//	via( "a" ).del();
	//	via( "b" ).del();
	//	via( "c" ).del();
	//	via( "d" ).del();
	//	via( "e" ).del();
	//	via( "f" ).del();
	//	via( "g" ).del();
	//	via( "h" ).del();
	//	via( "i" ).del();
	//	via( "j" ).del();
	//	via( "k" ).del();
	//	via( "l" ).del();
	//	via( "m" ).del();
	//	via( "n" ).del();
	//	via( "o" ).del();
	//	via( "p" ).del();
	//	via( "q" ).del();
	//	via( "r" ).del();
	//	via( "s" ).del();
	//	via( "t" ).del();
	//	via( "u" ).del();
	//	via( "v" ).del();
	//	via( "x" ).del();
	//	via( "y" ).del();
	//	via( "z" ).del();
	//	via.del( "password" ).del( "repeatPassword" );
	via.debug.removeAll();
	ok( via( "*pathsOfInvalidModels" ).isEmpty(), "after a model is deleted, its path is removed from *pathsOfInvalidModels" );
	//have to delete manually
	via().unsubscribe();
	assertEmptyDb();
} );