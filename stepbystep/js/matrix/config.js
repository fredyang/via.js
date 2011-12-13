matrix.debug();
matrix.resourceBaseUrl = "/stepbystep/js/";

matrix.url( {
	"jquery.tmpl.js" : "http://ajax.microsoft.com/ajax/jquery.templates/beta1/jquery.tmpl.js",
	"jsrender.js" : "http://borismoore.github.com/jsrender/jsrender.js",
	"viaProxy.all.js": "/dist/viaProxy.all.debug.js"
} );

matrix.depend( {
	"viaProxy.all.js" : "template.module",
	"appBase.module": "viaProxy.all.js"
} );

//customize here, I can switch template engine
matrix.depend( {
	"template.module" : "jsrender.js"
} );

matrix.depend( {
	"listEdit.module": "viaProxy.all.js"
} );