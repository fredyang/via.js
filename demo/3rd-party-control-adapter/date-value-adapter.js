(function() {

	/*<p>Date: <span type="text" data-sub="`val:meetingDate|,,date"></span></p>
	<p>Date: <input type="text" data-sub="`val:meetingDate|,,date"></p>
	*/
	via.addViewValueAdapters( {
		name: "date",
		initialize: function( $elem ) {
			$elem.datepicker( {
				onSelect: function( dateText, instance ) {
					$( this ).trigger( "change" );
				}
			} );
		},
		//get value from view and set the model
		get: function( $elem ) {
			return $elem.datepicker( "getDate" );

		},
		//get value from model and set the view
		set: function( $elem, value, e ) {
			if (+$elem.datepicker( "getDate" ) != +value) {
				$elem.datepicker( "setDate", value );
			}
		}
	} );

})();
