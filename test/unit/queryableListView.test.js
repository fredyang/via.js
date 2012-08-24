module( "queryable" );

test( "can create queryable shadow", function() {
	via.set( "contacts", [
		{
			firstName: "Tom",
			lastLang: "Cruise"
		}
	] );

	var $list = $( "<div data-sub='@ns:contacts @queryableListView'></div>" ).appendTo( testArea() );
	$list.importSubs();

	ok( via.get( "contacts*query" ), "@queryableListView will create the queryable support" );
	ok( via.get( "contacts*queryResult" ).length, "@queryableListView will create the queryResult" );

	via.del( "contacts" );
	assertEmptyDb();
} )
