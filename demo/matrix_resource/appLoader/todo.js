(function() {

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
			var newTask = this.get( "..newTask" );
			if ($.trim( newTask )) {
				this.cd( "..tasks" ).push( {
					taskName: newTask,
					done: false
				} );
				this.set( "..newTask", "" );
			}
		},

		toggleAllDone: function( e ) {
			var checked = e.publisher[0].checked;
			this.cd( "..tasks" ).each( function( i, model ) {
				model.set( "done", checked );
			} );
		}
	} );

	via( "todoapp.tasks" ).saveLocalAfterUpdate();

	return {

		load: function( elem, options ) {
			//$("div").renderInside(templateId, path)
			$( elem ).renderInside( "todo", "todoapp" );
		},

		unload: function( elem ) {
			$( elem ).empty();
		}
	};
})();