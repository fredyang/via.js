module( "editableRow" );

test( "create editable shadow", function() {
	var persons,
		person,
		personTemplate;

	via.set( "persons", persons = [ person =
	                                {
		                                firstName: "John",
		                                lastName: "Doe",
		                                phones: [
			                                "123-544-9999",
			                                "322-514-1139"
		                                ],
		                                others: {
			                                addresses: [
				                                {
					                                city: "New York",
					                                country: "USA"

				                                },
				                                {
					                                city: "Toronto",
					                                country: "Canada"
				                                }
			                                ]
		                                }
	                                }
	] );

	personTemplate = via.util.clone( person, true );
	via.userSubsProps.editableRow( null, {ns: "persons"}, null, null );
	deepEqual( via.get( "persons*edit.itemTemplate" ), via.util.clearObj( person ),
		"if there is no template for new item of an array, it will clone the first item as " +
		"template" );

	ok( via.get( "persons*edit.itemTemplate" ) !== person,
		"if there is no template for new item of an array, it will use a clone" );

	via.del( "persons*edit" );

	via.set( "persons_newItem", personTemplate );
	via.userSubsProps.editableRow( null, {ns: "persons"}, null, null );

	ok( via.get( "persons*edit.itemTemplate" ) === personTemplate,
		"if there is a template for new item, it will be used" );

	var fakeView = {};
	via( "persons" ).subscribe( fakeView, "change", "*newRow" );
	$( fakeView ).change();

	ok( via.get( "persons*edit.item" ).firstName == personTemplate.firstName,
		"*newRow handler can create a copy of itemTemplate to *edit.item" );

	via.userSubsProps.editableRow( null,
		{ns: "persons*edit.item.others.addresses"},
		null, null );

	equal( via.get( "persons*edit.item.others.addresses*edit.itemTemplate.city" ),
		personTemplate.others.addresses[0].city,
		"you can also enable editable list view for the model in shadow"
	);

	var fakeView2 = {};
	via( "persons*edit.item.others.addresses" ).subscribe( fakeView2, "change", "*newRow" );
	$( fakeView2 ).change();

	equal( via.get( "persons*edit.item.others.addresses*edit.item.city" ),
		personTemplate.others.addresses[0].city,
		"*newRow can also copy itemTemplate for shadow items"
	);

	assertEmptyDb();
} )