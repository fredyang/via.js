via().create( "contacts", [
	{
		firstName: "John",
		lastName:"Smith"
	},
	{
		firstName: "Joe",
		lastName:"Davis"
	},
	{
		firstName: "Mary",
		lastName:"Curtis"
	},
	{
		firstName: "Tim",
		lastName:"Hud"
	},
	{
		firstName: "Boys",
		lastName:"Mee"
	},
	{
		firstName: "Yuki",
		lastName:"Kim"
	}
] );

via( "contacts" ).enableQuery().enableListEdit( {
	firstName: "",
	lastName:""
} ).enableSorter();

var showTimeStamp = false;
function ts() {
	return showTimeStamp ? (+new Date() + "").substring( 7, 10 ) : "";
}



