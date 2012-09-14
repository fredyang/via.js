[
	{
		"name": "Model",
		"type": "category",
		"namespace": "",
		"shortDesc": "Model"
	},
	{
		"name": "via",
		"type": "method",
		"namespace": "Model",
		"shortDesc": "via(path)",
		"signatures": [
			{
				"shortDesc": "via(path)",
				"returns": "Proxy",
				"priority": "1",
				"desc": "Accepts a string of model path and create a proxy points to the model in the repository",
				"longDesc": "Proxy is the object that allow you to access the data in repsitory, creating the a proxy is the first step.",
				"overloads": [
					{
						"versionAdded": "0.1",
						"title": "via(path)",
						"parameters": [
							{
								"name": "path",
								"type": "String",
								"desc": "A string of path in the repository"
							}
						]
					}
				],
				"examples": [
					{
						"desc": "Create a proxy using path",
						"code": "example code",
						"html": "example html",
						"css": "example css"
					}
				]
			}

		]
	}
]