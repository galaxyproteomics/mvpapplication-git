/**
 * Generate JSON of peptide sequences by file for filtering.
 */
var PeptideSequenceFilter = (function (psf) {

    psf.pepsByFile = {};
    psf.candidateFiles = [];
    psf.timer;

    psf.historyContents = function (url) {
        return new Promise(function (resolve,reject) {
            psf.timer = setTimeout(function(){
                alert("Sorry, Galaxy is not responding. I have waited as long as I can. Grab a coffee, relax, and refresh the app in a bit.");
                reject(new Error("Requesting data from Galaxy timeout"));
            }, 30000);
            $.get(url, resolve);
        });
    };

    psf.pepAJAX = function (fObj, cb) {
        var url = psf.galaxyConfiguration.href +
            '/api/histories/' + psf.galaxyConfiguration.historyID +
            '/contents/' + fObj.obj.id + '/display';
        var cb_fn = cb;
        var obj = fObj;
        $.get(url, function (data) {
            var cleanSequence = [];

            data.split('\n').forEach(function (v) {
                var rx = new RegExp('[^a-z]|sequence', 'i'); //"sequence" cannot be in the string bc the column is named seqeunce????
                if (!v.match(rx)) {
                    if (v.length > 0) {
                        cleanSequence.push(v);
                    }
                }
            });
            psf.pepsByFile[obj.obj.name] = cleanSequence;

            cb_fn();
        });
    };

    psf.peptideFileContents = function (fObj) {
        var obj = fObj;
        return new Promise(function (resolve) {
            psf.pepAJAX(obj, resolve);
        })
    };

    /**
     * Process REST return of list of user's current history.
     * Want to find any entries that are not deleted and tabular.
     */
    psf.processHistoryList = function (data) {
        var availableFiles = [];
        clearTimeout(psf.timer);
        data.forEach(function (cv) {
            if ((cv.extension === 'tabular') && !cv.deleted) {
                availableFiles.push({
                    name: cv.name,
                    obj: cv
                });
            }
        });
        psf.candidateFiles = availableFiles;
        psf.publish('CandidateFilesAvailable', psf.candidateFiles);
        psf.subscribe('ParseCandidateFiles', function (data) {
            psf.parseCandidateFiles(data);
        })

        //TODO: Stop here and present available files to user.
    };

    psf.parseCandidateFiles = function (availableFiles) {
        //promise chain to ensure that all tabular files are processed before letting user access
        availableFiles
            .map(psf.peptideFileContents)
            .reduce(
                function (chain, filePromise) {
                    return chain.then(function () {
                        return filePromise
                    })
                },
                Promise.resolve() //fulfilled Promise to start the reduce chain.
            )
            .then(function () {
                psf.publish('CandidateFilesParsed', {
                    data: psf.pepsByFile
                });
            });
    };

    psf.loadData = function () {
        var url = psf.galaxyConfiguration.href + '/api/histories/' + psf.galaxyConfiguration.historyID + '/contents';
        var prHistory = psf.historyContents(url);
        prHistory.then(psf.processHistoryList);
    };

    psf.init = function (confObj) {
        psf.galaxyConfiguration = confObj.galaxyConfiguration;
        psf.subscribe('dataTableInitialized', function () {
            psf.loadData();
        });
    };

    return psf;
}(PeptideSequenceFilter || {})); // eslint-disable-line no-use-before-define