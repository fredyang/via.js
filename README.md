==================================================

What you need to build your own viaProxy.js
--------------------------------------

You can follow the instruction on https://github.com/jquery/jquery to install the software for build.

For windows user, the packages can be installed in different folder
as long as the path environment is set up.
For windows xp/7 64-bit user, please do not install them into "C:\Program Files (x86)", because
their GNU make file has problem in understanding the "(x86)" in path.


How to build your own viaProxy.js
----------------------------

First, clone a copy of the main viaProxy git repo by running `git clone git@github.com:fredyang/viaProxy.js.git`.
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

Learn
---------------------------------------
<a href="http://code.semanticsworks.com/viaProxy.js/">Step by step</a>

<a href="http://code.semanticsworks.com/viaProxy.js/todos/todos.html">Using viaProxy.js to implement backbone's Todos</a>

<a href="http://code.semanticsworks.com/viaProxy.js/test/index.html">Unit test</a>

Questions?
----------
Please log your issue at https://github.com/fredyang/viaProxy.js/issues