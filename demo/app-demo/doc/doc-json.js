[
	{"name": "Model Proxy", "type": "category", "namespace": "", "shortDesc": "Model Proxy", "signatures": []},
	{"name": "via", "type": "method", "namespace": "Model Proxy", "shortDesc": "via()", "signatures": [
		{"name": "via(path[, value])", "returns": "Proxy", "shortDesc": "Accepts a string of model path and create a proxy points to the model in the repository. Proxy is the object that allow you to access the model in repository.", "desc": "", "overloads": [
			{"versionAdded": "0.1", "name": "via(path)", "parameters": [
				{"name": "path", "type": "String", "desc": "A string of path in the repository"},
				{"name": "value", "type": "object", "desc": "A optional value to be set to model at the path"}
			]}
		], "examples": [
			{"desc": "Create a proxy using path", "code": "var rootProxy = via(\"\");\nvar rootProxy2 = via();\nvar customerProxy = via(\"customer\");\n\n//set a value to a model and then return the model's proxy\nvar nameProxy = via(\"name\", \"John\");", "html": "", "css": ""}
		]}
	]},
	{"name": "set", "type": "method", "namespace": "Model Proxy", "shortDesc": ".set()", "signatures": [
		{"signature": "", "desc": "This is member of model proxy. It can be used to set value to a model, if the underlining model is a function, the function will be called at the context of the parent proxy", "longDesc": "", "overloads": [
			{"versionAdded": "0.1", "title": "", "parameters": [
				{"name": "value", "type": "object", "desc": "any value"},
				{"name": "subPath", "type": "string", "desc": "relative path from the context of the model"}
			], "name": "proxy.set([subPath,] value)"}
		], "examples": [
			{"desc": "proxy.set", "code": "var rootProxy = via();\nrootProxy.set(\"customer\", \n   { firstName: \"John\", lastName: \"Doe\" });\n\nrootProxy.set(\"customer.firstName\", \"Jane\");\n\nvar firstNameProxy = via(\"customer.firstName\");\nfirstNameProxy.set(\"Mark\");\n", "html": "", "css": ""}
		], "name": "proxy.set([subPath,] value)", "returns": "Proxy", "shortDesc": "set value to model"}
	]},
	{"name": "get", "type": "method", "namespace": "Model Proxy", "shortDesc": ".get()", "signatures": [
		{"signature": "", "desc": "", "longDesc": "", "overloads": [
			{"versionAdded": "0.1", "title": "", "parameters": [
				{"name": "subPath", "type": "string", "desc": "the sub path relative to the current proxy"}
			], "name": "proxy.get([subPath])"}
		], "examples": [
			{"desc": "Get value of path", "code": "via.set(\"test\", {\n \n    //model property\n    firstName: \"John\",\n \n        //model property\n    lastName: \"Doe\",\n \n    //model method\n    fullName: function () {\n        //\"this\" refer the parent proxy via(\"test\")\n        return this.get(\"firstName\") + \",\" + this.get(\"lastName\");\n    },\n \n    //model method\n    getGreeting: function (msg) {\n        //\"this\" refer the parent proxy via(\"getGreeting\")\n        return msg + \",\" + this.get(\"fullName\");\n    },\n \n    //model method\n    changeName: function (fullName) {\n        var parts = fullName.split(\",\");\n        //\"this\" refer the parent proxy via(\"getGreeting\")\n        this.set(\"firstName\", parts[0]);\n        this.set(\"lastName\", parts[1]);\n    };\n});\n \n//read model using model method\nvar fullName = via.get(\"helloApp.fullName\");\nvar greeting = via.get(\"helloApp.getGreeting\", \"hello\");\n \n//set model using model method\nvia.set(\"helloApp.changeName\", \"Tom,Roe\");", "html": "", "css": ""}
		], "name": "proxy.get([subPath])", "returns": "object", "shortDesc": "Get the value at the current path of the proxy or sub-path of the proxy"},
		{"name": "via.get([fullPath])", "returns": "object", "shortDesc": "This is shortcut of via().get([fullPath])", "desc": "Instead of creating a proxy, and then call proxy.get(), you can use a shortcut to get the value to the model at the full path.", "overloads": [
			{"versionAdded": "0.2", "name": "via.get([fullPath])", "parameters": [
				{"name": "fullPath", "type": "string", "desc": "full path of the model, optional, if missing get value of root object"}
			]}
		], "examples": []}
	]},
	{"name": "Event Subscription", "type": "", "namespace": "", "shortDesc": "Event Subscription", "signatures": []},
	{"name": "subscribe", "type": "method", "namespace": "Event Subscription", "shortDesc": "subscribe()", "signatures": [
		{"signature": "", "desc": "", "longDesc": "", "overloads": [
			{"versionAdded": "0.2", "title": "", "parameters": [
				{"name": "subscriber", "type": "", "desc": "DOM element/ jQuery object / model proxy"},
				{"name": "publisher", "type": "", "desc": "DOM element/ jQuery object / model proxy"},
				{"name": "eventTypes", "type": "", "desc": "jQuery events or model events separated by space"},
				{"name": "handler", "type": "", "desc": "a function, a pipeline object, or string containing pipeline name or filter names"},
				{"name": "options", "type": "", "desc": "an object or string for initialization or configuration for handler"}
			], "name": "subscribe( subscriber, publisher, eventTypes, handler, options, delegate )"}
		], "examples": [
			{"desc": "subscribe", "code": "via.subscribe($(\"#txtBobx\"), \"firstName\", \"change\", \"val\");\nvia.subscribe($(\"#txtBobx\"), \"firstName\", \"change\", function (e) {\n  this.set(e.publisher.val());\n});\n", "html": "", "css": ""}
		], "name": "via.subscribe", "shortDesc": "create subscription for all subscriber and publisher, regardless whether they are model or view", "returns": "via"},
		{"signature": "", "desc": "a jQuery object subscribe events", "longDesc": "", "overloads": [
			{"versionAdded": "0.1", "title": "", "parameters": [
				{"name": "publisher", "type": "", "desc": "jQuery object, model proxy, or string containing the jQuery object selector or model path"}
			], "name": "$obj.subscribe(publisher, events, handlers, options, delegateSelector)"}
		], "examples": [], "name": "$obj.subscribe()", "shortDesc": "a jQuery object subscribe event from a publisher"}
	]}
]