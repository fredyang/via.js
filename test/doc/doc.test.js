var entries =
	[
		{
			"name": "Core",
			"type": "namespace",
			"namespace": ""
		},

		{
			"name": "Features",
			"type": "namespace",
			"namespace": ""
		},

		{
			"name": "Addons",
			"type": "namespace",
			"namespace": ""
		},

		{
			"name": "Proxy",
			"type": "namespace",
			"namespace": "Core"
		},

		{
			"name": "Model Event",
			"type": "namespace",
			"namespace": "Core"
		},

		{
			"name": "View Event",
			"type": "namespace",
			"namespace": "Core"
		},

		{
			"name": "Declarative",
			"type": "namespace",
			"namespace": "Features"
		},

		{
			"name": "Template",
			"type": "namespace",
			"namespace": "Features"
		},

		{
			"name": "Validation",
			"type": "namespace",
			"namespace": "Addons"
		},

		{
			"name": "List Query",
			"type": "namespace",
			"namespace": "Addons"
		},

		{
			"name": "List Edit",
			"type": "namespace",
			"namespace": "Addons"
		},

		{
			"name": "App",
			"type": "namespace",
			"namespace": "Addons"
		},

		{
			"name": "via",
			"type": "method",
			"namespace": "Core.Proxy",
			"returns": "Proxy",
			"version": "0.1",
			"category": "Core Proxy",
			"signatures": [
				{
					"versionAdded": "0.1",
					"title": "via(context)",
					"parameters": [
						{
							"name": "path",
							"type": "String",
							"desc": "string value indicates starting point of of model navigation."
						}
					]
				}
			],
			"shortDesc": "via(context)",
			"desc": "",
			"longDesc": "<p>via is the root of the library, it is served as both the namespace the library and also the model constructor. A model is a function to assess repository.</p>",
			"examples": [
				{
					"desc": "long description for example1 with html",
					"code": "code for example1",
					"html": "<h1>some html for example1</h1>",
					"css": "h1{ color: red}"
				},
				{
					"desc": "description for example2",
					"code": "code for example2"
				}
			]
		}
	];

var namespaces = $( entries ).filter(
	function() {
		return this.type == "namespace";
	} ).get();

function getMembers ( namespace ) {
	if (typeof namespace === "object") {
		namespace = namespace.namespace ? namespace.namespace + "." + namespace.name : namespace.name;
	}
	return $( entries ).filter(
		function() {
			return this.namespace == namespace && this.type !== "namespace";
		} ).get();
}

function getSubNamespace ( entries, namespace ) {

	if (typeof namespace === "object") {
		namespace = namespace.namespace ? namespace.namespace + "." + namespace.name : namespace.name;
	}
	return $( entries ).filter(
		function( index, item ) {
			return item.namespace == namespace && item.type == "namespace";
		} ).get();
}

function populateNamespace ( parentNs ) {
	var data = entries;

	if (!parentNs) {
		parentNs = getSubNamespace( data, "" );
	}

	$( parentNs ).each( function( index, namespace ) {
		var subNamespaces = getSubNamespace( data, namespace );
		if (subNamespaces.length) {
			namespace.subNamespaces = subNamespaces;
			populateNamespace( subNamespaces );
		}
	} );
	return parentNs;
}

