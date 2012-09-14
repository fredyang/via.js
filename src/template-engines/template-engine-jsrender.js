//
//#merge
(function( $, via ) {
	//#end_merge

	var engine;
	via.template.engines( "jsrender", engine = {

		render: function( templateId, data, context ) {
			if (!$.render[templateId]) {
				this.compile( templateId, $( document.getElementById( templateId ) ).html() );
			}
			return $.render[templateId]( data, context );
		},

		compile: function( templateId, source ) {
			$.templates( templateId, {
				markup: source,
				debug: engine.templateDebugMode,
				allowCode: engine.allowCodeInTemplate
			} );
		},

		isTemplateLoaded: function( templateId ) {
			return !!$.render[templateId] || !!document.getElementById( templateId );
		},

		templateDebugMode: false,

		allowCodeInTemplate: true
	} );

	var tags = $.views.tags;

	tags( {
		//{{debugger /}} so that it can stop in template function
		"debugger": function x (e) {
			if (x.enabled) {
				debugger;
			}
			return "";
		},
		//{{ts /}} so that it can emit a timestamp
		ts: function x () {
			return x.enabled ?
				"<span style='color:red' data-sub='`show:/*ts'>ts:" + (+new Date() + "").substring( 7, 10 ) + "</span>":
				"";
		},

		addRowItemNs: function () {
			if ((this.view.index + "").startsWith("_")) {
				return "@ns:/" + this.view.ctx.modelPath + "." + (this.view.ctx.e.publisher.count() -1);
			} else {
				return "@ns:/" + this.view.ctx.modelPath + "." + this.view.index;
			}
		},
		addDataSourceNs: function () {
			return "@ns:/" + this.view.ctx.modelPath;
		}

	} );

	tags.ts.enabled = true;
	tags["debugger"].enabled = true;

	via.set("*ts", false);


	//#merge
})( jQuery, via );
//#end_merge


