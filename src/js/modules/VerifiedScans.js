
var VerifiedScans = (function(vs){

    vs.psmEntrySQL = 'SELECT psm_entries.* FROM psm_entries ' +
        'WHERE psm_entries.spectrumID = ##ID## AND ' +
        'psm_entries.spectrumTitle = ##TITLE##';

    vs.galaxyHeader = [];

    /**
     * key: spectrum ID
     * deleted: [T|F]
     * score:
     * sequence: peptide sequence
     * savedToGalaxy: [T|F]
     *
     * @type {{}}
     */
    vs.verifiedScans = {};

    vs.sendToGalaxy = function(){
        var fData = vs.galaxyHeader.join('\t') + '\n';
        var payload = {
            'files_0|url_paste': null,
            'dbkey': '?',
            'file_type': 'tabular',
            'files_0|type': 'upload_dataset',
            'files_0|space_to_tab': null,
            'files_0|to_posix_lines': 'Yes'
        };
        var postData = {
            history_id: vs.galaxyConfiguration.historyID,
            tool_id: 'upload1',
            inputs: null
        };

        Object.keys(vs.verifiedScans).forEach(function(k){
            if (!vs.verifiedScans[k].savedToGalaxy && !vs.verifiedScans[k].deleted) {
                fData += vs.verifiedScans[k].psmEntry.join('\t') + '\n';
                vs.verifiedScans[k].savedToGalaxy = true;
            }
        });

        payload['files_0|url_paste'] = fData;
        postData.inputs = JSON.stringify(payload);

        $.ajax({
            url: vs.galaxyConfiguration.href + '/api/tools',
            type: 'POST',
            error: function () {
                console.log('ERROR in POSTING sequence file.');
            },
            success: function (data) {
                console.log('ID for file is ' + data.outputs[0].id);
                VerifiedScans.verifiedScans = {};
                $('#scan-count-badge').text(VerifiedScans.eligibleScansCount());
            },
            data: postData
        });
        vs.eligibleScansCount();
    };

    vs.eligibleScansCount = function(){
        var rVal = 0;

        Object.keys(vs.verifiedScans).forEach(function(cv){
            if (!(vs.verifiedScans[cv].deleted) && !vs.verifiedScans[cv].savedToGalaxy) {
                rVal += 1;
            }
        });

        if (rVal === 0) {
            $('#scans-to-galaxy').attr('disabled', 'disabled')
        } else {
            $('#scans-to-galaxy').removeAttr('disabled');
        }

        return rVal
    };

    vs.removeScan = function(id) {
        if (id in vs.verifiedScans) {
            vs.verifiedScans[id].deleted = true;
            $('#scan-count-badge').text(vs.eligibleScansCount());
        }
    };

    vs.addScore = function(id){
      var sql = vs.psmEntrySQL.replace('##ID##', '"' + id.split(',')[0] + '"');
      sql = sql.replace('##TITLE##', '"' + id.split(',')[1] + '"');
      var specID = id;

      $.get(vs.url + sql, function(data){
          if (vs.galaxyHeader.length === 0) {
              vs.galaxyHeader = vs.galaxyHeader.concat(data.data[0]);
          }
          vs.verifiedScans[specID].psmEntry = data.data[1];
      });

    };

    vs.init = function(confObj){
        vs.galaxyConfiguration = confObj.galaxyConfiguration;
        vs.url = vs.galaxyConfiguration.href + '/api/datasets/' +
            vs.galaxyConfiguration.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';

        /** arg ->
         *  spectrum_pkid: RenderPSM.currentSpectra[$(this).val()].Spectrum_pkid,
            peptide_pkid: RenderPSM.currentSpectra[$(this).val()].Peptide_pkid,
            spectrum_title:
            sequence: RenderPSM.currentSpectra[$(this).val()].sequence

         */
        vs.subscribe('userVerifiedSpectrum', function (arg){
            if (!((arg.spectrum_pkid + ',' +  arg.spectrum_title) in vs.verifiedScans)) {
                vs.verifiedScans[arg.spectrum_pkid + ',' + arg.spectrum_title] = {
                    deleted: false,
                    savedToGalaxy: false,
                    sequence: arg.sequence,
                    peptide_pkid: arg.peptide_pkid,
                    spectrum_pkid: arg.spectrum_pkid,
                    spectrum_title: arg.spectrum_title

                };
                vs.addScore(arg.spectrum_pkid + ',' + arg.spectrum_title);
            } else {
                vs.verifiedScans[arg.spectrum_pkid + ',' + arg.spectrum_title].deleted = false;
            }
            $('#scan-count-badge').text(vs.eligibleScansCount());
        });
        vs.subscribe('userUnverifiedSpectrum', function (arg){
            vs.removeScan(arg.scanID);
        });

        $('#scans-to-galaxy').on('click', function(){
            vs.sendToGalaxy();
            $('#scans-to-galaxy').tooltip('hide');
        }).attr('disabled', 'disabled');
    };

    return vs;

}(VerifiedScans || {}));// eslint-disable-line no-use-before-define