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

	//the following handler subscribe the view events, this is the handler
	clearFinishedTasks: function( e ) {
		this.cd( "..tasks" ).each( function( i, model ) {
			if (model.get( "done" )) {
				model.del();
			}
		} );
	},

	addTask: function( e ) {
		var subscriber = this,
			newTask = subscriber.get( "..newTask" );
		if ($.trim( newTask )) {
			subscriber.cd( "..tasks" ).push( {
				taskName: newTask,
				done: false
			} );
			subscriber.set( "..newTask", "" );
		}
	},

	toggleAllDone: function( e ) {
		var checked = e.publisher[0].checked;
		this.cd( "..tasks" ).each( function( i, model ) {
			model.set( "done", checked );
		} );
	}
} );

via("todoapp.tasks").saveLocalAfterUpdate();
