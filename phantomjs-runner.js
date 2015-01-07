var phantom = require('phantom');

phantom.create('--ignore-ssl-errors=true', function (ph) {
  ph.createPage(function (page) {
    page.open("https://www.valic.com/home_3240_422903.html", function (status) {
      console.log("opened web URL? ", status);
      page.evaluate(function () { return document.title; }, function (result) {
        console.log('Page title is ' + result);
        ph.exit();
      });
    });
  });
}, {
    dnodeOpts: {
    weak: false
  }
});
