
/**
 * Manages the presentation of peptide sequences by file and by paging within file.
 */
var SequenceByFile = (function(sbf){

    sbf.drawTable = function(){
        var domStr = '<div class="col-md-4" id="sequence_data_div"><div class="panel panel-default">' +
            '<div class="panel-heading">' +
            '<div class="row">' +
            '<div class="col-md-10">' +
            '<div class="panel-title">Filtering Sequences</div>' +
            '</div>' +
            '<div class="col-md-2"><button class="glyphicon glyphicon-remove btn-xs clear-filter"></button></div></div></div>' +
            '<div class="panel-body fixed-height-panel">';

        sbf.pagedData.forEach(function(cv){

            if (cv[1].length > 0) {

                domStr += '<div class="row shadow filter-by" data-entries="' + cv[1] + '">' +
                    '<div class="col-md-12"><strong>' + cv[0] + '</strong></div>' +
                    '<div class="col-md-12"><small>' + cv[1][0] + '</small>' +
                    ' to ' +
                    '<small>' + cv[1].slice(-1) + '</small></div>' +
                    '</div>';
            }
        });

        domStr += '</div></div></div>';

        $('#' + sbf.elID).append($.parseHTML(domStr));

        $('.filter-by').on('click', function(){

            $('.filter-by').each(function(){
               if (!$(this).hasClass('shadow')) {
                   $(this).removeClass('used-for-filtering');
                   $(this).addClass('shadow');
               }
            });

            $(this).removeClass('shadow');
            $(this).addClass('used-for-filtering');
            sbf.filterFunc($(this).attr('data-entries'));
        });

        $('.clear-filter').on('click', function(){
            var od = $('#overview_div');
            $('#sequence_data_div').remove();

            od.removeClass('col-md-8');
            od.addClass('col-md-12');
            $('#data-table').DataTable().search('');
            $('#data-table').DataTable().draw();
        });

    };

    sbf.pageData = function(){

        sbf.pagedData = [];

        Object.keys(sbf.seqData).forEach(function(k){
            var numPages = Math.floor(sbf.seqData[k].length/sbf.pageSize);
            var curPage;

            if (numPages === 0) {
                sbf.pagedData.push([k, sbf.seqData[k]]);
            } else {
                //Page the large sequence array.
                for (curPage = 0; curPage <= numPages; curPage += 1) {
                    sbf.pagedData.push(
                        [
                            k + ' : Page ' + (curPage + 1),
                            sbf.seqData[k].slice((curPage * sbf.pageSize),((curPage * sbf.pageSize) + sbf.pageSize))
                        ]);
                }
            }
        });
        sbf.drawTable();
    };

    sbf.init = function(confObj) {
        sbf.pageSize = confObj.pageSize || 50;
        sbf.seqData = confObj.seqData;
        sbf.elID = confObj.elID;
        sbf.pageData();
        sbf.filterFunc = confObj.callBack;
    };

    return sbf;
}(SequenceByFile || {}));// eslint-disable-line no-use-before-define