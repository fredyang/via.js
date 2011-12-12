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


Questions?
----------
Please log your issue at https://github.com/fredyang/viaProxy.js/issues