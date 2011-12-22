var categories = [
	{
		name:"Core",
		categories:[
			{
				name:"Proxy"
			},
			{
				name:"Model Event"
			},
			{
				name:"View Event"
			}
		]
	},
	{
		name:"Features",
		categories:[

			{
				name:"Declarative"
			},
			{
				name:"Template"
			}
		]
	},
	{
		name:"Addons",
		categories:[
			{
				name:"Validation"
			},
			{
				name:"List Query"
			},
			{
				name:"List Edit"
			},
			{
				name:"App"
			}
		]
	}
];

var entries = [
	{
		name:"via",
		type:"method",
		returns:"Proxy",
		version:"0.1",
		category:"Core Proxy",
		signatures:[
			{
				added:"0.1",
				parameters:[
					{
						name:"context",
						type:"String",
						desc:"string value indicates starting point of of model navigation."
					}
				]
			}
		],
		shortdesc:"via(context)",
		desc:"",
		//the longdesc should only contains "<p />" and "<pre />" tag
		longdesc:"<p>via is the root of the library, it is served as both the namespace the library and also" +
		         "the proxy constructor. A proxy is a function to assess repository.</p>",
		examples:[
			//css, html is used to generate the live example
			{
				desc:"",
				code:"",
				html:"",
				css:""
			},
			//if you don't have html, no live example will be generate
			{
				desc:"",
				code:""
			}
		]
	}
];

via().create({
	categories: categories,
	entries: entries
})