==================================================

**via.js** is a jQuery based library which can be used to build complex client-side driven web
application with well-structured JavaScript. It uses well known [publish-subscribe pattern](http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) to let
both models and views behave themself by raising event and subscribing event, and controller is not required in via.js.

via.js implements subscription handler as a pipeline object, which can be composed of
highly reusable, testable and lightweight filters. Out of box, via.js comes lots of
reusable pipelines and filters, and you can create your own using the via.js.
This allow you to write less and do more.


Get started
---------------------------------------
<a href="http://code.semanticsworks.com/via.js/doc/introduction.html">Introduction</a>

<a href="http://code.semanticsworks.com/via.js/demo/index.html">Demos</a>

<a href="http://code.semanticsworks.com/via.js/test/index.html">Unit test</a>

Download
---------------------------
You can [download released versions of via.js](https://github.com/fredyang/via.js/downloads) from Github.

How to build your own via.js
----------------------------

First, clone a copy of the main viaProxy git repo by running `git clone git@github.com:fredyang/via.js.git`.
Then, type 'make', it will generate output in dist/ folder,
To remove all build files, type 'make clean'
The default make create three package. The core package, full package, and all package.
The full package include core, with additional support for declarative and template .
If you don't need that, using core is just fine. The "all" package is includes full package
, and addons such as list query, and list, and app.

 For each package, it comes with three version, the debug version which includes debug logging,
 source version which excludes debug logging, and minified version which minified from the source
 version.

 If you want to build core package only, type

 make core

 If you want to build full package only, type

 make full

 If you want to build "all" package only, type

 make all

Questions?
----------
Please log your issue at https://github.com/fredyang/via.js/issues