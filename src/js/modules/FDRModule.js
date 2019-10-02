


/**
 * Module for handling GUI presentation and data filtering based on the protein FDR threshold used by the
 * search application.
 */
var FDRPresentation = (function(fdr){

    fdr.ignoreScores = ["theoretical mass","tic","score_name"];
    fdr.scoreName = null;
    fdr.scoreValue = null;
    fdr.softwareName = null;
    fdr.softwareVersion = null;
    fdr.fdrProtocolName = null;
    fdr.fdrProtocolValue = null;

    //Use plotly.js for scatter plots
    fdr.buildPlotlyPlots = function(){
        Object.keys(FDRPresentation.graphPackage).forEach(function(k, kIdx){
            //key is score name, eg: PeptideShaker PSM Score

            var passed = {
                y: FDRPresentation.graphPackage[k].passed,
                x: Array.from({length: FDRPresentation.graphPackage[k].passed.length}, (x,i) => i),
                mode: 'markers',
                type: 'scattergl',
                name: 'Passed FDR Threshold',
                hoverinfo: 'y'
            };

            var failed = {
                y: FDRPresentation.graphPackage[k].failed,
                x: Array.from({length: FDRPresentation.graphPackage[k].failed.length}, (x,i) => i),
                mode: 'markers',
                type: 'scattergl',
                name: 'Failed FDR Threshold',
                hoverinfo: 'y'
            };
            var data = [passed, failed];
            var layout = {
                title: k,
                xaxis: {
                    title: 'PSM Index',
                    showticklabels: false
                },
                height: 500
            };

            var forClick = document.getElementById('panel_' + kIdx);

            Plotly.newPlot('panel_' + kIdx, data, layout);

            // forClick.on('plotly_click', function(data){
            //     var filter_yval = 0;
            //     data.points.forEach(function(dp) {
            //         if (dp.y > filter_yval) {
            //             filter_yval = dp.y
            //         }
            //     });
            //     document.getElementById('filter_' + kIdx).innerText = 'Filter data by ' + k + ' score value >= ' + filter_yval;
            //     var node = document.createElement("button");
            //     node.innerText = 'Filter';
            //     node.style = "margin: 5px;";
            //     node.setAttribute('score_name', k);
            //     node.setAttribute('score_value', filter_yval);
            //     node.addEventListener('click', function(){
            //         console.log('Filtering now.');
            //         console.log('using score ' + this.getAttribute('score_name'));
            //         console.log('value of ' + this.getAttribute('score_value'));
            //     })
            //     document.getElementById('filter_' + kIdx).appendChild(node);
            // })

        });
    };

    //Get the actual scores for the discovered fields.
    fdr.getScoreData = function(fieldNames){
        let qStr = 'SELECT PSM.passThreshold, ';
        let baseURL = fdr.href + '/api/datasets/' + fdr.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';
        let url = baseURL;

        fieldNames.forEach(function(cv){
            qStr += 'PSM."' + cv + '",';
        });
        qStr = qStr.slice(0, qStr.lastIndexOf(','));
        qStr += ' FROM psm_entries PSM;';
        url += encodeURIComponent(qStr);

        $.get(url, function(data) {
            var graphPackage = {};
            var fNames = data.data[0].slice(1);
            data.data[0].slice(1).forEach(function (sn) {
                graphPackage[sn] = {};
                graphPackage[sn].passed = [];
                graphPackage[sn].failed = [];
            });
            data.data.slice(1).forEach(function (cv) {
                cv.slice(1).forEach(function (x, xidx) {
                    if (cv[0] === "true") {
                        graphPackage[fNames[xidx]].passed.push(x);
                    } else {
                        graphPackage[fNames[xidx]].failed.push(x);
                    }
                });
            });
            fNames.forEach(function(y){
                graphPackage[y].passed.sort(function(a,b){return a-b;});
                graphPackage[y].failed.sort(function(a,b){return b-a;});
            });
            FDRPresentation.graphPackage = graphPackage;

            url = baseURL + encodeURIComponent("SELECT protein_detection_protocol.name,protein_detection_protocol.value, " +
                "  analysis_software.name, analysis_software.version " +
                "   FROM protein_detection_protocol, analysis_software");

            $.get(url, function(data){
                FDRPresentation.fdrProtocolName = data.data[1][0];
                FDRPresentation.fdrProtocolValue = data.data[1][1];
                FDRPresentation.softwareName = data.data[1][2];
                FDRPresentation.softwareVersion = data.data[1][3];
                FDRPresentation.preparePlotlyPanel();
                FDRPresentation.buildPlotlyPlots();
                $('#' + FDRPresentation.divID).hide(); //Start hidden.
                FDRPresentation.publish("FDRDataPrepared");
            });
        });

    };

    //Get REAL scores that have full coverage. These scores will be used in plots
    fdr.getScores = function(){
        let qStr = 'SELECT score_summary.score_name FROM score_summary WHERE score_summary.pct_scores_present = 1 AND \n' +
            'score_summary.score_type = "REAL"';
        let  url = fdr.href + '/api/datasets/' + fdr.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';
        url += encodeURIComponent(qStr);

        $.get(url, function(data){
            var graphScores = [];
            data.data.slice(1).forEach(function(cv){
                if (FDRPresentation.ignoreScores.indexOf(cv[0]) === -1) {
                    graphScores.push(cv[0]);
                }
            });
            FDRPresentation.getScoreData(graphScores);
        });

    };


    //Builds GUI panel for Plotly plots
    fdr.preparePlotlyPanel = function() {
        let domStr = '<div class="panel panel-primary">' +
            '<div class="panel-heading">' +
            '<h3 class="panel-title">' +
            '<a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">' +
            'ID Scores</a></h3></div>' +
            '<div id="collapseOne" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="headingOne">' +
            '<div class="panel-body"><div class="row"><div class="col-md-12"><h5>##SOFTWARE_NAME## (##SOFTWARE_VERSION##) ##FDR_PROTOCOL_NAME## at ##FDR_PROTOCOL_VALUE##</h5></div></div>' +
            '##SCORE_DOM##' +
            '</div>';

        var sDom = '';
        Object.keys(FDRPresentation.graphPackage).forEach(function(k, kIdx){
            sDom += '<div class="row"><div class="col-md-12" id="filter_' + kIdx + '"></div></div>';
            sDom += '<div id="panel_' + kIdx + '"></div>';
        });

        domStr = domStr.replace('##SCORE_DOM##', sDom);
        domStr = domStr.replace('##SOFTWARE_NAME##', fdr.softwareName);
        domStr = domStr.replace('##SOFTWARE_VERSION##', fdr.softwareVersion);
        domStr = domStr.replace('##FDR_PROTOCOL_NAME##', fdr.fdrProtocolName);
        domStr = domStr.replace('##FDR_PROTOCOL_VALUE##', fdr.fdrProtocolValue);

        $('#' + fdr.divID).append($.parseHTML(domStr));

    };

    fdr.init = function(confObj){
        fdr.href = confObj.href;
        fdr.datasetID = confObj.datasetID;
        fdr.divID = confObj.divID;
        fdr.callBackFN = confObj.callBackFN;
        fdr.getScores();
    };

    return fdr;
}(FDRPresentation || {}));//eslint-disable-line no-use-before-define

