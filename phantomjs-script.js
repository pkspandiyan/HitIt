var fs = require('fs');
var system = require('system');

var args = system.args;
var file = fs.open('results.txt', 'a/+');

if (args.length === 1) {
    fs.write('results.txt', 'Try to pass some arguments when invoking this script!', 'a/+');
} else {
    args.forEach(function(arg, i) {
        fs.write('results.txt', i + ': ' + arg, 'a/+');
    });
}

/*
var page = require('webpage').create();
page.open('http://www.google.com', function() {
  page.render('google.png');
    fs.write('results.txt', 'Valic.com working!', 'a/+');
  phantom.exit();
});
*/

var address = 'http://www.valic.com';
var t = Date.now();
page.open(address, function (status) {
        if (status !== 'success') {
            console.log('FAILED to load the address');
        } else {
            t = Date.now() - t;
            console.log('Page title is ' + page.evaluate(function () {
                return document.title;
            }));
            console.log('Loading time ' + t + ' msec');
        }
        phantom.exit();
    });

// https://www.valic.com/home_3240_422903.html
// http://www.aig.com/home_3171_411330.html
