via.extend(
	{
		registration: {
			email: null,
			url: null,
			name: null,
			age: null,
			accepted: null
		},
		message: "You request has been submitted"
	}
);

via( "registration" ).checkAll( {
	email: ["email", "required"],
	url: ["url", "required"],
	name: [
		["regex", "/[a-zA-Z ]{5,}/,You must specify a valid name."]
	],
	age: ["number"],
	accepted: ["required", ["fixedValue", "true,You must agree the terms" ]]
} );
