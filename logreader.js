// Web Access Log - Analyzer

// This implementation requires below NPMs
// npm install event-stream
// npm install phantom [Please ensure phontomjs executable in system path]

fs = require('fs')
stream = require('stream');
eventStream = require("event-stream");
url = require('url');

var phantom = require('phantom');

function hitIt(hitThisURL) {
    phantom.create('--ignore-ssl-errors=true', function (ph) {
      ph.createPage(function (page) {
          var time = Date.now();
          page.open(hitThisURL, function (status) {
            //console.log("Opened "+hitThisURL+" ? ", status);
            fs.appendFile('hititresults.txt', status+","+(Date.now()-time)+","+hitThisURL+"\n");
            page.evaluate(function () { return document.title; }, function (result) {
                //console.log('Page title is ' + result);
                ph.exit();
            });
          });
      });
    }, {
        dnodeOpts: {
        weak: false
      }
    });
}

// Folder & File path tested only with absolute path. Relative path may work!
var logFolderPath = "C:/Users/kalypand/eBT/eBP/hititlogs"; //To analyze all the files with in the given folder. No trailing slash.

//"C:/Users/kalypand/eBT/eBP/Logs/webalizer/ToProcess"

var logFilePath = ""; //To analyze just one file; if this value is present logFolderPath is ignored
var fileExtensionsToIgnore = ['gz', 'tar']; //This applies only to files within logFolderPath
var urlsToIgnore = ['/'];
var urlExtensionsToSimulate = ['.html', '.pdf'];

if(logFilePath) {
    readWebAccessLog(logFilePath);
} else if(logFolderPath) {
    readWebAccessLogFolder(logFolderPath);
}

var webAccessLogArr = [];
var allDomainDataObj = {};

function simulateAccessLog() {
    var incr = 0;
    var urlExt = /^(\w+:\/\/[\w\._~:/?#\[\]@!$&'()*+,;=%]*|[^\.]+\.[^\.]+)$/;
    for(i in webAccessLogArr) {
        var logFieldsArr = webAccessLogArr[i];
        //console.log("--------------------");
        //console.log(logFieldsArr);
        //console.log("--------------------");
        try {
            var request = logFieldsArr[3].split(" ");
            if(urlsToIgnore.indexOf(request[1]) < 0 && request[0] === 'GET') {
                var urlToHit = "http://"+logFieldsArr[9]+request[1];
                var urlPath = url.parse(urlToHit).pathname;
                var hitTheUrl = false;
                for(j in urlExtensionsToSimulate) {
                    var ext = urlExtensionsToSimulate[j];
                    if(urlToHit.endsWith(ext)) {
                        hitTheUrl = true;
                        break;
                    }
                }
                if(hitTheUrl) {
                    hitIt(urlToHit);
                    incr++;
                    if(incr===5) {
                        console.log("Exit!!!");
                        return;
                    }
                }
            } else {
                console.log('Skipped URL '+request[1]+' with method '+request[0]);
            }
        } catch(err) {
            console.log("[ERRO] @ log line # "+i+". "+err);
        }
    }
}

function processAllDomainObj() {
    var domainKeys = Object.keys(allDomainDataObj);
    if(domainKeys.length) {
        for(i in domainKeys) {
            var domainDataObj = allDomainDataObj[domainKeys[i]];
            var urlKeysArr = Object.keys(domainDataObj);
            for(j in urlKeysArr) {
                var url = urlKeysArr[j];
                if(urlsToIgnore.indexOf(url) < 0) {
                    var completeUrlDataObj = domainDataObj[url];
                    var urlGetDataObj = completeUrlDataObj['GET'];
                    if(urlGetDataObj && Object.keys(urlGetDataObj).length) {
                        console.log(urlGetDataObj);
                    }
                }
            }
        }
    }
}

function fetchWebAccessLogFields(logLineNr, logFieldsArr, callItWhenYouAreDone) {
    // webAccessLogArr to store web access log record/line details
    var skipFieldsArr = ['0', '1', '2', '3', '6', '15', '16', 'index', 'input'];
    var requiredLogFieldsArr = [];
    requiredLogFieldsArr.push(logLineNr); // 0th index is line# of the processing line in the log file
    for(var i in logFieldsArr) {
        if(skipFieldsArr.indexOf(i+"") < 0) {
            requiredLogFieldsArr.push(logFieldsArr[i]);
        }
    }
    webAccessLogArr.push(requiredLogFieldsArr);
    processLogFields(requiredLogFieldsArr, callItWhenYouAreDone);
}

function processLogFields(requiredLogFieldsArr, callItWhenYouAreDone) {
    // Expected value in requiredLogFieldsArr index
    // 0 - line # of the log line in log file
    // 1 - Date DD/MON/YYYY format
    // 2 - Time HH:MM:SS format
    // 3 - Request method, URL, HTTPversion (Ex: GET /any/relative/url.html HTTP/1.1)
    // 4 - HTTP Response code
    // 5 - Response size in bytes
    // 6 - Referrer absolute URL
    // 7 - User Agent
    // 8 - Virtualhost / domain of the URL
    // 9 - Timetaken for this response in seconds

    // DATA MAP
    // DOMAIN -> URL -> DATE -> GET|POST -> RequestTime & ResponseCode & SizeInBytes & ResponseSeconds
    var requestArr = requiredLogFieldsArr[3].split(" ");

    //Get or Create domain object
    var domainDataObj = allDomainDataObj[requiredLogFieldsArr[9]];
    if(!domainDataObj) {
        domainDataObj = {};
        allDomainDataObj[requiredLogFieldsArr[9]] = domainDataObj;
    }

    // Split 'GET /any/relative/url.html HTTP/1.1' request details
    var urlDataObj = domainDataObj[requestArr[1]];
    if(!urlDataObj) {
        urlDataObj = {};
        domainDataObj[requestArr[1]] = urlDataObj;
    }

      // Request Method
    var requestTypeDataArr = urlDataObj[requestArr[0]];
    if(!requestTypeDataArr) {
        requestTypeDataArr = {};
        urlDataObj[requestArr[0]] = requestTypeDataArr;
    }

    // Request Date
    var dateWiseDetails = requestTypeDataArr[requiredLogFieldsArr[1]];
    if(!dateWiseDetails) {
        dateWiseDetails = [];
        requestTypeDataArr[requiredLogFieldsArr[1]] = dateWiseDetails;
    }

    var dataArr = [];
    dataArr.push(requiredLogFieldsArr[2]);
    dataArr.push(requiredLogFieldsArr[4]);
    dataArr.push(requiredLogFieldsArr[5]);
    dataArr.push(requiredLogFieldsArr[10]);
    dateWiseDetails.push(dataArr);
    callItWhenYouAreDone();

/*
    // Request Date
    var dateWiseDetails = urlDataObj[requiredLogFieldsArr[1]];
    if(!dateWiseDetails) {
        dateWiseDetails = {};
        urlDataObj[requiredLogFieldsArr[1]] = dateWiseDetails;
    }

    // Request Method
    var requestTypeDataArr = dateWiseDetails[requestArr[0]];
    if(!requestTypeDataArr) {
        requestTypeDataArr = [];
        dateWiseDetails[requestArr[0]] = requestTypeDataArr;
    }
*/
}



// function splitWebAccessLog returns an array of logFields; array index order details:
// 0 - Complete matched string - This value is not used by this implementation
// 1 - Requesting client IP - This value is not used by this implementation
// 2 - Not used for anything - This value is not used by this implementation
// 3 - Remote user - This value is not used by this implementation
// 4 - Date DD/MON/YYYY format
// 5 - Time HH:MM:SS format
// 6 - Timezone -XXXX format (Ex: -0500) - This value is not used by this implementation
// 7 - Request method, URL, HTTPversion (Ex: GET /any/relative/url.html HTTP/1.1)
// 8 - HTTP Response code
// 9 - Response size in bytes
// 10 - Referrer absolute URL
// 11 - User Agent
// 12 - Remote logname - This value is not used by this implementation
// 13 - Virtualhost / domain of the URL
// 14 - Timetaken for this response in seconds
// 15 - Index value of complete matched string - This value is not used by this implementation
// 16 - Source string - This value is not used by this implementation
function splitWebAccessLog(logLineNr, logStr, callItWhenYouAreDone) {
    // regExToParseLog - Nice to have feature to parameterize to support multiple log formats
    var logFieldsArr = /(\d*.\d*.\d*.\d*)\s(.)\s(.)\s.([0-9]*.[A-z]*.[0-9]*).([0-9]*.[0-9]*.[0-9]*)\s(.[0-9]*).\s\"(.*)\"\s([0-9]*)\s(.*)\s\"(.*)\"\s\"(.*)\"\s\"(.*)\"\s(.*)\s(\d*)/.exec(logStr);
    fetchWebAccessLogFields(logLineNr, logFieldsArr, callItWhenYouAreDone);
}

function readWebAccessLog(webAccessLogFilePath) {
    console.log("[INFO] Processing file "+webAccessLogFilePath);
    var lineNr = 1;

    fileStream = fs.createReadStream(webAccessLogFilePath)
        .pipe(eventStream.split())
        .pipe(eventStream.mapSync(function(line) {
            // pause the readstream
            fileStream.pause();
            lineNr += 1;
            try {
                if(line)
                    splitWebAccessLog(lineNr, line, function() {  fileStream.resume(); });
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
            console.log('Error while reading file.');
        })
        .on('end', function(){
            fs.writeFile('accessit.txt', JSON.stringify(allDomainDataObj), function(err) {
                if(err) console.log(err);
                else console.log("Stored processed data to file accessit.txt");
            });
            console.log('Read entirefile.')
            simulateAccessLog();
        })
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
                readWebAccessLog(webAccessLogFolderPath+"/"+files[i]);
            else
                ignore = false;
        }
    });
}

//var logStr = '10.92.146.126 - - [31/Dec/2014:14:54:50 -0500] "\x03" 501 203 "-" "-" "-" test.aig.com 0';
var logStr = '10.32.14.122 - - [02/Jan/2015:12:32:08 -0500] "GET /valic/internet/us/en/valic_footer_content_bg_tcm3240-428490.gif HTTP/1.1" 200 2464 "https://www.valic.com/overview_3240_422600.html" "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)" "-" www.aig.com 0';
//var regEx = new RegExp("(.*) \- \- \[(.*)\] \"(.*) (.*)\?(.*) HTTP\/(.*)\" ([0-9]*) ([0-9]*) \"(.*)\" \"(.*)\" \"(.*)\"");
//var regEx = new RegExp("/(\d*.\d*.\d*.\d*)\s(.)\s(.)\s.([0-9]*.[A-z]*.[0-9]*).([0-9]*.[0-9]*.[0-9]*)\s(.[0-9]*).\s/g");

//var logFields = logStr.match("/(\d*.\d*.\d*.\d*)\s(.)\s(.)\s.([0-9]*.[A-z]*.[0-9]*).([0-9]*.[0-9]*.[0-9]*)\s(.[0-9]*).\s/");
var logFields = /(\d*.\d*.\d*.\d*)\s(.)\s(.)\s.([0-9]*.[A-z]*.[0-9]*).([0-9]*.[0-9]*.[0-9]*)\s(.[0-9]*).\s\"(.*)\"\s([0-9]*)\s([0-9]*)\s\"(.*)\"\s\"(.*)\"\s\"(.*)\"\s(.*)\s(\d*)/.exec(logStr);

// (\d*.\d*.\d*.\d*)\s(.)\s(.)\s.([0-9]*.[A-z]*.[0-9]*).([0-9]*.[0-9]*.[0-9]*)\s(.[0-9]*).\s

//for (var i in logFields) {
//    console.log(logFields[i]+"\n");
//}
