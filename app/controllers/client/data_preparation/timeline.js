var winston = require('winston');
var moment = require('moment');
var Batch = require('batch');
var _ = require('lodash');
//
var importedDataPreparation = require('../../../lib/datasources/imported_data_preparation');
var datatypes = require('../../../lib/datasources/datatypes');
var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var config = require('../config');
var func = require('../func');
//
module.exports.BindData = function (req, urlQuery, callback) {
    var self = this;
    // urlQuery keys:
    // source_key
    // groupBy
    // searchQ
    // searchCol
    // embed
    // Other filters

    var source_pKey = urlQuery.source_key;

    importedDataPreparation.DataSourceDescriptionWithPKey(source_pKey)
        .then(function (dataSourceDescription) {

            if (dataSourceDescription == null || typeof dataSourceDescription === 'undefined') {
                callback(new Error("No data source with that source pkey " + source_pKey), null);

                return;
            }

            if (typeof dataSourceDescription.fe_views !== 'undefined' && dataSourceDescription.fe_views.timeline != null && dataSourceDescription.fe_views.timeline === false) {
                callback(new Error('View doesn\'t exist for dataset. UID? urlQuery: ' + JSON.stringify(urlQuery, null, '\t')), null);

                return;
            }

            var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(source_pKey);
            var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            //
            var page = urlQuery.page;
            var pageNumber = page ? page : 1;
            var skipNResults = config.timelineGroups * (Math.max(pageNumber, 1) - 1);
            var limitToNResults = config.timelineGroups;
            //
            var groupBy = urlQuery.groupBy; // the human readable col name - real col name derived below

            /* group by would just be decade, years, month,day */
            var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            // var defaultGroupByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName] ||
            // dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            var groupBy_realColumnName = groupBy? groupBy : dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;

            // importedDataPreparation.RealColumnNameFromHumanReadableColumnName(groupBy,dataSourceDescription) :
            // dataSourceDescription.fe_views.views.timeline.defaultGroupByColumnName;


            var groupedResultsLimit = config.timelineGroupSize;
            var groupsLimit = config.timelineGroups;
            var groupByDateFormat;
            //
            var sortBy = urlQuery.sortBy; // the human readable col name - real col name derived below
            var sortDir = urlQuery.sortDir;
            var sortDirection = sortDir ? sortDir == 'Ascending' ? 1 : -1 : 1;
            var defaultSortByColumnName_humanReadable = dataSourceDescription.fe_displayTitleOverrides[dataSourceDescription.fe_views.views.timeline.defaultSortByColumnName] || dataSourceDescription.fe_views.views.timeline.defaultSortByColumnName;


            var sortBy_realColumnName = sortBy? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(sortBy,dataSourceDescription) : 
            dataSourceDescription.fe_views.views.timeline.defaultSortByColumnName
    



            var hasThumbs = dataSourceDescription.fe_designatedFields.medThumbImageURL ? true : false;
            var routePath_base = "/array/" + source_pKey + "/timeline";
            var sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;
            if (urlQuery.embed == 'true') routePath_base += '?embed=true';
            //
            var truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = func.new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription);
            //
            var filterObj = func.filterObjFromQueryParams(urlQuery);
            var isFilterActive = Object.keys(filterObj).length != 0;
            //
            var searchCol = urlQuery.searchCol;
            var searchQ = urlQuery.searchQ;
            var isSearchActive = typeof searchCol !== 'undefined' && searchCol != null && searchCol != "" // Not only a column
                && typeof searchQ !== 'undefined' && searchQ != null && searchQ != "";  // but a search query
            //
            //
            var wholeFilteredSet_aggregationOperators = [];

            if (isSearchActive) {
                var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                if (typeof _orErrDesc.err !== 'undefined') {
                    callback(_orErrDesc.err, null);

                    return;
                }
                wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
            }
            if (isFilterActive) {
                var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                if (typeof _orErrDesc.err !== 'undefined') {
                    callback(_orErrDesc.err, null);

                    return;
                }
                wholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat(_orErrDesc.matchOps);
            }

            var groupBySortFieldPath = "results.rowParams." + sortBy_realColumnName
            var groupByColumnName = groupBy ? groupBy : defaultGroupByColumnName_humanReadable;
            var groupByDuration;

            switch (groupByColumnName) {
                case 'Decade':
                    groupByDuration = moment.duration(10, 'years').asMilliseconds();
                    groupByDateFormat = "YYYY";
                    break;

                case 'Year':
                    groupByDuration = moment.duration(1, 'years').asMilliseconds();
                    groupByDateFormat = "YYYY";
                    break;

                case 'Month':
                    groupByDuration = moment.duration(1, 'months').asMilliseconds();
                    groupByDateFormat = "MMMM YYYY";
                    break;

                case 'Day':
                    groupByDuration = moment.duration(1, 'days').asMilliseconds();
                    groupByDateFormat = "MMMM Do YYYY";
                    break;

                default:
                    groupByDuration = moment.duration(1, 'years').asMilliseconds();
                    groupByDateFormat = "YYYY";
            }

            var sourceDoc, sampleDoc, uniqueFieldValuesByFieldName, nonpagedCount = 0, groupedResults = [];

            var batch = new Batch();
            batch.concurrency(1);

            // Obtain source document
            batch.push(function (done) {
                raw_source_documents.Model.findOne({primaryKey: source_pKey}, function (err, _sourceDoc) {
                    if (err) return done(err);

                    sourceDoc = _sourceDoc;
                    done();
                });
            });

            // Obtain sample document
            batch.push(function (done) {
                processedRowObjects_mongooseModel.findOne({}, function (err, _sampleDoc) {
                    if (err) return done(err);

                    sampleDoc = _sampleDoc;
                    done();
                });
            });

            // Obtain Top Unique Field Values For Filtering
            batch.push(function (done) {
                func.topUniqueFieldValuesForFiltering(source_pKey, dataSourceDescription, function (err, _uniqueFieldValuesByFieldName) {
                    if (err) return done(err);

                    uniqueFieldValuesByFieldName = _uniqueFieldValuesByFieldName;
                    done();
                });
            });

            // Count whole set
            batch.push(function (done) {
                var countWholeFilteredSet_aggregationOperators = wholeFilteredSet_aggregationOperators.concat([
                    { // Count
                        $group: {
                            // _id: 1,
                            _id: {
                                "$subtract": [
                                    {"$subtract": ["$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01")]},
                                    {
                                        "$mod": [
                                            {"$subtract": ["$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01")]},
                                            groupByDuration
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ]);

                var doneFn = function (err, results) {
                    if (err) return done(err);
                    if (results == undefined || results == null) { // 0
                    } else {
                        nonpagedCount = results.length;
                    }



                    done();
                };
                processedRowObjects_mongooseModel.aggregate(countWholeFilteredSet_aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
            });

            // Obtain Grouped results
            batch.push(function (done) {
                var aggregationOperators = [];
                if (isSearchActive) {
                    var _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, searchCol, searchQ);
                    if (_orErrDesc.err) return done(_orErrDesc.err);

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }
                if (isFilterActive) { // rules out undefined filterCol
                    var _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, filterObj);
                    if (_orErrDesc.err) return done(_orErrDesc.err, null);

                    aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
                }

                var sort = {};
                sort[groupBySortFieldPath] = -1;

                var projects = {
                    $project: {
                        _id: 1,
                        pKey: 1,
                        srcDocPKey: 1,
                        rowIdxInDoc: 1
                    }
                };

                // Exclude the nested pages fields to reduce the amount of data returned
                var rowParamsfields = Object.keys(sampleDoc.rowParams);
                rowParamsfields.forEach(function (rowParamsField) {
                    if (rowParamsField == sortBy_realColumnName || dataSourceDescription.fe_nestedObject == null || rowParamsField.indexOf(dataSourceDescription.fe_nestedObject.prefix) == -1) {
                        projects['$project']['rowParams.' + rowParamsField] = 1;
                    }
                });



                aggregationOperators = aggregationOperators.concat(
                    [
                        projects,
                        {$unwind: "$" + "rowParams." + sortBy_realColumnName}, // requires MongoDB 3.2, otherwise throws an error if non-array
                        { // unique/grouping and summing stage
                            $group: {
                                _id: {
                                    "$subtract": [
                                        {"$subtract": ["$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01")]},
                                        {
                                            "$mod": [
                                                {"$subtract": ["$" + "rowParams." + sortBy_realColumnName, new Date("1970-01-01")]},
                                                groupByDuration
                                            ]
                                        }
                                    ]
                                },
                                startDate: {$min: "$" + "rowParams." + sortBy_realColumnName},
                                endDate: {$max: "$" + "rowParams." + sortBy_realColumnName},
                                total: {$sum: 1}, // the count
                                results: {$push: "$$ROOT"}
                            }
                        },
                        { // reformat
                            $project: {
                                _id: 0,
                                startDate: 1,
                                endDate: 1,
                                total: 1,
                                results: {$slice: ["$results", groupedResultsLimit]}
                            }
                        },
                        {
                            $sort: sort
                        },
                        // Pagination
                        {$skip: skipNResults},
                        {$limit: groupsLimit}
                    ]);


                var doneFn = function (err, _groupedResults) {
                    if (err) return done(err);
              
                   

                  



                    if (_groupedResults == undefined || _groupedResults == null) _groupedResults = [];

               

                    _groupedResults.forEach(function (el, i, arr) {
                        var results = [];
                        el.results.forEach(function (el2, i2) {
                            var displayableVal = func.ValueToExcludeByOriginalKey(
                                el2.rowParams[sortBy_realColumnName], dataSourceDescription, sortBy_realColumnName, 'timeline');

                            el2.rowParams[sortBy_realColumnName] = displayableVal;
                            results.push(el2);
                        });
                        el.results = results;
                        groupedResults.push(el);
                    });

                    done();
                };

                processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
            });

            var galleryItem_htmlWhenMissingImage;

            if (dataSourceDescription.fe_views.views.gallery.galleryItemConditionsForIconWhenMissingImage) {
                var cond = dataSourceDescription.fe_views.views.gallery.galleryItemConditionsForIconWhenMissingImage;

                var checkConditionAndApplyClasses = function (conditions, value, opr) {
                    for (var i = 0; i < conditions.length; i++) {
                        if (conditions[i].operator == "in" && Array.isArray(conditions[i].value)) {

                            if (conditions[i].value.indexOf(value) > 0) {

                                var string = conditions[i].applyClasses.toString();

                                var classes = string.replace(",", " ");


                                return '<span class="' + classes + '"></span>';
                            }
                        }
                        if (conditions[i].operator == "equal") {


                            if (opr !== null) {

                                if (opr == "trim") {
                                    value = value.trim();
                                }
                            }

                            if (conditions[i].value == value) {

                                var string = conditions[i].applyClasses.toString();


                                var classes = string.replace(",", " ");

                                return '<span class="' + classes + '"></span>';
                            }
                        }
                    }
                }

                var galleryItem_htmlWhenMissingImage = function (rowObject) {
                    var fieldName = cond.field;
                    var conditions = cond.conditions;
                    var htmlElem = "";
                    var fieldValue = rowObject["rowParams"][fieldName];
                    if (Array.isArray(fieldValue) == true) {
                        var opr = null

                        if (cond.operationForEachValue) opr = cond.operationForEachValue

                        for (var i = 0; i < fieldValue.length; i++) {
                            htmlElem += checkConditionAndApplyClasses(conditions, fieldValue[i], opr);
                        }

                    } else if (typeof fieldValue == "string") {
                        htmlElem = checkConditionAndApplyClasses(conditions, fieldValue)

                    }
                    return htmlElem;
                }
            }


            batch.end(function (err) {
                if (err) return callback(err);

                //
                var data =
                {
                    env: process.env,

                    user: req.user,

                    arrayTitle: dataSourceDescription.title,
                    array_source_key: source_pKey,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    sourceDoc: sourceDoc,
                    sourceDocURL: sourceDocURL,
                    view_visibility: dataSourceDescription.fe_views.views ? dataSourceDescription.fe_views.views : {},
                    view_description: dataSourceDescription.fe_views.views.timeline.description ? dataSourceDescription.fe_views.views.timeline.description : "",
                    //
                    pageSize: config.timelineGroups < nonpagedCount ? config.pageSize : nonpagedCount,
                    onPageNum: pageNumber,
                    numPages: Math.ceil(nonpagedCount / config.timelineGroups),
                    nonpagedCount: nonpagedCount,
                    //
                    fieldKey_objectTitle: dataSourceDescription.fe_designatedFields.objectTitle,
                    humanReadableColumnName_objectTitle: importedDataPreparation.HumanReadableColumnName_objectTitle,
                    //
                    hasThumbs: hasThumbs,
                    fieldKey_medThumbImageURL: hasThumbs ? dataSourceDescription.fe_designatedFields.medThumbImageURL : undefined,
                    //
                    groupedResults: groupedResults,
                    groupBy: groupBy,
                    groupBy_realColumnName: groupBy_realColumnName,
                    groupedResultsLimit: groupedResultsLimit,
                    groupByDateFormat: groupByDateFormat,
                    displayTitleOverrides: dataSourceDescription.fe_displayTitleOverrides,
                    //
                    sortBy: sortBy,
                    sortDir: sortDir,
                    defaultSortByColumnName_humanReadable: defaultSortByColumnName_humanReadable,
                    sortBy_realColumnName: sortBy_realColumnName,
                    colNames_orderedForTimelineSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForDropdown(sampleDoc, dataSourceDescription, 'timeline', 'SortBy','ToDate'),
                    colNames_orderedForSortByDropdown: importedDataPreparation.HumanReadableFEVisibleColumnNamesWithSampleRowObject_orderedForSortByDropdown(sampleDoc, dataSourceDescription),
                    //
                    filterObj: filterObj,
                    isFilterActive: isFilterActive,
                    uniqueFieldValuesByFieldName: uniqueFieldValuesByFieldName,
                    truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill: truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill,
                    //
                    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: galleryItem_htmlWhenMissingImage,
                    //
                    searchQ: searchQ,
                    searchCol: searchCol,
                    isSearchActive: isSearchActive,
                    //
                    defaultGroupByColumnName_humanReadable: defaultGroupByColumnName_humanReadable,
                    colNames_orderedForGroupByDropdown: dataSourceDescription.fe_views.views.timeline.durationsAvailableForGroupBy ? dataSourceDescription.fe_views.views.timeline.durationsAvailableForGroupBy : {},
                    //
                    routePath_base: routePath_base,
                    // multiselectable filter fields
                    multiselectableFilterFields: dataSourceDescription.fe_filters.fieldsMultiSelectable,

                    tooltipDateFormat: dataSourceDescription.fe_views.views.timeline.tooltipDateFormat || null
                };


                callback(err, data);


            });
        })

};