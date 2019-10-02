
const ScoreFilterHelp = {
    'text': '<p class="lead">Purpose</p><p>The Scores for Filtering panel allows you to search for PSMs ' + 
    'based on individual PSM scores. From the <em>Score</em> dropdown, you can choose one or multiple ' + 
    'PSM scores for fitering.</p><hr>' +
    '<p class="lead">Actions</p><p><dl>' + 
    '<dt>All conditions are true</dt><dd>Each chosen score filter must be true</dd>' +
    '<dt>Any condition is true</dt><dd>Any one score filter is true</dd>' + 
    '<dt>Filter Now</dt><dd>Produces a table of PSMs fulfilling your score filtering.</dd></p>'
}

/**
 * Module for allowing user to filter PSMs based on one or more score value.
 */
//$('#score-filter-rows').children().length
var ScoreFilterModule = (function(sfm){

    sfm.scoreSummary = null;
    sfm.guiDiv = 'score_filter_div';


    sfm.buildScoreFilterRow = function(sName){
        var rId = Math.random().toString(36).replace(/[^a-z]+/g, '');
        let divStr = '<div id="'+ rId +'" class="row">' +
            '<div class="col-md-4 sf-name"><span class="lead">' + sName + '</span></div>' +
            '<div class="col-md-3">MIN: ' + sfm.scoreSummary[sName]["min_value"] + ' MAX: ' + sfm.scoreSummary[sName]["max_value"] + '  </div>';

        divStr += '<div class="col-md-1"><select class="score_filter_op">' +
            '<option value="gt">&gt;</option><option value="gte">&ge;</option><option value="lt">&lt;</option><option value="lte">&le;</option>' +
            '</select></div>';

        divStr += '<div class="col-md-2"><input class="sf-number" type="number"></div><div class="col-md-1"><span delete-row="' + rId + '" class="glyphicon glyphicon-remove filter-remove" aria-hidden="true"></span></div>';


        return divStr;
    };

    sfm.prepareDOM = function() {
        let dStr = '<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title" style="display: inline;">Scores for Filtering</h3>' +
            '<span id="score_filter_help" class="glyphicon glyphicon-question-sign" style="padding: 5px"></span><span class="sr-only">Help?</span>' +
            '</div><div class="panel-body">' +
            '<div class="dropdown"><button class="btn btn-default dropdown-toggle" type="button" id="dropdown-score" data-toggle="dropdown">Score<span class="caret"></span></button>' +
            '<ul class="dropdown-menu" aria-labelledby="dropdown-score">##LIST##</ul></div>' +
            '<div id="score-filter-rows">' +
            '</div>' +
            '<input type="radio" value="AND" name="q-type" class="score_query_type"><label for="all-clause">All conditions are true (AND)</label>' +
            '<span>&nbsp;</span>' +
            '<input type="radio" value="OR" name="q-type" class="score_query_type" checked><label for="any-clause">Any condition is true (OR)</label>' +
            '</div><div class="panel-footer">' +
            '<button type="button" id="score-filter-now" class="btn btn-primary btn-sm">Filter Now</button>' +
            '<button type="button" id="score-filter-clear" class="btn btn-primary btn-sm">Clear Filter</button>' +
            '</div></div>';
        let scores = '';

        Object.keys(sfm.scoreSummary).sort().forEach(function(cv){
            if(sfm.scoreSummary[cv]['score_type'] === 'REAL') {
                scores += '<li class="shadow score_filter_name">' + cv + '</li>';
            }
        });

        dStr = dStr.replace('##LIST##', scores);
        $('#' + sfm.guiDiv).append($.parseHTML(dStr));

        //wire
        $('.score_filter_name').on('click', function(){
            let divStr =  sfm.buildScoreFilterRow($(this).text());
            $('#score-filter-rows').append(divStr);

            $('.filter-remove').on('click', function(){
                document.getElementById($(this).attr('delete-row')).remove();
            });

        });

        $('#score-filter-clear').on('click', function(){
            $('#' + sfm.guiDiv).empty();
            sfm.publish("UserClearedScoreFilter");
        });

        $('#score-filter-now').on('click', function(){
            let filterStr = ' ';
            let ops = {'gt': '>', 'gte': '>=', 'lt': '<', 'lte': '<='};
            //$('input[name=q-type]:checked').val() =>"any-clause" | "all-clause"

            $('#score-filter-rows').children().each(function(){
                filterStr += 'psm_entries."' + $(this).find('.sf-name').text() + '" ' +
                    ops[$(this).find('.score_filter_op').val()] + ' ' + $(this).find('.sf-number').val()  +
                    ' ' + $('input[name=q-type]:checked').val() + ' ';
                });
            filterStr = filterStr.slice(0, filterStr.lastIndexOf(' ' + $('input[name=q-type]:checked').val() + ' '));

            sfm.publish("UserProvidesScoreFiltering", {
                fStr: filterStr,
                data: sfm.peptideObjs
            });
        });

        $('#score_filter_help').on('click', function() {
            BuildHelpPanel.showHelp({
                'helpText': ScoreFilterHelp.text,
                'title': 'Score Filter Help'
            });
        });
    };

    sfm.prepareScoreFiltering = function(data){
        sfm.peptideObjs = data;
        sfm.prepareDOM();
    };

    sfm.init = function(confObj) {

        if (confObj['baseDiv']) {
            sfm.guiDiv = confObj['baseDiv'];
        }

        sfm.subscribe('ScoreSummaryComplete', function(data){
            sfm.scoreSummary = data;
        });

        sfm.subscribe('ScoreFilteringRequest', function (data) {
            sfm.prepareScoreFiltering(data);
        });

        sfm.subscribe('GlobalScoreFilterRequest', function(){
           sfm.peptideObjs = [];
           sfm.prepareDOM();
        });

    };

    return sfm;
}(ScoreFilterModule||{}));//eslint-disable-line no-use-before-define