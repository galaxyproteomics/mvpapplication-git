

/**
 * Module code for creating and managing the IGV.js browser.
 * 
 * Galaxy history entry for the MZ.Sqlite _must_ have a valid DBKey assigned.
 * @param confObj
 * @constructor
 */
function IGVModule(confObj) {

    this.addTrackCB = confObj.addTrackCB;
    this.igvDiv = confObj.igvDiv;
    this.data = confObj.data;
    if (confObj.genome) {
        this.genome = confObj.genome;
    } else {
        this.genome = confObj.dbkey || "hg19"; //A default value // TODO: Really?? 
    }
    
    this.hidden = false;
    if (confObj.fasta_file) {
        this.fasta_file = confObj.fasta_file;
    }
    if (confObj.fasta_index) {
        this.fasta_index = confObj.fasta_index;
    }
}

//Build all the custom UI surrounding the IGV browser.
IGVModule.prototype.fillChrome = function () {
    const IGVOverviewHelp = {
        'text': '<p class="lead">Purpose</p>' +
        '<p>The IGV panel is the Broad Institutes <a href="http://software.broadinstitute.org/software/igv/" target="_blank">IGV</a> viewer for web applications</p>' +
        '<p>At the start, the IGV viewer is centered around the chromosome location you clicked on in the Peptide-Protein Viewer</p>' +
        '<p>You can move about the entire genome from the IGV viewer. In addition you can load tracks based on data files' +
        ' in your current Galaxy history (for instance: BAM, BED or GTF files).</p>' +
        '<p>Note that you cannot change the underlying genome. The genome is set by your Galaxy history.</p>'
    }

    let pStr = '<div class="panel panel-default"><div class="panel-heading">' +
        '<div class="row"><div class="col-md-1"><span class="genome-id-value">Genome: ' + this.genome + '</span></div>' +
        '<div class="col-md-8"><div class="btn-group" role="group" aria-label="...">' +
        '<button id="add-track" type="button" class="btn btn-default">Add Track</button>' +
        '</div></div><div class="col-md-1"><button class="kill-igv-browser">Hide</button>' +
        '<span id="igv_overview_help" class="glyphicon glyphicon-question-sign" style="padding: 5px"></span></div>' +
        '</div></div>' +
        '</div><div class="panel-body">' +
        '<div id="browser-location"></div></div></div>';
    let self = this;

    $('#' + this.igvDiv).append($.parseHTML(pStr));

    $('#add-track').on('click', function(){
        self.addTrackCB();
    });

    $('#igv_overview_help').on('click', function() {
        BuildHelpPanel.showHelp({
            'helpText':IGVOverviewHelp.text,
            'title': 'IGV Overview Help'
        });
    });

    $('.kill-igv-browser').on('click', function () {
        self.hidden = true;
        $('#igvDiv').hide();
    });

};

IGVModule.prototype.loadTrack = function(o) {
  igv.browser.loadTrack(o);
};

IGVModule.prototype.goToLocation = function (loc) {
    if (this.hidden) {
        $('#igvDiv').show();
    }
    igv.browser.search(loc);
};

IGVModule.prototype.showBrowser = function () {
    
    let ref = {};
    // Are we working from a Galaxy genome or IGV reference?
    if (this.fasta_file) {
        ref['fastaURL'] = this.fasta_file;
        ref['indexURL'] = this.fasta_index;
    } else {
        ref['genome'] = this.genome;
    }

    let options = {
        reference: ref,        
        locus: this.data.chrom + ":" + this.data.start + "-" + this.data.end
    };
    this.fillChrome();
    igv.createBrowser(document.getElementById("browser-location"), options);
};

var IGVManager = (function (igm) {
    let validTrackFiles = null;

    igm.goToLocation = function(strL) {
        igm.browser.goToLocation(strL);
    };

    igm.showTrackModal = function(){
        let s = '<div class="modal fade" id="galaxy-tracks" tabindex="-1" data-backdrop="false" role="dialog"><div class="modal-dialog" role="document">' +
            '<div class="modal-content">' +
            ' <div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
            '  <h4 class="modal-title">Load IGCV Tracks <h4></div>' +
            ' <div class="modal-body">' +
            '  <p>Available IGV Tracks:</p>' +
            '  <ul class="list-group">##TRACK_LIST##</ul></div>' +
            ' <div class="modal-footer">' +
            '  <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
            '  <button id="btn-load-track" type="button" class="btn btn-primary">Load Track</button>' +
            ' </div></div></div></div>';
        let trackList = '';

        if (validTrackFiles.length == 0) {
            $('#igvDiv').prepend('<div class="alert alert-danger" role="alert">Sorry, your Galaxy history does not contain a valid IGV track. There is nothing available to load.</div>');
            $('#add-track').attr("disabled", "disabled");
        } else {
            validTrackFiles.forEach(function(t){
                trackList += '<li ';
                if (t.indexURL) {
                    trackList += ' indexURL="' + t.indexURL + '"';
                }
                trackList += ' trackGroup="' + t.trackGroup + '" sourcetype="' + t.sourceType + '" gid="'+ t.id +'" class="list-group-item track-id-item">' + t.name + '</>';
            });
            s = s.replace('##TRACK_LIST##', trackList);
            $('#master_modal').empty().append(s);

            $('.track-id-item').on('click', function(){
                $(this).toggleClass('selected');
            });

            $('#btn-load-track').on('click', function(){
                $('.track-id-item.selected').each(function(){
                    let apiCall = igm.galaxyConfiguration.href + '/api/histories/' +
                        igm.galaxyConfiguration.historyID +'/contents/' + $(this).attr('gid') + '/display';
                    let opts = {};
                    opts.type = $(this).attr('trackGroup');
                    opts.sourceType = $(this).attr('sourcetype');
                    opts.url = apiCall;
                    opts. name = $(this).text();
                    if ($(this).attr('indexURL')) {
                        opts.indexURL = $(this).attr('indexURL');
                    }
                    igm.browser.loadTrack(opts);

                });
                $('#galaxy-tracks').modal('hide');
            });

            $('#galaxy-tracks').modal({'backdrop': false});
        }
    };

    igm.addIGVTrack = function(){
        if (validTrackFiles) {
            igm.showTrackModal(validTrackFiles)
        } else {
            igm.subscribe("ValidTrackFilesAvailable", function(d){
                validTrackFiles = d;
                igm.showTrackModal(validTrackFiles);
            });
            igm.publish("NeedValidTrackFiles");
        }
    };

    igm.createNewBrowser = function(confObj){
        confObj.addTrackCB = igm.addIGVTrack;
        igm.browser = new IGVModule(confObj);
        igm.browser.showBrowser();
    };


    //IGV default genome use. 
    // We are here because of a Galaxy API call failure. Fall back to one of the
    // supported IGV genomes. Otherwise, inform the user we are having an issue.
    igm.defaultGenomeConfig = function(defaultObject) {
        let hosted_genomes = [
            "hg38",
            "hg19",
            "hg18",
            "mm10",
            "gorGor4",
            "panTro4",
            "panPan2",
            "susScr11",
            "bosTau8",
            "canFam3",
            "rn6",
            "danRer11",
            "danRer10",
            "dm6",
            "ce11",
            "sacCer3",
        ];

        //Do we have an exact match "galaxy dbKey": "mm10" <-> "hosted_genomes": "mm10"?
        let idx = hosted_genomes.indexOf(defaultObject.genome.toLowerCase());
        let igv_genome = '';
        if (idx > -1) {
            igv_genome = hosted_genomes[idx];
            defaultObject.igvConfObj.fasta_file = null;
            defaultObject.igvConfObj.fasta_index = null;
            defaultObject.igvConfObj.genome = igv_genome;
            igm.createNewBrowser(defaultObject.igvConfObj);
        } else {
            // Got a partial match?? mm9 will match mm10
            let rx = /\D+/;
            let galaxy_genome = rx.exec(defaultObject.genome.toLowerCase());
            for (let i = 0; i < hosted_genomes.length; i++) {
                let result = rx.exec(hosted_genomes[i]);
                if (result[0] === galaxy_genome[0]) {
                    // First match and we are out.
                    defaultObject.igvConfObj.fasta_file = null;
                    defaultObject.igvConfObj.fasta_index = null;
                    defaultObject.igvConfObj.genome = result["input"];
                    igm.createNewBrowser(defaultObject.igvConfObj);
                }
            }
            // No matches at all
            alert("No genomes are available to use with the MVP Viewer.");
        }
        

    }

    igm.buildModule = function (confOb) {
        //Get URI for index file and fasta file, URI call will be based on dbkey.
        //http://localhost:8080/api/genomes/mmXX/genome_uri
        let uri = this.galaxyConfiguration.href + '/api/genomes/' + 
            this.galaxyConfiguration.dbkey + '/genome_uri';
        let cobj = confOb;
        fetch(uri)
            .then((resp) => resp.json())
            .then(function(data){
                cobj.fasta_file = data["fasta_file"];
                cobj.fasta_index = data["fasta_index"];
                igm.createNewBrowser(cobj);
        }).catch(function(error){
            // Use IGV supported genomes only. 
            igm.defaultGenomeConfig({
                'genome': cobj.dbkey,
                'igvConfObj': cobj
            });
        }) 
    };

    igm.init = function(confObj) {
      igm.galaxyConfiguration = confObj.galaxyConfiguration;
    };

    return igm;
}(IGVManager || {}));//eslint-disable-line no-use-before-define

/**
 * Name:            PSMProteinViewer.js
 * Author:          mcgo0092@umn.edu
 * Created:         Mar 1 2016
 *
 * Description:
 *              This is a D3.js based svg generator. It is meant to show a user
 *              the relationship between user chosen PSM sequences, associated
 *              peptide sequences and the originating protein.
 *
 */

let PSMProteinViewer = (function () {
    /**
     *
     * @param confObj The object containing protein information.<br/>With the following elements <br/>
     *
     *      baseDiv: '#id' The DOM element to insert all SVGs.
     *      genome: [
     *          {
                    cds_end:143
                    cds_start:0
                    chrom:"15"
                    end:41096310
                    name:"H0YMN5"
                    start:41096167
                    strand:"-"
     *          }
     *      ],
     *      protein: {
     *          sequence: [] Array of peptide sequences
     *          offset: x If the offset should start at something else than 0
     *          name: 'protein name' The protein name.
     *      }
     *      peptideList: [
     *          {
     *              sequence: [], sequence array
     *              offset: int, where does the peptide start on the protein
     *              score: '', string of a score to show in tooltip
     *          } ...
     *      ]
     * @constructor
     */
    function PSMProteinViewer(confObj) {

        var self = this;
        var viewObject = confObj;

        this.dbkey = confObj.dbkey;

        //Callback function for requesting an MSMS render of a PSM
        this.msmsRender = confObj.msmsRender;

        //Basic configuration values

        //Holds all the protein information
        this.proteinObj = confObj.protein;
        //Holds all the PSMs
        this.peptideList = confObj.peptideList;

        if (confObj.genome) {
            this.genomeList = confObj.genome;
        } else {
            this.genomeList = [];
        }
        ;


        this.aaAbrev = {
            "A": "ala",
            "R": "arg",
            "N": "asn",
            "D": "asp",
            "C": "cys",
            "Q": "gln",
            "E": "glu",
            "G": "gly",
            "H": "his",
            "I": "ile",
            "L": "leu",
            "K": "lys",
            "M": "met",
            "F": "phe",
            "P": "pro",
            "S": "ser",
            "T": "thr",
            "W": "trp",
            "Y": "tyr",
            "V": "val",
            "B": "asx",
            "Z": "glx",
            "X": "xaa"
        };

        //Modifications, dynamically set from input
        this.modifications = [];
        var boundList = this.modifications;
        this.peptideList.forEach(function (p) {
            if (p.hasOwnProperty('mods')) {
                p.mods.forEach(function (m) {
                    if (boundList.indexOf(m[1]) === -1) {
                        boundList.push(m[1]);
                    }
                });
            }
        });

        //Protein rect size in focus area
        this.prtSz = 20;
        //rounded rect
        this.rXrY = 5;
        //Opacity
        this.rectOpacity = .75;
        //Text Y buffer
        this.txtYBuffer = 4;
        //Track where the protein is showing 0 === beginning of protein
        //This is never > 0, it is the translate x offset
        this.prtSeqXPos = 0;
        //Show protein sequence offset every xth aa. Default is every 10th residue
        this.offsetModal = 10;
        //maximum Y offset when all peptides are rendered.
        this.maxFocusY = 0;
        //protein rect size in context area
        this.ctxPrtSz = 5;
        //Holds y coordinates of drawn peptides. Used for packing
        this.psmExclusions = [];

        this.margin = {left: 50, right: 50, top: 50, bottom: 50};

        //base div for svg, will be overridden by user
        this.baseDiv = confObj.baseDiv || 'body';

        //div for igv.js viewer
        this.igvDiv = confObj.igvDiv;

        //Prep for SVG creation
        //add context and focus divs.
        $(self.baseDiv).append($.parseHTML('<div id="prt_name" class="col-md-12"></div>'));
        $(self.baseDiv).append($.parseHTML('<div id="genome" class="col-md-12"></div>'));
        $(self.baseDiv).append($.parseHTML('<div id="focus" class="col-md-12"></div>'));
        $(self.baseDiv).append($.parseHTML('<div id="context" class="col-md-12"></div>'));

        //SVG holding protein name and desciption
        this.prtNameSVG = d3.select('#prt_name')
            .append('svg')
            .attr('width', function () {
                return $('div#prt_name').width() - self.margin.left - self.margin.right;
            })
            .attr('height', 50);

        this.genomeSVG = d3.select("#genome")
            .append('svg')
            .attr('width', function () {
                return $('div#prt_name').width() - self.margin.left - self.margin.right;
            })
            .attr('height', 50);

        //SVG holding the focus graphics
        this.focusSVG = d3.select('#focus')
            .append('svg')
            .attr('width', function () {
                return $('div#focus').width() - self.margin.left - self.margin.right;
            })
            .attr('height', '100%');
        //Focus 'g'
        this.focusGroup = null;

        //SVG holding the context graphics
        this.contextSVG = d3.select('#context')
            .append('svg')
            .attr('width', function () {
                return $('div#context').width() - self.margin.left - self.margin.right;
            })
            .attr('height', '100%');

        //Context 'g'
        this.contextGroup = null;
        //Genome group
        this.genomeGroup = null;

        //Context svg uses a d3 scale.
        this.ctxXScale = d3.scaleLinear()
            .domain([0, self.proteinObj.sequence.length])
            .range([0, parseInt(self.contextSVG.style('width'))]);

        //Rendering functions and helpers -------------------------------------

        //Moves the focus locator line to the corrected position in the context SVG.
        this.lineRelocator = function () {
            var newX1 = (-1) * ((self.prtSeqXPos / self.prtSz));
            var newX2 = newX1 + (Math.floor(parseInt(self.focusSVG.style('width')) / self.prtSz));

            d3.select('line.locator')
                .attr('x1', self.ctxXScale(newX1))
                .attr('x2', self.ctxXScale(newX2));
        };

        //Allows for proper packing of sequences.
        //No overlapping of peptide sequences in the y direction.
        this.calcExclusionZone = function (len, offset, sizeOffset) {
            var factor = 2;

            self.psmExclusions.map(function (cv) {
                if (((offset <= cv[1]) && (offset >= cv[0])) || ((offset + (len - 1) <= cv[1]) && (offset + (len - 1) >= cv[0]))) {
                    factor += 1;
                }
            });

            self.psmExclusions.push([offset, offset + (len - 1)]);
            return (factor * sizeOffset);
        };

        this.styleMods = function (data, idx) {
            var elemIDX = idx;
            if (data.hasOwnProperty('mods')) {
                data.mods.forEach(function (aMod) {
                    var offset = aMod[0] === 0 ? 0 : aMod[0] - 1; //TODO: talk to JJ about this crazy offset issue in the DB
                    $('rect.peptide_' + elemIDX + ':eq(' + offset + ')').addClass('ptm');
                    $('text.peptide_' + elemIDX + ':eq(' + offset + ')').addClass(aMod[1].toLowerCase());
                });
        }
        };

        //Rendering functions and helpers -------------------------------------

        //Div for tooltip display used as user hovers
        this.ttDiv = d3.select("body").append("div")
            .attr("class", "tooltip")
            .attr("id", "d3-tooltip")
            .style("opacity", 0);

        //Actual SVG rendering
        this.renderSVG = function () {

            //Protein name and description
            self.prtNameSVG.append('g')
                .append('text')
                .text(function () {
                    return self.proteinObj.name;
                })
                .attr('x', 0)
                .attr('y', 20)
                .attr("font-family", "sans-serif")
                .attr("font-size", "20px");


            //Add drag behavior.
            self.focusGroup = self.focusSVG.append('g')
                .attr('transform', 'translate(0,5)')
                .call(d3.drag().on('drag', function () {
                    self.prtSeqXPos += d3.event.dx;
                    //Confine the sequence line from running off the left
                    if (self.prtSeqXPos > 0) {
                        self.prtSeqXPos = 0;
                    }
                    //Confine the sequence line from running off the right
                    if (Math.abs(self.prtSeqXPos) > (self.proteinObj.sequence.length - 20) * self.prtSz) {
                        self.prtSeqXPos = (-1) * ((self.proteinObj.sequence.length - 20) * self.prtSz);
                    }
                    d3.select(this).attr('transform', 'translate(' + self.prtSeqXPos + ',0)');
                    //move the genome group
                    if (self.genomeGroup) {
                        self.genomeGroup.attr('transform', 'translate(' + self.prtSeqXPos + ',0)');
                    }
                    self.lineRelocator();
                }));


            self.genomeGroup = self.genomeSVG.append('g')
                .attr('transform', 'translate(0,0)');
            //Draw the genome schematic, if needed
            if (self.genomeList.length > 0) {

                //SVG patterns for showing genomic information
                $('div #genome').find('g').append('<svg>' +
                    '<defs><pattern id="genomePlus" x="0", y="0" width="8" height="8" patternUnits="userSpaceOnUse">' +
                    '<polygon points="0,0 0,8 4,4" style="fill:#e6550d;stroke:gray;stroke-width:1;opacity:1.0"></polygon>' +
                    '</pattern><pattern id="genomeNeg" x="0", y="0" width="8" height="8" patternUnits="userSpaceOnUse">' +
                    '<polygon points="8,0 8,8 4,4" style="fill:#e6550d;stroke:gray;stroke-width:1;opacity:1.0"></polygon>' +
                    '</pattern>' +
                    '<pattern id="ref_align" patternUnits="userSpaceOnUse" x="0" y="0" width="10" height="10"> <line x1="0" y1="10" x2="5" y2="0" style="stroke:#9c3e0d;stroke-width:1" /> ' +
                    '<line x1="5" y1="10" x2="10" y2="0" style="stroke:#9c3e0d;stroke-width:1" /></pattern>' +
                    '</defs></svg>');

                self.genomeGroup.selectAll('rect')
                    .data(self.genomeList)
                    .enter().append('rect')
                    .attr('x', function (d) {
                        return (d['cds_start'] / 3) * self.prtSz;
                    })
                    .attr('y', 0)
                    .attr('width', function (d) {
                        var x = (d['cds_end'] / 3) - (d['cds_start'] / 3);
                        return x * self.prtSz;
                    })
                    .attr('height', 8)
                    .attr('class', 'genome_line')
                    .attr('fill', function (d) {
                        if (d['strand'] === '+') {
                            return 'url(#genomePlus)';
                        } else {
                            return 'url(#genomeNeg)'
                        }
                    })
                    .attr('rx', self.rXrY)
                    .attr('ry', self.rXrY)
                    .on('click', function () {
                        let d = d3.select(this).data()[0];
                        let options = {};

                        if (PSMProteinViewer.igvModule) {
                            //already created just search
                            IGVManager.goToLocation(d.chrom + ":" + d.start + "-" + d.end);
                        } else {
                            options.igvDiv = self.igvDiv;
                            options.data = d;
                            options.dbkey = self.dbkey;
                            //Does self have a dbkey assigned? If not, inform the
                            //user they must associated the history entry with a
                            //reference genome.
                            if (self.dbkey === "?") {
                                //TODO: modal, message banner or something else besides alert??
                                alert('The mz.sqlite database must be associated with a reference genome');
                            } else {
                                IGVManager.buildModule(options);
                            }
                            PSMProteinViewer.igvModule = true;
                        }
                    })
                    .append('svg:title')
                    .text(function (d) {
                        var s = 'Go to ' + d['chrom'] + ':' + d['start'].toLocaleString() +
                            '-' + d['end'].toLocaleString() + ' on an open IGV browser.';
                        return s;
                    });


                self.genomeGroup.selectAll('text')
                    .data(self.genomeList)
                    .enter().append('text')
                    .text(function (d) {
                        return 'Chr: ' + d['chrom'];
                    })
                    .attr('x', function (d) {
                            return ((d['cds_start'] / 3) * self.prtSz) + 3;
                        }
                    )
                    .attr('y', 18)
                    .attr('font-size', '16')
                    .attr('transform', 'translate(0,10)');
            } else {
                //Add a 'dummy' genome line to indicate the lack of genomic coordinates.
                self.genomeSVG.selectAll('line')
                    .data([1])
                    .enter().append('line')
                    .attr('x1', 0)
                    .attr('x2', function () {
                        return $('div#genome').width();
                    })
                    .attr('class', 'genome_dummy')
                    .attr('y1', 0)
                    .attr('y2', 0);

                self.genomeSVG.append('text')
                    .text('No Genomic Coordinates Available')
                    .attr('x', 10)
                    .attr('y', 15)
                    .attr('font-size', "18");

            }

            //Draw variant<->reference comparison ======================================================================
            self.variantGroup = self.genomeGroup.append('g').attr('transform', 'translate(0,30)');
            // Alignments
            // aligns: [[40, 50], [50, 55]]
            viewObject.variantInformation.aligns.forEach(function (a) {
                self.variantGroup.append('g').attr('transform', 'translate(0,10)').append('rect')
                    .attr('x', a[0] * self.prtSz)
                    .attr('y', 0)
                    .attr('width', ((a[1] - a[0]) * self.prtSz))
                    .attr('height', 3)
                    .attr('fill', '#9c3e0d')
                    .attr('class', 'align_match')
                    .append('svg:title')
                    .text('Aligned with reference sequence.');
            });

            // Deletions
            // Object loc:20 missing:"ELV"
            viewObject.variantInformation.deletions.forEach(function (v) {
                self.variantGroup.append('polygon')
                    .attr('points', function () {
                        var idx = v.loc;
                        var a = [idx * self.prtSz, self.prtSz];
                        var b = [a[0] + (self.prtSz / 2), 0];
                        var c = [a[0] - (self.prtSz / 2), 0];
                        return (a.toString() + ' ' + b.toString() + ' ' + c.toString());
                    })
                    .attr('fill', '#9c3e0d')
                    .append('svg:title')
                    .text('Deletion of ' + v.missing + ' from reference seqeunce.');
            });

            // Additions
            // additions: [{loc: 30, added: 'ELV'}]
            viewObject.variantInformation.additions.forEach(function (v) {
                var offset = v.loc;
                var addLen = v.added.length;
                self.variantGroup.append('polygon')
                    .attr('points', function () {
                        var a = [offset * self.prtSz, self.prtSz];
                        var b = [(offset + addLen) * self.prtSz, self.prtSz];
                        var c = [(a[0] + b[0]) / 2, 0];
                        return (a.toString() + ' ' + b.toString() + ' ' + c.toString());
                    })
                    .attr('fill', '#9c3e0d')
                    .append('svg:title')
                    .text('Addition to reference sequence.');
            });
            //==========================================================================================================

            //Draw the protein sequence rects
            self.focusGroup.selectAll('rect')
                .data(self.proteinObj.sequence)
                .enter().append('rect')
                .attr('class', function (d, i) {
                    var rClass = 'amino_acid';
                    var vObj = viewObject;
                    //substituitions: [{loc: 5, ref:'X'},{loc: 10, ref:'X'}],
                    vObj.variantInformation.substitutions.forEach(function (sub) {
                        if (sub.loc === i) {
                            rClass = 'reference_mismatch';
                        }
                    });
                    return rClass;
                })
                .attr('x', function (d, i) {
                    return i * self.prtSz;
                })
                .attr('y', 0)
                .attr('rx', self.rXrY)
                .attr('ry', self.rXrY)
                .attr('width', self.prtSz)
                .attr('height', self.prtSz)
                .attr('opacity', self.rectOpacity);

            //Draw protein residue text
            self.focusGroup.selectAll('text.aa_residue')
                .data(self.proteinObj.sequence)
                .enter().append('text')
                .attr('class', 'aa_residue')
                .text(function (d) {
                    return d;
                })
                .attr('x', function (d, i) {
                    return (i * self.prtSz) + (self.prtSz / 2.0);
                })
                .attr('y', self.prtSz - self.txtYBuffer)
                .attr('text-anchor', 'middle');

            //Draw sequence offsets. I think it looks better than an axis.
            self.focusGroup.selectAll('text.offset')
                .data(self.proteinObj.sequence)
                .enter().append('text')
                .attr('class', 'offset')
                .text(function (d, i) {
                    if (i % self.offsetModal === 0) {
                        return i;
                    }
                })
                .attr('x', function (d, i) {
                    return i * self.prtSz + (self.prtSz / 2.0);
                })
                .attr('y', 2 * (self.prtSz - self.txtYBuffer))
                .attr('text-anchor', 'middle');

            //Begin context rendering
            self.contextGroup = self.contextSVG.append('g')
                .attr('transform', 'translate(0,0)');

            //Draw the focus locator, want it as the bottom layer so has to draw first.
            self.contextGroup
                .append('line')
                .call(d3.drag().on('drag', function () {
                        var evtX = 0;
                        var numAA = 0;
                        var focusSVGW = parseInt(self.focusSVG.style('width'));
                        var focusW = self.ctxXScale(Math.floor(parseInt(self.focusSVG.style('width')) / self.prtSz));

                        //never let locator go beyond left margin
                        evtX = d3.event.x < 0 ? 0.0 : d3.event.x;
                        //never let evtX push locator beyond right margin
                        if ((focusSVGW - evtX) < focusW) {
                            evtX = focusSVGW - Math.ceil(focusW);
                        }

                        numAA = Math.ceil(evtX / self.ctxXScale(1));

                        d3.select(this)
                            .attr('x1', function () {
                                return self.ctxXScale(numAA);
                            })
                            .attr('x2', function () {
                                return self.ctxXScale(numAA) + self.ctxXScale(Math.floor(parseInt(self.focusSVG.style('width')) / self.prtSz));
                            });

                        self.prtSeqXPos = -1 * (Math.floor(numAA * self.prtSz));
                        self.focusGroup.attr('transform', 'translate(' + self.prtSeqXPos + ',5)');
                        if (self.genomeGroup) {
                            self.genomeGroup.attr('transform', 'translate(' + self.prtSeqXPos + ',0)');
                        }
                    })
                        .on('end', function () {
                            self.focusGroup.attr('transform', 'translate(' + self.prtSeqXPos + ',5)');
                        })
                )
                .attr('class', 'locator')
                .attr('x1', 0)
                .attr('y1', 10)
                .attr('x2', function () {
                    var vizAA = Math.floor(parseInt(self.focusSVG.style('width')) / self.prtSz);
                    return self.ctxXScale(vizAA);
                })
                .attr('y2', 10);

            //Draw the scaled protein sequence
            self.contextGroup.selectAll('rect.ctx')
                .data(self.proteinObj.sequence)
                .enter().append('rect')
                .attr('class', function () {
                    return "ctx";
                })
                .attr('x', function (d, i) {
                    return self.ctxXScale(i);
                })
                .attr('y', 0)
                .attr('width', function () {
                    return self.ctxXScale(1);
                })
                .attr('height', self.ctxPrtSz)
                .on('mouseover', function (d, i) {
                    var ctxWidth = $('div#context').width();
                    var xPxPos = d3.event.pageX;

                    self.ttDiv.html(d + "<br/> Offset: " + i);

                    if (xPxPos > (ctxWidth / 2.0)) {
                        xPxPos -= parseInt(self.ttDiv.style('width'));
                    }

                    self.ttDiv.style("left", (xPxPos) + "px")
                        .style("top", (d3.event.pageY - 50) + "px");

                    self.ttDiv.transition()
                        .duration(200)
                        .style("opacity", .9);

                })
                .on("mouseout", function () {
                    self.ttDiv.transition()
                        .duration(500)
                        .style("opacity", 0);
                });


            //Draw PSMs/Peptides onto focus and context svgs
            self.peptideList.map(function (obj, idx) {
                var baseY = self.calcExclusionZone(obj.sequence.length, obj.offset, self.prtSz);
                var tScore;
                var msmsCallback = self.msmsRender;

                if (obj.score) {
                    tScore = obj.score;
                } else {
                    tScore = 'No Score';
                }

                if (baseY > self.maxFocusY) {
                    self.maxFocusY = baseY;
                }

                self.focusGroup.selectAll("rect.peptide_" + idx)
                    .data(obj.sequence)
                    .enter().append("rect")
                    .attr("class", function (d, i) {
                        var c = obj.class + ' peptide_' + idx;
                        if (obj.mismatch.indexOf(i) > -1) {
                            c += ' mismatch';
                        }
                        return c;
                    })
                    .attr("x", function (d, i) {
                        i += obj.offset;
                        return i * self.prtSz
                    })
                    .attr("y", baseY)
                    .attr("width", self.prtSz)
                    .attr("height", self.prtSz)
                    .attr("opacity", .70);

                self.focusGroup.selectAll("text.peptide_" + idx)
                    .data(obj.sequence)
                    .enter().append("text")
                    .attr('class', 'txt_pep peptide_' + idx)
                    .attr('feature_type', obj.class)
                    .attr('score_val', tScore)
                    .text(function (d) {
                        return d;
                    })
                    .attr("x", function (d, i) {
                        i += obj.offset;
                        return i * self.prtSz + (self.prtSz / 2);
                    })
                    .attr("y", baseY + (self.prtSz - self.txtYBuffer))
                    .attr("text-anchor", "middle")
                    .attr('spectrum_identID', obj.spectrum_identID)
                    .on('click', function () {
                        msmsCallback(d3.select(this).attr('spectrum_identID'));
                    })
                    .on('mouseover', function () {
                        var classes = d3.select(this).attr('class');
                        var xPxPos = d3.event.pageX;

                        var scoreTop = $('#focus').position().top;
                        var focusWidth = $('#focus').width();


                        var ttText = d3.select(this).attr('feature_type').toLowerCase() === 'psm' ? 'Target PSM' : 'PSM';
                        var stHTML = '<em>' + ttText + '</em><br>' +
                            d3.select(this).attr('score_val');

                        //Add modifications to tooltip
                        self.modifications.forEach(function (aMod) {
                            if (classes.indexOf(aMod.toLowerCase()) >= 0) {
                                stHTML += '<br><p><strong>Modification:</strong>' + aMod + '</p>';
                            }
                        });

                        self.ttDiv.html(stHTML);

                        self.ttDiv
                            .style("left", function () {
                                if (xPxPos <= focusWidth / 2) {
                                    return (focusWidth / 2) + 'px';
                                } else {
                                    return (focusWidth / 4) + 'px';
                                }
                            })
                            .style("top", scoreTop + "px");

                        self.ttDiv.transition()
                            .duration(200)
                            .style("opacity", .9);

                    })
                    .on("mouseout", function () {
                        self.ttDiv.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                //Rects into the context svg
                baseY = baseY / 4.0;
                self.contextGroup.selectAll('rect.ctx_psm_' + idx)
                    .data(obj.sequence)
                    .enter()
                    .append('rect')
                    .attr('class', function (d, i) {
                        var c = 'ctx_' + obj.class + ' ctx_psm_' + idx;

                        if (obj.mismatch.indexOf(i) > -1) {
                            c += ' mismatch';
                        }

                        return c;
                    })
                    .attr('x', function (d, i) {
                        i += obj.offset;
                        return self.ctxXScale(i);
                    })
                    .attr('y', baseY)
                    .attr('width', self.ctxXScale(1))
                    .attr('height', self.ctxPrtSz);

                self.styleMods(obj, idx);
            });

            //Focus height needs to be set now that everything is drawn
            self.focusSVG.attr('height', self.maxFocusY + 50);
            self.contextSVG.attr('height', (self.maxFocusY / 4) + 50); //TODO: ratio of the two rect sizes.
        }

    }

    return PSMProteinViewer;
})();
/* eslint-disable-line no-use-before-define, no-unused-vars */