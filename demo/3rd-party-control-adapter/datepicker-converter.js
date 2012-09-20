via.filters.converters.stringToDate = function( stringValue ) {
	return new Date( stringValue );
};

via.filters.converters.dateToString = function( date ) {
	return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
};

via.filters.initializers.modelToDatepicker = function( publisher, subscriber, handler, options ) {
	subscriber.datepicker();
};

via.filters.initializers.datepickerToModel = function( publisher, subscriber, handler, options ) {
	publisher.datepicker( "option", "onSelect", function( dateText, instance ) {
		$( this ).trigger( "onDateChanged" );
	} );
};
/*"get set convert initialize finalize dispose"*/
via.pipeline( "modelToDatepicker", "get datepicker*setDate _ *modelToDatepicker" );
via.pipeline( "datepickerToModel", "datepicker*getDate set _ *datepickerToModel" );

via.classes.datepicker = "!init afterUpdate:.|*modelToDatepicker" +
                         "$onDateChanged:.|*datepickerToModel";

via.classes.dateVal = "!init afterUpdate:.|get val *dateToString" +
                      "$change:.|val set *stringToDate";
