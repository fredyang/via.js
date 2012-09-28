module( "createQueryable" );

test( "can create queryable shadow", function() {
	via.set( "contacts", [
		{
			firstName: "Tom",
			lastLang: "Cruise"
		}
	] );

	var $list = $( "<div data-sub='@ns:contacts @createQueryable'></div>" ).appendTo( testArea() );
	$list.importSubs();

	ok( via.get( "contacts*query" ), "@createQueryable will create the queryable support" );
	ok( via.get( "contacts*queryResult" ).length, "@createQueryable will create the queryResult" );

	via.del( "contacts" );
	assertEmptyDb();
} )
