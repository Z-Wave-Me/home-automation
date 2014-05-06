var _ = require('lodash'),
    fs = require('fs');

var env = process.env.NODE_ENV;

var indexTemplate = process.argv[2];
var outputFile = process.argv[3];
fs.readFile(indexTemplate, 'utf-8', function(err, tpl) {
  if (err) {
    console.log("Cannot open template file");
    return;
  }

  tpl = _.template(tpl, {environment: env});
  fs.writeFile(outputFile, tpl, function(err) {
    if (err) {
      console.log('Cannot write template file', err);
    }
  });
});
