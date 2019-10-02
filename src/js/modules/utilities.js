

/**
 * General utility for building and presenting modal help
 */
var BuildHelpPanel = (function (bhp){
    bhp.domStr = '<div id="user_help_modal" class="modal fade" tabindex="-1" role="dialog">\n' +
    '  <div class="modal-dialog" role="document">\n' +
    '    <div class="modal-content">\n' +
    '      <div class="modal-header">\n' +
    '        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\n' +
    '        <h4 class="modal-title">#MODAL_TITLE#</h4>\n' +
    '      </div>\n' +
    '      <div class="modal-body">\n' +
    '        <p>#HELP_TEXT#</p>\n' +
    '      </div>\n' +
    '      <div class="modal-footer">\n' +
    '        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '      </div>\n' +
    '    </div><!-- /.modal-content -->\n' +
    '  </div><!-- /.modal-dialog -->\n' +
    '</div><!-- /.modal -->';

    bhp.finalDom = '';

    bhp.showHelp = function(confObj) {
        
        bhp.finalDom = bhp.domStr.replace('#HELP_TEXT#', confObj.helpText);
        bhp.finalDom = bhp.finalDom.replace('#MODAL_TITLE#', confObj.title)
        $('#master_modal').empty().append(bhp.finalDom);
        $('#user_help_modal').modal('show');
    }
    return bhp;
}(BuildHelpPanel || {}));

/**
 * Handle general configurations for the app.
 */
var ConfigModal = (function (cm){

    cm.userDefaults = {
        'tool_tip_visible': true
    };

    cm.domStr = '<div id="app_config_modal" class="modal fade" tabindex="-1" role="dialog">\n' +
        '  <div class="modal-dialog" role="document">\n' +
        '    <div class="modal-content">\n' +
        '      <div class="modal-header">\n' +
        '        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\n' +
        '        <h4 class="modal-title">Configuration</h4>\n' +
        '      </div>\n' +
        '      <div class="modal-body">' +
        '       <div>' +
        '        <input type="checkbox" id="config_tooltip" class="app_config" value="tool_tip_visible"/>' +
        '        <label for="config_tooltip">Enable tooltips</label>' +
        '       </div></div>' +
        '      <div class="modal-footer">\n' +
        '        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
        '        <button id="save_config_change" type="button" class="btn btn-default">Save Changes</button>' +
        '      </div>\n' +
        '    </div><!-- /.modal-content -->\n' +
        '  </div><!-- /.modal-dialog -->\n' +
        '</div><!-- /.modal -->';

    cm.showConfig = function(){
        $('#master_modal').empty().append(cm.domStr);

        Object.keys(cm.userDefaults).forEach(function (k) {
            var s = 'input[value="' + k + '"]';
            document.querySelector(s).checked = cm.userDefaults[k];
        });

        $('#save_config_change').on('click', function(){
            var configs = document.querySelectorAll('input[class="app_config"]');
            var msgObj = {};
            configs.forEach(function (cv)  {
                msgObj[cv.getAttribute('value')] = cv.checked;
                cm.userDefaults[cv.getAttribute('value')] = cv.checked;
            });
            cm.publish('UserChangedDefaults', msgObj);
            $('#app_config_modal').modal('hide');
        });

        $('#app_config_modal').modal('show');
    };

    return cm;

}(ConfigModal || {}));


/**
 * There can be many, many scores available to the user. This code allows for
 * managing which scores are visible.
 *
 * By default, only scores that are present on > 85% of PSM entries are visible.
 */
var ScoreDefaults = (function (sd){

    sd.defaultThreshold = 0.85;
    sd.scoreProperties = {};

    sd.resetDOM = function() {
        $('#score_default_div').empty();
        $('#score_defaults').removeAttr("   disabled");
    }

    sd.modifyVisibleScores = function(){
        var rVal = [];
        $('div .score_name').each(function(){
            sd.scoreProperties[$(this).text()] = $(this).hasClass('selected');
        });

        Object.keys(sd.scoreProperties).forEach(function(key){
            if (sd.scoreProperties[key]) {
                rVal.push(key);
            }
        });
        sd.publish('VisibleScores', rVal);

        sd.resetDOM();
    };

    sd.showDOM = function(){

        let domStr = '<div class="col-md-12" id="score_choice_div"><div class="panel panel-default">' +
            '<div class="panel-heading">' +
            '<div class="row">' +
            '<div class="col-md-8">' +
            '<div class="panel-title"><strong>Choose Score Visibility</strong></div>' +
            '</div>' +
            '<div class="col-md-2"><button id="set_score_defaults_btn" class="btn">Set Defaults</button></div>' +
            '<div class="col-md-2"><button id="clear_div_btn" class="btn">Cancel</button></div></div></div>' +
            '<div class="panel-body fixed-height-panel col-md-12"><div class="row">';

        //Build out the panel body
        var scoreStr = '';
        Object.keys(sd.scoreProperties).forEach(function(s, idx){

            if (idx === 0) {
                scoreStr = '<div class="row">';
            }
            if ((idx % 2 === 0) && (idx > 0)) {
                scoreStr += '<div class="row">';
            }

            if (sd.scoreProperties[s]) {
                scoreStr += '<div class="col-md-5 score_name selected"><strong>' + s + '</strong></div>'
            } else {
                scoreStr += '<div class="col-md-5 score_name"><strong>' + s + '</strong></div>'
            }

            if (idx % 2 > 0) {
                scoreStr += '</div>';
            }
        });

        domStr += scoreStr + '</div></div></div></div>';
        $('#score_default_div').append(domStr);
        $('div .score_name').on('click', function(){
            $(this).toggleClass('selected');

        });
        $('#clear_div_btn').on('click', function(){
            sd.resetDOM();
        });
        $('#set_score_defaults_btn').on('click', sd.modifyVisibleScores);
    };

    sd.prepareDOM = function() {
        let b = $('#score_defaults');
        b.removeAttr("disabled");
        b.on('click', function() {
            $('#score_defaults').attr('disabled', 'disabled');
            sd.showDOM();
            $('#score_defaults').tooltip('hide');
        });
    };

    sd.init = function () {

        sd.subscribe('RequestVisibleScores', function(){
            var rVal = [];
            Object.keys(sd.scoreProperties).forEach(function(key){
                if (sd.scoreProperties[key]) {
                    rVal.push(key);
                }
            });
            sd.publish('VisibleScores', rVal);
            sd.prepareDOM();
        });

        sd.subscribe('RankedScoresAvailable', function(arg){
            //arg is an array of [scorename, pct coverage] ordered by pct coverage desc
            arg.forEach(function(s){
                if (s[1] > sd.defaultThreshold) {
                    //By default show
                    sd.scoreProperties[s[0]] = true;
                } else {
                    //By default hide
                    sd.scoreProperties[s[0]] = false;
                }
            });

        });
        sd.publish('RequestRankedScores');

    };

    return sd;
}(ScoreDefaults || {}));//eslint-disable-line no-use-before-define

