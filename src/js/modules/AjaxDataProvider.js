
/**
 * Handles modification provisioning.
 * Uses chained Promises to efficiently generate all modifications in memory.
 */
var PeptideModifications = (function(pm){

    //[iTRAQ4plex]RTLNISHNLH{S:Phospho}LLPEVSPM{K:iTRAQ4plex}NR
    //Returns an html formatted sequence including modifications for a list of peptide ids found in pepIDs
    pm.htmlFormatSequences = function (objs) { //pepIDs

        objs.data.forEach(function(cv){
            let s = cv['"Sequence"'];
            s = s.replace(/{([A-Z]):(.+?)}/g, '<span class="aa_mod" data-toggle="tooltip" data-placement="top" title="$2">$1</span>');
            s = s.replace(/\[(\S+?)\]/g, '<span class="aa_mod" data-toggle="tooltip" data-placement="top" title="Terminal Mod $1">&bull;</span>');

            //For older versions
            s = s.replace(/^([A-Z]){(.+?)}/g,'<span class="aa_mod" data-toggle="tooltip" data-placement="top" title="Terminal Mod $2">&bull;</span>$1');
            s = s.replace(/([A-Z]){(.+?)}/g, '<span class="aa_mod" data-toggle="tooltip" data-placement="top" title="$2">$1</span>');

            //For the olders version


            cv['"Sequence"'] = s;
        });
        return objs;
    };
    return pm;

}(PeptideModifications || {}));// eslint-disable-line no-use-before-define


/**
 * Handles score summary information. Scores are dynamic and can be quite numerous.
 *
 */
var ScoreSummary = (function(sSum){

    sSum.scoreSummary = {};
    sSum.rankedScores = null;

    //Generates list of scores ranked by pct of scores present.
    sSum.getRankedScores = function() {
        var scoreArray = [];
        Object.keys(sSum.scoreSummary).forEach(function(cv){
            scoreArray.push([cv, sSum.scoreSummary[cv].pct_scores_present]);
        });
        scoreArray.sort(function(a,b){
            return b[1] - a[1];
        });
        sSum.rankedScores = scoreArray;
        sSum.publish('RankedScoresAvailable', sSum.rankedScores);
    };

    sSum.generateScores = function() {
        var q = 'SELECT score_summary.* from score_summary';
        var url = sSum.href + '/api/datasets/' +
            sSum.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';
        var self = this;
        $.get(url + encodeURIComponent(q), function(data){
            var scoreNames;
            data.data.forEach(function (cv, idx) {
                var obj = {};
                if (idx === 0) {
                    scoreNames = cv;
                } else {
                    for (var i = 0; i < scoreNames.length; i++) {
                        obj[scoreNames[i]] = cv[i];
                    }
                    self.scoreSummary[cv[scoreNames.indexOf("score_name")]] = obj;
                }
            });
            sSum.publish("ScoreSummaryComplete", sSum.scoreSummary);
        });
    };

    sSum.init = function (confObj) {
        sSum.href = confObj.href;
        sSum.datasetID = confObj.datasetID;
        sSum.generateScores();
        sSum.subscribe('RequestRankedScores', function(){
            if (sSum.rankedScores) {
                sSum.publish('RankedScoresAvailable', sSum.rankedScores);
            } else {
                sSum.getRankedScores();
            }
        })
    };

    return sSum;
}(ScoreSummary || {}));// eslint-disable-line no-use-before-define

/**
 * Object for building AJAX server-side data providers to a datatable
 *
 * confObj.baseQuery is an object:
 *  An example:
 * {
 *  SELECT: 'pe.Peptide_pkid, p.sequence, COUNT(DISTINCT(pe.DBSequence_pkid)) AS ProteinCount, COUNT(DISTINCT(pe.SpectrumIdentification_pkid)) AS SpectralCount',
 *  FROM: 'PeptideEvidence pe, Peptide p',
 *  WHERE: 'pe.Peptide_pkid = p.pkid',
 *  GROUPBY: 'pe.Peptide_pkid'
 * }
 *
 * confObj.rowIDField indicates that the SQL field named should be the key to the
 * data row. In gerneral this will be a id field. If present, the field will be marked
 * as non-visible OPTIONAL
 */
function AjaxDataProvider(confObj) { // eslint-disable-line no-unused-vars
    var self = this;

    this.baseQuery = confObj.baseQuery;
    this.href = confObj.href;
    this.historyID = confObj.historyID;
    this.datasetID = confObj.datasetID;
    this.rowIDField = confObj.rowIDField;
    this.columnNames = confObj.columnNames;
    this.searchColumn = confObj.searchColumn;
    this.searchTable = confObj.searchTable;
    this.tableDivID = confObj.tableDivID;
    this.filtered = false;
    this.customSQL  = confObj.customSQL;
    this.initCompleteCB = confObj.callBackFN || function(){};

    this.scoreSummary = confObj.scoreSummary || false;

    this.sequenceFormatter = confObj.sequenceFormatter || null;

    this.url = this.href + '/api/datasets/' +
        this.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';

    this.recordsTotal = null;
    this.recordsFiltered = null;
    this.scoresByType = {};

    //Need to get score datatypes from the SQLite table
    (function(){
        var q = 'SELECT score_summary.score_name, score_summary.score_type FROM score_summary';
        var s = self;
        $.get(self.url + encodeURIComponent(q),
            function(data){
                data.data.forEach(function (cv) {
                    if (!(cv[1] in s.scoresByType)) {
                        s.scoresByType[cv[1]] = []
                    }
                    s.scoresByType[cv[1]].push(cv[0])
                });
            });
    })();

    this.buildInClause = function (searchStr) {
        var rStr = ' AND ' + this.searchColumn + ' IN (';

        rStr += searchStr + ')';

        return rStr;
    };

    this.buildLikeClause = function (searchStr) {
        let rx = RegExp(/(LIKE \"%[A-Z]*%\")/g);
        let matches = searchStr.match(rx);
        let rStr = ' AND ';
        let colName = this.searchColumn;

        matches.forEach(function(m){
            rStr += colName + ' ' + m + ' OR ';
        });
        rStr = rStr.slice(0, rStr.lastIndexOf(' OR '));
        return rStr;
    };

    //---------------------------------------------------------------- Functions
    this.buildBaseQuery = function (searchReq) {
        var rStr = null;

        if (this.customSQL) {
            rStr = this.customSQL;
        } else {
            rStr = 'SELECT ' + this.baseQuery.SELECT + ' FROM ' + this.baseQuery.FROM;
            rStr += this.baseQuery.WHERE ? ' WHERE ' + this.baseQuery.WHERE : '';
        }

        // Search value can be multiple values within a string.
        if (searchReq.value) {
            if (searchReq.value.indexOf("%") > -1) {
                rStr += this.buildLikeClause(searchReq.value);
            } else {
                rStr += this.buildInClause(searchReq.value);
            }
        }

        if (!this.customSQL) {
            rStr += this.baseQuery.GROUPBY ? ' GROUP BY ' + this.baseQuery.GROUPBY : '';
        }

        return rStr;
    };

    this.getTotalRecordCount = function (callParms, callbackFN, enclState) {
        var sStr = this.buildBaseQuery(callParms.search);
        var finalFn = this.queryData;
        var parms = callParms;
        var dFn = callbackFN;
        var callingState = enclState;
        $.get(this.url + encodeURIComponent('SELECT COUNT(*) FROM (' + sStr + ')'), function (data) {
            callingState.recordsTotal = data.data[1][0];
            callingState.recordsFiltered = callingState.recordsTotal;
            finalFn(parms, dFn, callingState);
        });
    }.bind(this);

    this.getFilteredRecordCount = function (callParms, callbackFN, enclState) {
        var sStr = this.buildBaseQuery(callParms.search);
        sStr = 'SELECT COUNT(*) FROM (' + sStr + ')';
        var nextFN = this.queryData;
        var parms = callParms;
        var destFN = callbackFN;
        var callingState = enclState;
        $.get(this.url + encodeURIComponent(sStr), function (data) {
            callingState.recordsFiltered = data.data[1][0];
            nextFN(parms, destFN, callingState);
        });
    };

    //Returns column definitions for the datatable.
    this.getColumnNames = function () {
        var rValue = this.columnNames;

        if (this.rowIDField) {
            rValue.forEach(function (cv) {
                if (cv.title === this.rowIDField) {
                    cv.visible = false;
                }
            }.bind(this));
        }
        return rValue;
    };

    // Helper function for odering based on table request.
    // {column: 2, dir: "DESC"}
    this.orderFunction = function (orderArray) {
        var orderStr = '';

        orderArray.forEach(function (cv) {
            var isCast = false;
            var orderColName = this.columnNames[cv.column].title;
            this.scoresByType.REAL.forEach(function(t){
                if (orderColName === t) {
                    isCast = true;
                }
            });
            if (isCast) {
                orderStr += ' ORDER BY CAST(' + this.columnNames[cv.column].data + ' AS REAL) ' +
                    cv.dir + ' ';
            } else {
                orderStr += ' ORDER BY ' + this.columnNames[cv.column].data + ' ' +
                    cv.dir + ' ';
            }

        }.bind(this));

        return orderStr;
    };

    this.queryData = function (callParms, callbackFN, enclState) {
        var self = enclState;
        var sqlStatement = self.buildBaseQuery(callParms.search);
        var requestParms = callParms;
        var rowField = self.rowIDField;
        var formatFunc = self.sequenceFormatter;

        var isNumber = function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };

        // Ordering per callParms
        sqlStatement += self.orderFunction(requestParms.order);

        //Add limit and offset
        sqlStatement += ' LIMIT ' + requestParms.length + ' OFFSET ' + requestParms.start;

        $.get(self.url + encodeURIComponent(sqlStatement), function (data) {
            var retParms = requestParms;
            var retObj = {};
            var cNames = data.data[0];

            retObj.draw = retParms.draw;
            retObj.recordsTotal = this.recordsTotal;
            retObj.recordsFiltered = this.recordsFiltered;
            retObj.data = [];

            data.data.slice(1).forEach(function (cv) {
                var obj = {};
                cv.forEach(function (d, idx) {
                    var escapedField = '"' + cNames[idx] + '"';
                    if (isNumber(d))
                    {
                        obj[escapedField] = Number.parseFloat(d);
                    } else {
                        obj[escapedField] = d;
                    }

                });
                if (rowField) {
                    obj.DT_RowId = obj['"' + rowField + '"'];
                    obj.DT_RowData = {
                        key: obj['"' + rowField + '"'],
                        fObj: obj
                    };
                }
                retObj.orderable = true;
                retObj.data.push(obj);
            });
            if (formatFunc) {
                retObj = formatFunc(retObj);
            }
            callbackFN(retObj);
        }.bind(self));
    };

    /**
     * Called from the DataTable table.
     * Need to state check:
     *  - Is this the first call or pagination call. If first,
     *      need to get the total DB count for the base query before
     *      running the base query.
     *  - Is this a call based on filter and its first filter call:
     *      Need to get DB count on base plus filter query, then
     *          run the filter query.
     *  - Is this a clear filter call, that is we are in a filtered state, but
     *      now the user has cleared the filter.
     *  - Ths filter call can never be the absolute first call. Table is rendered
     *      from the first call.
     *
     */
    this.provideData = function (callParms, callbackFN) {

        if (!this.recordsTotal) {
            this.getTotalRecordCount(callParms, callbackFN, this);
        } else if ((callParms.search.value.length > 0) && (!this.filtered)) {
            // Table is asking for a filtered query. It is the first filtered request
            this.filtered = true;
            this.getFilteredRecordCount(callParms, callbackFN, this);
        } else if ((callParms.search.value.length === 0) && (this.filtered)) {
            // Table is resetting from filtering.
            this.filtered = false;
            this.recordsFiltered = this.recordsTotal;
            this.queryData(callParms, callbackFN, this);
        } else {
            this.queryData(callParms, callbackFN, this);
        }
    };

    this.fillDOM = function () {
        var cbFn = this.initCompleteCB;
        var options = {
            scrollX: true,
            dom: 'rtipl',
            processing: true,
            serverSide: true,
            ajax: function (data, callbackFN) {
                this.provideData(data, callbackFN);
            }.bind(this),
            columns: this.getColumnNames()
        }

        $('#' + this.tableDivID).DataTable(options)
            .on( 'init.dt', function () {
                $('#progress-div').empty();
                cbFn();
            } );
    };

    this.generateTable = function () {
        // Do we need to get column names?
        if (!this.columnNames) {
            // Need to dynamically generate column names.
            $.get(this.url +  encodeURIComponent(this.buildBaseQuery({value: ""})) + ' LIMIT 0',
                function (data) {
                    this.columnNames = [];
                    data.data[0].forEach(function (cn) {
                        var obj = {};
                        obj.data = '"' + cn + '"'; // Some of the feeding applications use illegal characters in their column names.
                        obj.title = cn;
                        this.columnNames.push(obj);
                    }.bind(this));
                    this.fillDOM();
                }.bind(this));
        } else {
            this.fillDOM();
        }

    };

    // this.clearContents = function() {
    //     let dElem = $('#' + this.tableDivID);
    //     let dt = $(dElem.selector).DataTable();
    //     dt.destroy();
    //     dElem.empty();
    //     this.columnNames = null;
    //     this.recordsTotal = null;
    //     this.recordsFiltered = null;
    //     this.filtered = false;
    //     this.customSQL = null;
    // };
}
