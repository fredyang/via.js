matrix.baseUrl = "../matrix_resource/";
matrix.hash( true );

via.set( "contactsApp", {
	contacts: [
		{
			firstName: "Douglas",
			lastName: "Crockford",
			phone: "444-999-8888",
			email: "df@yahoo.com",
			languages: ["javascript", "java", "c++"]
		},
		{
			firstName: "Anders",
			lastName: "Hejlsberg",
			phone: "111-999-8888",
			email: "ah@microsoft.com",
			languages: ["c#", "java", "c++"]
		},
		{
			firstName: "Johe",
			lastName: "Doe",
			phone: "122-234-3388",
			email: "dj@asdf.com",
			languages: ["lamda", "f#", "c++"]
		}
	]
} );

via( "contactsApp.contacts" ).queryable();

