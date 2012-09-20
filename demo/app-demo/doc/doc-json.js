[
    {
        "name": "Model Proxy",
        "type": "category",
        "namespace": "",
        "shortDesc": "Model Proxy",
        "signatures": []
    },
    {
        "name": "via",
        "type": "method",
        "namespace": "Model Proxy",
        "shortDesc": "via(path)",
        "signatures": [
            {
                "name": "via(path)",
                "returns": "Proxy",
                "priority": "1",
                "shortDesc": "Accepts a string of model path and create a proxy points to the model in the repository. Proxy is the object that allow you to access the model in repository.",
                "desc": "",
                "overloads": [
                    {
                        "versionAdded": "0.1",
                        "name": "via(path)",
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
                        "code": "var rootProxy = via(\"\");\nvar rootProxy2 = via();\n\n//set a value to a model and then return the model's proxy\nvar nameProxy = via(\"name\", \"John\");",
                        "html": "",
                        "css": ""
                    }
                ]
            }
        ]
    },
    {
        "name": "set",
        "type": "method",
        "namespace": "Model Proxy",
        "shortDesc": "proxy.set([subPath,] value)",
        "signatures": [
            {
                "signature": "",
                "priority": "",
                "desc": "",
                "longDesc": "",
                "overloads": [
                    {
                        "versionAdded": "0.1",
                        "title": "",
                        "parameters": [
                            {
                                "name": "subPath",
                                "type": "string",
                                "desc": "relative path from the context of the model"
                            },
                            {
                                "name": "value",
                                "type": "object",
                                "desc": "any value"
                            }
                        ],
                        "name": ".set([subPath,] value)"
                    }
                ],
                "examples": [
                    {
                        "desc": "",
                        "code": "",
                        "html": "",
                        "css": ""
                    }
                ],
                "name": "proxy.set([subPath,] value)"
            }
        ]
    },
    {
        "name": "get",
        "type": "method",
        "namespace": "Model Proxy",
        "shortDesc": "proxy.get()",
        "signatures": [
            {
                "signature": "",
                "priority": "",
                "desc": "",
                "longDesc": "",
                "overloads": [
                    {
                        "versionAdded": "",
                        "title": "",
                        "parameters": [
                            {
                                "name": "",
                                "type": "",
                                "desc": ""
                            }
                        ]
                    }
                ],
                "examples": [
                    {
                        "desc": "",
                        "code": "",
                        "html": "",
                        "css": ""
                    }
                ]
            }
        ]
    },
    {
        "name": "Event Subscription",
        "type": "",
        "namespace": "",
        "shortDesc": "Event Subscription",
        "signatures": []
    },
    {
        "name": "subscribe",
        "type": "method",
        "namespace": "Event Subscription",
        "shortDesc": "subscribe",
        "signatures": [
            {
                "signature": "",
                "priority": "",
                "desc": "",
                "longDesc": "",
                "overloads": [
                    {
                        "versionAdded": "0.2",
                        "title": "",
                        "parameters": [
                            {
                                "name": "subscriber",
                                "type": "",
                                "desc": ""
                            },
                            {
                                "name": "publisher",
                                "type": "",
                                "desc": ""
                            },
                            {
                                "name": "eventTypes",
                                "type": "",
                                "desc": ""
                            },
                            {
                                "name": "handler",
                                "type": "",
                                "desc": ""
                            },
                            {
                                "name": "options",
                                "type": "",
                                "desc": ""
                            }
                        ],
                        "name": "subscribe( subscriber, publisher, eventTypes, handler, options, delegate )"
                    }
                ],
                "examples": [
                    {
                        "desc": "subscribe",
                        "code": "alert(\"hello\");",
                        "html": "",
                        "css": ""
                    }
                ],
                "name": "via.subscribe",
                "shortDesc": "create subscription for all subscriber and publisher, regardless whether they are model or view",
                "returns": "via"
            },
            {
                "signature": "",
                "priority": "",
                "desc": "",
                "longDesc": "",
                "overloads": [
                    {
                        "versionAdded": "",
                        "title": "",
                        "parameters": [
                            {
                                "name": "",
                                "type": "",
                                "desc": ""
                            }
                        ]
                    }
                ],
                "examples": [
                    {
                        "desc": "",
                        "code": "",
                        "html": "",
                        "css": ""
                    }
                ],
                "name": "$obj.subscribe",
                "shortDesc": "a jQuery object subscribe event from a publisher"
            }
        ]
    }
]