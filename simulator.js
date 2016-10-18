// ******************************************* //
// HitIt 0.1 (Developed by Kalyana Pandian)
// HTTP Request Simulator
// ******************************************* //

var fs = require('fs')
//var stream = require('stream');
var phantom = require('phantom'); // Headless web browser
var eventStream = require("event-stream"); // Event stream to read large files without impacting system memory
//var url = require('url');
//var async = require('async'); // For concurrency

var logFolderPath = "C:/Users/kalypand/eBT/eBP/WhiteHat"; 

var hitItResults = [];
var fileExtensionsToIgnore = ['gz', 'tar', 'xlsx', 'txt', 'ORIGINAL']; //This applies only to files within logFolderPath

function hitIt(urlId, hitThisURL, callMeToContinue) {
    phantom.create('--ignore-ssl-errors=true', function (ph) {
      ph.createPage(function (page) {
          var time = Date.now();
          try {
              page.set('settings.userAgent', "HitIt 0.2 (Developed by Kalyana Pandian)");
              page.open(hitThisURL, function (status) {
                  hitItResults.push(urlId+","+status+","+(Date.now()-time)+","+hitThisURL);
                  ph.exit();
                  callMeToContinue();
                    /*
                    page.evaluate(function () { return document.title; }, function (result) {
                        //console.log('Page title is ' + result);
                        ph.exit();
                    });
                    */
              });
          } catch(err) {
              hitItResults.push("[ERRO] @ "+urlId+" due to -> "+err+","+(Date.now()-time)+","+hitThisURL);
              callMeToContinue();
          }
      });
    }, {
        dnodeOpts: {
        weak: false
      }
    });
}

function processUrl(urlId, line, callMeToContinue) {
    if(line) {
        var lineArr = line.split(',');
        try {
            if(lineArr.length) {
                var URL = lineArr[0];
                var slashIndex = URL.indexOf('/', 7);
                if(slashIndex > -1) {
                    URL = URL.substring(URL.indexOf('/', 7));
                    URL = "http://qaebpliveln.aig.com" + URL; // Prefixing with test environment URL
                    hitIt(urlId, URL, callMeToContinue);                    
                } else
                    callMeToContinue();
            } else 
                callMeToContinue();
        } catch(err) {
            console.log("[ERRO] Unable to process line #"+urlId+" with content ["+line+"]. Due to -> "+err);
            callMeToContinue();
        }
    }
}

function readWebAccessLog(webAccessLogFolderPath, fileName) {
    console.log("[INFO] Processing file "+webAccessLogFolderPath+"/"+fileName);
    var lineNr = 1;
    var time = Date.now();
    var fileStream = fs.createReadStream(webAccessLogFolderPath+"/"+fileName, {autoClose: true})
        .pipe(eventStream.split())
        .pipe(eventStream.mapSync(function(line) {
            // pause the readstream
            fileStream.pause();
            lineNr += 1;
            try {
                if(line)
                    processUrl(lineNr, line, function() {  fileStream.resume(); });
                else
                    fileStream.resume();
            } catch(err) {
                console.log("----");
                console.log("[INFO] Processed line # "+line);
                console.log("[ERRO] "+err);
                console.log("----");
                fileStream.resume();
            }
        })
        .on('error', function(){
            console.log('[ERRO] Error while reading file.');
        })
        .on('end', function(){
            console.log('[INFO] Finished processing log file in '+((Date.now()-time)/1000)+'secs');
            fs.writeFile(webAccessLogFolderPath+'/HitIt-RESULTS-'+fileName+'.txt', JSON.stringify(hitItResults), function(err) {
                        if(err) console.log(err);
                        else console.log("[INFO] Stored HitIt results to "+webAccessLogFolderPath+'/HitIt-RESULTS-'+fileName+'.txt');
                    });
                }
        )
    );
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function readWebAccessLogFolder(webAccessLogFolderPath) {
    fs.readdir(webAccessLogFolderPath, function (err, files) {
        if (err) {
            console.log(err);
            return;
        }
        for (var i in files) {
            var ignore = false;
            for (var j in fileExtensionsToIgnore) {
                if(files[i].endsWith(fileExtensionsToIgnore[j])) {
                    ignore = true;
                    break;
                }
            }
            if(!ignore)
                readWebAccessLog(webAccessLogFolderPath, files[i]);
            else
                ignore = false;
        }
    });
}

readWebAccessLogFolder(logFolderPath);