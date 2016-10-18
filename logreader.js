// ******************************************* //
// HitIt 0.1 (Developed by Kalyana Pandian)
// Web Access Log - Analyzer & Simulator
// ******************************************* //

// This implementation requires below NPMs
// npm install event-stream
// npm install phantom [Please ensure phontomjs executable in system path]

//#####################
// Folder & File path tested only with absolute path. Relative path may work!
// On windows machine use unix style (/) folder separator
var logFolderPath = "C:/Users/kalypand/eBT/eBP/Logs/webalizer/ToProcess/JustADay"; 
//"C:/Users/kalypand/eBT/eBP/hititlogs"; //To analyze all the files with in the given folder. No trailing slash.
var logFilePath = ""; //To analyze just one file; if this value is present logFolderPath is ignored
//#####################

//#####################
// Leave it empty to simulate all domains with in access logs
var domainsToProcess = ['www.aig.com'];
//#####################

//#####################
var generateAbstractPerformanceReportForURl = true;
// Skip http:// and https:// as part of the URL
var urlsToProcess = ['www.aig.com/home_3171_411330.html'];
//#####################

/////////////////////// DO NOT MODIFY ANYTHING BELOW /////////////////////////////

var fs = require('fs')
//var stream = require('stream');
var phantom = require('phantom'); // Headless web browser
var eventStream = require("event-stream"); // Event stream to read large files without impacting system memory
var url = require('url');
var async = require('async'); // For concurrency

var generatePerformanceReport = true;
var generateAbstractPerformanceReport = true;

var generateLoadFromAccessLog = false;

var urlsToIgnore = ['/'];
var fileExtensionsToIgnore = ['gz', 'tar', 'txt', 'csv', 'xlsx']; //This applies only to files within logFolderPath
var urlExtensionsToSimulate = ['.html', '.pdf'];
var simulateRequestMethods = ['GET', 'HEAD'];

var phantomCallCount = 0;
var hitItResults = [];

function hitIt(hitThisURL, callMeToContinue) {
    phantom.create('--ignore-ssl-errors=true', function (ph) {
      ph.createPage(function (page) {
          var time = Date.now();
          try {
              page.set('settings.userAgent', "HitIt 0.1 (Developed by Kalyana Pandian)");
              page.open(hitThisURL, function (status) {
                  hitItResults.push(status+","+(Date.now()-time)+","+hitThisURL);
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
              hitItResults.push("[ERRO] "+err+","+(Date.now()-time)+","+hitThisURL);
              callMeToContinue();
          }
      });
    }, {
        dnodeOpts: {
        weak: false
      }
    });
}

if(logFilePath) {
    readWebAccessLog(logFilePath);
} else if(logFolderPath) {
    readWebAccessLogFolder(logFolderPath);
}

var webAccessLogArr = [];
var allDomainDataObj = {};
var allDomainAbstractDataObj = {};

function simulateAccessLog() {
    var arrayStream = eventStream.readArray(webAccessLogArr)
    .pipe(eventStream.mapSync(function(logFieldsArr) {
        arrayStream.pause();
        try {
            simulateThisLog(logFieldsArr, function() { arrayStream.resume(); });
        } catch(err) {
            console.log("----");
            console.log("[WARN] Simulation failed for log line array "+logFieldsArr);
            console.log("[ERRO] "+err);
            console.log("----");
            arrayStream.resume();
        }
    }))
    .on('error', function() {
            console.log("----");
            console.log("[WARN] Read array failed!");
            console.log("[ERRO] "+err);
            console.log("----");
            arrayStream.resume();
    })
    .on('end', function() {
        fs.writeFile('hititresults.txt', JSON.stringify(hitItResults), function(err) {
            if(err) console.log(err);
            else console.log("[INFO] Stored HitIt results to hititresults.txt");
        });
    });
}

function simulateThisLog(logFieldsArr, callMeToContinue) {
    var incr = 0;
    try {
        var request = logFieldsArr[3].split(" ");
        if(urlsToIgnore.indexOf(request[1]) < 0 && simulateRequestMethods.indexOf(request[0]) > -1) {
            if(domainsToProcess.length===0 || domainsToProcess.indexOf(logFieldsArr[9]) > -1) {
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
                    hitIt(urlToHit, callMeToContinue);
                    phantomCallCount++;
                } else {
                    callMeToContinue();
                }
            } else {
                callMeToContinue();
            }
        } else {
            callMeToContinue();
            console.log('[DEBU] Skipped URL '+request[1]+' with method '+request[0]);
        }
    } catch(err) {
        console.log("[ERRO] @ log line # "+i+". "+err);
        callMeToContinue();
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
    if(generatePerformanceReport) {
        if(domainsToProcess.indexOf(requiredLogFieldsArr[9]) < 0) {
            callItWhenYouAreDone();
            return;
        }

        if(generateAbstractPerformanceReport)
            abstractDomainData(requiredLogFieldsArr, callItWhenYouAreDone);
        else
            processLogFields(requiredLogFieldsArr, callItWhenYouAreDone);
    } else
        callItWhenYouAreDone();
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
    // 8 - Not used for anything
    // 9 - Virtualhost / domain of the URL
    // 10 - Timetaken for this response in seconds

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

}

function abstractDomainData(requiredLogFieldsArr, callItWhenYouAreDone) {
    // Expected value in requiredLogFieldsArr index
    // 0 - line # of the log line in log file
    // 1 - Date DD/MON/YYYY format
    // 2 - Time HH:MM:SS format
    // 3 - Request method, URL, HTTPversion (Ex: GET /any/relative/url.html HTTP/1.1)
    // 4 - HTTP Response code
    // 5 - Response size in bytes
    // 6 - Referrer absolute URL
    // 7 - User Agent
    // 8 - Not used for anything
    // 9 - Virtualhost / domain of the URL
    // 10 - Timetaken for this response in seconds

    var requestArr = requiredLogFieldsArr[3].split(" ");

    if(generateAbstractPerformanceReportForURl) {
        if(urlsToProcess.indexOf(requiredLogFieldsArr[9]+requestArr[1])<0) {
           callItWhenYouAreDone();    
            return;
        }
    }
    
    // Data structre of allDomainAbstractDataObj
    // {Domain : {Date : {HH\:MM: [[MinResponseTime, MaxResponseTime, TotalResponseTimeForAverage, TotalRequests]] } }}
    //Get or Create domain object
    var domainDataObj = allDomainAbstractDataObj[requiredLogFieldsArr[9]];
    if(!domainDataObj) {
        domainDataObj = {};
        allDomainAbstractDataObj[requiredLogFieldsArr[9]] = domainDataObj;
    }

    // Request Date
    var dateWiseDetailsObj = domainDataObj[requiredLogFieldsArr[1]];
    if(!dateWiseDetailsObj) {
        dateWiseDetailsObj = {};
        domainDataObj[requiredLogFieldsArr[1]] = dateWiseDetailsObj;
    }

    // Time HH:MM
    var hhMM = requiredLogFieldsArr[2].substring(0,5);
    var hhMMDetailsArr = dateWiseDetailsObj[hhMM];
    if(!hhMMDetailsArr) {
        hhMMDetailsArr = [];
        hhMMDetailsArr[0] = 0;
        hhMMDetailsArr[1] = 0;
        hhMMDetailsArr[2] = 0;
        hhMMDetailsArr[3] = 0;
        dateWiseDetailsObj[hhMM] = hhMMDetailsArr;
    }

    var minResponseTime = hhMMDetailsArr[0];
    var maxResponseTime = hhMMDetailsArr[1];
    var totalResponseTime = hhMMDetailsArr[2];
    var totalRequests = hhMMDetailsArr[3];

    if(parseInt(minResponseTime) > parseInt(requiredLogFieldsArr[10])) {
        hhMMDetailsArr[0] = requiredLogFieldsArr[10];
    }
    if(parseInt(maxResponseTime) < parseInt(requiredLogFieldsArr[10])) {
        hhMMDetailsArr[1] = requiredLogFieldsArr[10];
    }

    hhMMDetailsArr[2] = parseInt(hhMMDetailsArr[2]) + parseInt(requiredLogFieldsArr[10]);
    hhMMDetailsArr[3] = parseInt(hhMMDetailsArr[3]) + 1;

    callItWhenYouAreDone();
}

function persistAbstractDomainDataAsDelimitedRecord(delimiter, webAccessLogFolderPath, logFileName) {
    var fileDesriptor = fs.openSync(webAccessLogFolderPath+'/AbstractAccessitReport-'+logFileName+'.csv', 'a');
    var domainKeys = Object.keys(allDomainAbstractDataObj);
    for(var i in domainKeys) {
        var domainDataObj = allDomainAbstractDataObj[domainKeys[i]];
        var dateKeys = Object.keys(domainDataObj);
        for(var j in dateKeys) {
            fs.writeSync(fileDesriptor, dateKeys[j]+"\n");
            fs.writeSync(fileDesriptor, "Time[EST]"+delimiter+"MaxResponseTime"+delimiter+"TotalRequest\n");
            //fs.writeSync(fileDesriptor, "Max. Response Time\tTotal Request\n");
            var hhMMDataObj = domainDataObj[dateKeys[j]];
            var hhMMKeys = Object.keys(hhMMDataObj);
            for(var k in hhMMKeys) {
                var hhMMDetailsArr = hhMMDataObj[hhMMKeys[k]];
                //fs.writeSync(fileDesriptor, hhMMKeys[k]+delimiter+hhMMDetailsArr[0]+delimiter+hhMMDetailsArr[1]+delimiter+(parseInt(hhMMDetailsArr[2])/parseInt(hhMMDetailsArr[3]))+delimiter+hhMMDetailsArr[3]+"\n");
                
                // Only Time MaxResponseTime TotalRequest
                fs.writeSync(fileDesriptor, hhMMKeys[k]+delimiter+hhMMDetailsArr[1]+delimiter+hhMMDetailsArr[3]+"\n")
                
                // Only MaxResponseTime TotalRequest
                //fs.writeSync(fileDesriptor, hhMMDetailsArr[1]+delimiter+hhMMDetailsArr[3]+"\n")
            }
        }
    }
    fs.closeSync(fileDesriptor);
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
            console.log('[ERRO] Error while reading file.');
        })
        .on('end', function(){
            if(generatePerformanceReport) {
                if(!generateAbstractPerformanceReport) {
                    fs.writeFile(webAccessLogFolderPath+'/DetailedAccessitReport-'+fileName+'.txt', JSON.stringify(allDomainDataObj), function(err) {
                        if(err) console.log(err);
                        else console.log("[INFO] Stored processed data to "+webAccessLogFolderPath+'/DetailedAccessitReport-'+fileName+'.txt');
                    });
                } else {
                    persistAbstractDomainDataAsDelimitedRecord(",", webAccessLogFolderPath, fileName);
                    fs.writeFile(webAccessLogFolderPath+'/AbstractAccessitReport-'+fileName+'.txt', JSON.stringify(allDomainAbstractDataObj), function(err) {
                        if(err) console.log(err);
                        else console.log("[INFO] Stored processed data to "+webAccessLogFolderPath+'/AbstractAccessitReport-'+fileName+'.txt');
                    });
                }
            }
            console.log('[INFO] Finished processing log file in '+((Date.now()-time)/1000)+'secs')
            if(generateLoadFromAccessLog)
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
                readWebAccessLog(webAccessLogFolderPath, files[i]);
            else
                ignore = false;
        }
    });
}
