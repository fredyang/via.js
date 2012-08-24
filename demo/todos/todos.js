via.set( "todoapp", {

	tasks: via.util.local( "todoapp.tasks" ) || [],

	newTask: "",

	finishedCount: function() {
		return $( this.get( "tasks" ) ).filter(
			function() {
				return this.done;
			} ).length;
	},

	unfinishedCount: function() {
		return this.get( "tasks" ).length - this.get( "finishedCount" );
	},

	isAllDone: function() {
		return this.get( "finishedCount" ) === this.get( "tasks" ).length;
	},

	//the following handler subscribe the view events, e.subscriber is the handler
	clearFinishedTasks: function( e ) {
		e.subscriber.cd( "..tasks" ).each( function( i, model ) {
			if (model.get( "done" )) {
				model.del();
			}
		} );
	},

	addTask: function( e ) {
		var newTask = e.subscriber.get( "..newTask" );
		if ($.trim( newTask )) {
			e.subscriber.cd( "..tasks" ).push( {
				taskName: newTask,
				done: false
			} );
			e.subscriber.set( "..newTask", "" );
		}
	},

	toggleAllDone: function( e ) {
		var checked = e.publisher[0].checked;
		e.subscriber.cd( "..tasks" ).each( function( i, model ) {
			model.set( "done", checked );
		} );
	}
} );

via("todoapp.tasks").saveLocalAfterUpdate();
