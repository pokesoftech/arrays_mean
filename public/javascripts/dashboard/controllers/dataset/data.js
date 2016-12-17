angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', '$state', '$q', 'DatasetService', 'AuthService', '$mdToast', '$mdDialog', '$filter', 'dataset', 'additionalDatasources', 'availableTypeCoercions', 'availableDesignatedFields',
        function ($scope, $state, $q, DatasetService, AuthService, $mdToast, $mdDialog, $filter, dataset, additionalDatasources, availableTypeCoercions, availableDesignatedFields) {
            $scope.$parent.$parent.currentNavItem = 'Data';
            $scope.availableTypeCoercions = availableTypeCoercions;

            // Assert some of the fields should be available
            if (!dataset.raw_rowObjects_coercionScheme) dataset.raw_rowObjects_coercionScheme = {};
            if (!dataset.fe_excludeFields) dataset.fe_excludeFields = {};
            if (!dataset.fe_displayTitleOverrides) dataset.fe_displayTitleOverrides = {};
            if (!dataset.fe_designatedFields) dataset.fe_designatedFields = {};

            $scope.$parent.$parent.dataset = angular.copy(dataset);
            $scope.additionalDatasources = angular.copy(additionalDatasources);

            $scope.data = {};

            $scope.$parent.$parent.currentNavItem = 'Data';

            $scope.availableTypeCoercions = availableTypeCoercions;

            $scope.toggleExclude = function (exclude) {
                for (var i = 0; i < $scope.dataset.columns.length; i++) {
                    $scope.dataset.fe_excludeFields[$scope.dataset.columns[i].name] = exclude;
                }
            };

            $scope.openFieldDialog = function (evt, fieldName, firstRecord, custom, customFieldIndex) {

                $mdDialog.show({
                    controller: FieldDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.field.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        fieldName: fieldName,
                        firstRecord: firstRecord,
                        dataset: $scope.$parent.$parent.dataset,
                        availableTypeCoercions: availableTypeCoercions,
                        availableDesignatedFields: availableDesignatedFields,
                        custom: custom,
                        customFieldIndex: customFieldIndex
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.data.fe_designatedFields = savedDataset.fe_designatedFields;
                        $scope.coercionScheme = angular.copy(savedDataset.raw_rowObjects_coercionScheme);
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();

                        
                    }, function () {
                        console.log('You cancelled the field dialog.');
                    });
            };

            function FieldDialogController($scope, $mdDialog, $filter, fieldName, firstRecord, dataset, availableTypeCoercions, availableDesignatedFields, custom, customFieldIndex) {

                $scope.firstRecord = firstRecord;
                $scope.availableTypeCoercions = availableTypeCoercions;
                $scope.availableDesignatedFields = availableDesignatedFields;
                $scope.custom = custom;
                $scope.customFieldIndex = customFieldIndex;

                function refreshFieldByName(name) {
                    // General
                    if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    for (var key in $scope.dataset.fe_designatedFields) {
                        if ($scope.dataset.fe_designatedFields[key] == name) {
                            $scope.data.designatedField = key;
                            break;
                        }
                    }

                    if (!$scope.dataset.fe_fieldDisplayOrder) $scope.dataset.fe_fieldDisplayOrder = [];
                    var index = $scope.dataset.fe_fieldDisplayOrder.indexOf(name);
                    if (index != -1) $scope.data.displayOrder = index;

                    // Filter
                    if (!$scope.dataset.fe_filters.fieldsNotAvailable) $scope.dataset.fe_filters.fieldsNotAvailable = [];
                    $scope.data.filterNotAvailable = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf(name) != -1;

                    if (!$scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual = [];
                    $scope.data.commaSeparatedAsIndividual = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf(name) != -1;

                    if (!$scope.dataset.fe_filters.fieldsMultiSelectable) $scope.dataset.fe_filters.fieldsMultiSelectable = [];
                    $scope.data.multipleSelection = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf(name) != -1;

                    if (!$scope.dataset.fe_filters.fieldsSortableByInteger) $scope.dataset.fe_filters.fieldsSortableByInteger = [];
                    $scope.data.sortableByInt = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf(name) != -1;

                    if (!$scope.dataset.fe_filters.fieldsSortableInReverseOrder) $scope.dataset.fe_filters.fieldsSortableInReverseOrder = [];
                    $scope.data.sortableInReverse = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf(name) != -1;

                    if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName) $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName = {};

                    if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey) $scope.dataset.fe_filters.valuesToExcludeByOriginalKey = {};
                    if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey[name] && $scope.customFieldIndex == undefined)
                        $scope.dataset.fe_filters.valuesToExcludeByOriginalKey[name] = [];
                    if (!$scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all)
                        $scope.dataset.fe_filters.valuesToExcludeByOriginalKey._all = [];

                    if (!$scope.dataset.fe_filters.keywords) $scope.dataset.fe_filters.keywords = [];
                    $scope.data.keywords = $scope.dataset.fe_filters.keywords.find(function (elem) {
                        return elem.title == name;
                    });
                    if (!$scope.data.keywords) $scope.data.keywords = {title: name, choices: []};
                }

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.fieldName = fieldName;

                    if ($scope.customFieldIndex != undefined) {
                        if (!dataset.customFieldsToProcess)
                            $scope.dataset.customFieldsToProcess = [];
                        $scope.customField = $scope.dataset.customFieldsToProcess[customFieldIndex];
                        if (!$scope.customField) {
                            $scope.customField = {
                                fieldName: '',
                                fieldType: 'array',
                                fieldsToMergeIntoArray: [],
                                delimiterOnFields: []
                            };
                        }
                        if (!$scope.customField.delimiterOnFields) $scope.customField.delimiterOnFields = [];

                        $scope.fieldName = $scope.customField.fieldName;
                    }

                    $scope.data = {};

                    refreshFieldByName($scope.fieldName);

                    // Data Type Coercion
                    $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);

                    if ($scope.dialog.fieldForm) $scope.dialog.fieldForm.$setPristine();
                };

                $scope.reset();

                $scope.removeOneToOneOverride = function (valueByOverride) {
                    var index = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].indexOf(valueByOverride);
                    if (index != -1) {
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].splice(index, 1);
                        $scope.dialog.fieldForm.$setDirty();
                    }
                };

                $scope.addOneToOneOverride = function () {
                    if (!$scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName])
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName] = [];
                    var emptyElem = $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].find(function (elem) {
                        return elem.value == '';
                    });
                    if (!emptyElem) {
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].push({
                            override: '',
                            value: ''
                        });
                        $scope.dialog.fieldForm.$setDirty();
                    }
                };

                $scope.verifyUniqueValueOverride = function (valueOverride, index) {
                    var valueOverrideUnique = true, valueOverrideTitleUnique = true;
                    $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[fieldName].forEach(function (elem) {
                        if (valueOverride == elem) return;

                        if (valueOverride.value == elem.value) valueOverrideUnique = false;
                        if (valueOverride.override == elem.override) valueOverrideTitleUnique = false;
                    });

                    $scope.dialog.fieldForm['overrideValue_' + index].$setValidity('unique', valueOverrideUnique);
                    $scope.dialog.fieldForm['overrideValueTitle_' + index].$setValidity('unique', valueOverrideTitleUnique);
                };

                $scope.changeCoercionSchemeByOperation = function (colName) {
                    var coercion = $scope.coercionScheme[colName];
                    if ($filter('typeCoercionToString')(coercion) != 'Date') {
                        $scope.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                    } else {
                        if (!$scope.dataset.raw_rowObjects_coercionScheme[colName]) {
                            $scope.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                        } else {
                            $scope.dataset.raw_rowObjects_coercionScheme[colName].operation = coercion.operation;
                        }
                    }
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.delete = function () {
                    $scope.reset();
                    if (customFieldIndex < $scope.dataset.customFieldsToProcess.length) {
                        $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1);
                    }

                    $mdDialog.hide($scope.dataset);
                };

                $scope.verifyUniqueFieldName = function(name) {
                    refreshFieldByName(name);

                    $scope.customField.fieldName = name;

                    var unique = ($scope.dataset.columns.find(function(column) {
                        return name == column.name;
                    }) == undefined);

                    if (unique && $scope.dataset.customFieldsToProcess) {
                        unique = ($scope.dataset.customFieldsToProcess.find(function(customField, index) {
                            if (index == customFieldIndex) return false;
                            return name == customField.fieldName;
                        }) == undefined);
                    }

                    $scope.dialog.fieldForm.fieldName.$setValidity('unique', unique);
                };

                $scope.save = function () {
                    // General


                    if ($scope.data.designatedField != undefined)
                        $scope.dataset.fe_designatedFields[$scope.data.designatedField] = $scope.fieldName;
                    else {

                        for (var key in $scope.dataset.fe_designatedFields) {
                            if ($scope.dataset.fe_designatedFields[key] == $scope.fieldName) {
                                delete $scope.dataset[key];
                                break;
                            }
                        }
                    }

                    var index = $scope.dataset.fe_fieldDisplayOrder.indexOf($scope.fieldName);
                    if (index != -1) $scope.dataset.fe_fieldDisplayOrder.splice(index, 1);
                    if ($scope.data.displayOrder != undefined) {
                        $scope.dataset.fe_fieldDisplayOrder.splice($scope.data.displayOrder, 0, $scope.fieldName);
                    }

                    // Filter
                    index = $scope.dataset.fe_filters.fieldsNotAvailable.indexOf($scope.fieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsNotAvailable.splice(index, 1);
                    if ($scope.data.filterNotAvailable) {
                        $scope.dataset.fe_filters.fieldsNotAvailable.push($scope.fieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.indexOf($scope.fieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.splice(index, 1);
                    if ($scope.data.commaSeparatedAsIndividual) {
                        $scope.dataset.fe_filters.fieldsCommaSeparatedAsIndividual.push($scope.fieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsMultiSelectable.indexOf($scope.fieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsMultiSelectable.splice(index, 1);
                    if ($scope.data.multipleSelection) {
                        $scope.dataset.fe_filters.fieldsMultiSelectable.push($scope.fieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsSortableByInteger.indexOf($scope.fieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsSortableByInteger.splice(index, 1);
                    if ($scope.data.sortableByInt) {
                        $scope.dataset.fe_filters.fieldsSortableByInteger.push($scope.fieldName);
                    }

                    index = $scope.dataset.fe_filters.fieldsSortableInReverseOrder.indexOf($scope.fieldName);
                    if (index != -1) $scope.dataset.fe_filters.fieldsSortableInReverseOrder.splice(index, 1);
                    if ($scope.data.sortableInReverse) {
                        $scope.dataset.fe_filters.fieldsSortableInReverseOrder.push($scope.fieldName);
                    }

                    if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName]) {
                        $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName] =
                            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName].filter(function (elem) {
                                return elem.value != '' || elem.override != '';
                            });
                        if ($scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName].length == 0)
                            delete $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[$scope.fieldName];
                    }

                    $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.filter(function (elem) {
                        return elem.title != $scope.fieldName;
                    });
                    if ($scope.data.keywords.choices.length > 0) $scope.dataset.fe_filters.keywords = $scope.dataset.fe_filters.keywords.concat($scope.data.keywords);

                    if ($scope.customFieldIndex != undefined) {
                        $scope.dataset.customFieldsToProcess.splice(customFieldIndex, 1, $scope.customField);
                    }

                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.openNestedDialog = function (evt) {
                $mdDialog.show({
                    controller: NestedDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.nested.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset,
                        additionalDatasources: $scope.additionalDatasources
                    }
                })
                    .then(function (result) {
                        $scope.$parent.$parent.dataset = result.dataset;
                        $scope.additionalDatasources = result.additionalDatasources;

                        $scope.coercionScheme = angular.copy(result.dataset.raw_rowObjects_coercionScheme);
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the nested dialog.');
                    });
            };

            function NestedDialogController($scope, $mdDialog, $filter, dataset, additionalDatasources) {
                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.additionalDatasources = angular.copy(additionalDatasources);

                    // Master datasource
                    $scope.data = {};

                    if (!$scope.dataset.fe_nestedObject) $scope.dataset.fe_nestedObject = {};
                    if (!$scope.dataset.fe_nestedObject.criteria) {
                        $scope.dataset.fe_nestedObject.criteria = {
                            operatorName: 'equal',
                            value: ''
                        };
                    }

                    if (!$scope.dataset.fe_nestedObject.fields) $scope.dataset.fe_nestedObject.fields = [];
                    $scope.data.fields = $scope.dataset.fe_nestedObject.fields;

                    if (!$scope.dataset.fe_nestedObject.fieldOverrides) $scope.dataset.fe_nestedObject.fieldOverrides = {};
                    $scope.data.fieldOverrides = [];
                    // Convert Object into Array
                    Object.keys($scope.dataset.fe_nestedObject.fieldOverrides).map(function (colName) {
                        $scope.data.fieldOverrides.push({
                            field: colName,
                            override: $scope.dataset.fe_nestedObject.fieldOverrides[colName]
                        });
                    });

                    if (!$scope.dataset.fe_nestedObject.valueOverrides) $scope.dataset.fe_nestedObject.valueOverrides = {};
                    $scope.data.valueOverrides = [];

                    // Convert Object into Array
                    Object.keys($scope.dataset.fe_nestedObject.valueOverrides).map(function (colName) {
                        var orgValueOverrides = $scope.dataset.fe_nestedObject.valueOverrides[colName];
                        var valueOverrides = [];
                        Object.keys(orgValueOverrides).map(function (value) {
                            valueOverrides.push({value: value, override: orgValueOverrides[value]})
                        });
                        $scope.data.valueOverrides.push({field: colName, valueOverrides: valueOverrides});
                    });

                    // Additional Datasources
                    $scope.additionalData = [];
                    $scope.additionalDatasources.forEach(function(datasource, index) {
                        $scope.additionalData.push({});

                        if (!datasource.fe_nestedObject) $scope.dataset.fe_nestedObject = {};
                        if (!datasource.fe_nestedObject.criteria) {
                            datasource.fe_nestedObject.criteria = {
                                operatorName: 'equal',
                                value: ''
                            };
                        }

                        if (!datasource.fe_nestedObject.fields) datasource.fe_nestedObject.fields = [];
                        $scope.additionalData[index].fields = datasource.fe_nestedObject.fields;

                        if (!datasource.fe_nestedObject.fieldOverrides) datasource.fe_nestedObject.fieldOverrides = {};
                        $scope.additionalData[index].fieldOverrides = [];
                        // Convert Object into Array
                        Object.keys(datasource.fe_nestedObject.fieldOverrides).map(function (colName) {
                            $scope.additionalData[index].fieldOverrides.push({
                                field: colName,
                                override: datasource.fe_nestedObject.fieldOverrides[colName]
                            });
                        });

                        if (!datasource.fe_nestedObject.valueOverrides) datasource.fe_nestedObject.valueOverrides = {};
                        $scope.additionalData[index].valueOverrides = [];

                        // Convert Object into Array
                        Object.keys(datasource.fe_nestedObject.valueOverrides).map(function (colName) {
                            var orgValueOverrides = datasource.fe_nestedObject.valueOverrides[colName];
                            var valueOverrides = [];
                            Object.keys(orgValueOverrides).map(function (value) {
                                valueOverrides.push({value: value, override: orgValueOverrides[value]})
                            });
                            $scope.additionalData[index].valueOverrides.push({field: colName, valueOverrides: valueOverrides});
                        });
                    });

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.reset();

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.addValueOverride = function (additionalIndex) {
                    if (additionalIndex === undefined)
                        $scope.data.valueOverrides.push({field: '', valueOverrides: [{value: '', override: ''}]});
                    else
                        $scope.additionalData[additionalIndex].valueOverrides.push({field: '', valueOverrides: [{value: '', override: ''}]});
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeValueOverride = function (override, additionalIndex) {
                    if (additionalIndex === undefined) {
                        var index = $scope.data.valueOverrides.indexOf(override);
                        if (index != -1) $scope.data.valueOverrides.splice(index, 1);
                    } else {
                        index = $scope.additionalData[additionalIndex].valueOverrides.indexOf(override);
                        if (index != -1) $scope.additionalData[additionalIndex].valueOverrides.splice(index, 1);
                    }
                    $scope.dialog.form.$setDirty();
                };

                $scope.addFieldOverride = function (additionalIndex) {
                    if (additionalIndex === undefined)
                        $scope.data.fieldOverrides.push({field: '', override: ''});
                    else
                        $scope.additionalData[additionalIndex].fieldOverrides.push({field: '', override: ''});
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeFieldOverride = function (override, additionalIndex) {
                    if (additionalIndex === undefined) {
                        var index = $scope.data.fieldOverrides.indexOf(override);
                        if (index != -1) $scope.data.fieldOverrides.splice(index, 1);
                    } else {
                        index = $scope.additionalData[additionalIndex].fieldOverrides.indexOf(override);
                        if (index != -1) $scope.additionalData[additionalIndex].fieldOverrides.splice(index, 1);
                    }
                    $scope.dialog.form.$setDirty();
                };

                $scope.save = function () {
                    // Master Dataset
                    $scope.dataset.fe_nestedObject.fieldOverrides = {};
                    $scope.data.fieldOverrides.map(function (elem) {
                        $scope.dataset.fe_nestedObject.fieldOverrides[elem.field] = elem.override;
                    });

                    $scope.dataset.fe_nestedObject.valueOverrides = {};
                    $scope.dataset.fe_nestedObject.fields = $scope.data.fields;
                    $scope.data.valueOverrides.map(function (elem) {
                        var valueOverrides = {};
                        elem.valueOverrides.map(function (el) {
                            valueOverrides[el.value] = el.override;
                        });
                        $scope.dataset.fe_nestedObject.valueOverrides[elem.field] = valueOverrides;
                    });

                    // Additional Datasources
                    $scope.additionalDatasources.forEach(function(datasource, index) {
                        datasource.fe_nestedObject.fieldOverrides = {};
                        $scope.additionalData[index].fieldOverrides.map(function (elem) {
                            datasource.fe_nestedObject.fieldOverrides[elem.field] = elem.override;
                        });

                        datasource.fe_nestedObject.valueOverrides = {};
                        datasource.fe_nestedObject.fields = $scope.additionalData[index].fields;
                        $scope.additionalData[index].valueOverrides.map(function (elem) {
                            var valueOverrides = {};
                            elem.valueOverrides.map(function (el) {
                                valueOverrides[el.value] = el.override;
                            });
                            datasource.fe_nestedObject.valueOverrides[elem.field] = valueOverrides;
                        });
                    });

                    $mdDialog.hide({
                        dataset: $scope.dataset,
                        additionalDatasources: $scope.additionalDatasources
                    });
                }
            }

            $scope.openFabricatedFilterDialog = function (evt) {
                $mdDialog.show({
                    controller: FabricatedFilterDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.fabricated.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the fabricated filter dialog.');
                    });
            };

            function FabricatedFilterDialogController($scope, $mdDialog, $filter, dataset) {
                $scope.indexInFabricatedFilter = function (input) {
                    for (var i = 0; i < $scope.dataset.fe_filters.fabricated.length; i++) {
                        var currentFab = $scope.dataset.fe_filters.fabricated[i];
                        if (currentFab.title == input) {
                            return i;
                        }
                    }
                    return -1;
                };

                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.data = {};

                    $scope.dataset.fe_filters.fabricated.map(function (fabricated) {
                        fabricated.choices[0].match.field = fabricated.choices[0].match.field.replace('rowParams.', '');
                    });

                    $scope.data.defaultFilters = [];
                    for (var name in $scope.dataset.fe_filters.default) {
                        $scope.data.defaultFilters.push({name: name, value: $scope.dataset.fe_filters.default[name]});
                    }

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                }

                $scope.reset();

                $scope.verifyUniqueFabricated = function (fabricated, index) {
                    var fabricatedTitleUnique = true, fabricatedValueUnique = true;

                    $scope.dataset.fe_filters.fabricated.forEach(function (elem) {
                        if (fabricated == elem) return;

                        if (fabricated.title == elem.title)
                            fabricatedTitleUnique = false;
                        if (fabricated.choices[0].title == elem.choices[0].title)
                            fabricatedValueUnique = false;

                    });
                    $scope.dialog.form['fabricatedTitle_' + index].$setValidity('unique', fabricatedTitleUnique);
                    $scope.dialog.form['fabricatedValue_' + index].$setValidity('unique', fabricatedValueUnique);
                };

                $scope.addFabricated = function () {
                    var emptyFabricated = $scope.dataset.fe_filters.fabricated.find(function (elem) {
                        return elem.title == '' && elem.choices[0].match.field == 'rowParams.' + fieldName;
                    });
                    if (emptyFabricated) return;

                    $scope.dataset.fe_filters.fabricated.push({
                        title: "",
                        choices: [
                            {
                                title: "",
                                match: {
                                    field: "",
                                    exist: true,
                                    nin: []
                                }
                            }
                        ]
                    });
                    $scope.dialog.form.$setDirty();
                };

                $scope.removeFabricated = function (fabricated) {
                    var index = $scope.dataset.fe_filters.fabricated.indexOf(fabricated);
                    if (index != -1) {
                        $scope.dataset.fe_filters.fabricated.splice(index, 1);
                        $scope.dialog.form.$setDirty();
                    }
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.verifyUniqueDefaultFilter = function (defaultFilter, index) {
                    var defaultFilterUnique = true;

                    $scope.data.defaultFilters.forEach(function (elem) {
                        if (defaultFilter == elem) return;

                        if (defaultFilter.name == elem.name && elem.value == defaultFilter.value)
                            defaultFilterUnique = false;

                    });
                    $scope.dialog.form['defaultValue_' + index].$setValidity('unique', defaultFilterUnique);
                };

                $scope.removeDefaultFilter = function (index) {
                    $scope.data.defaultFilters.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addDefaultFilter = function () {
                    $scope.data.defaultFilters.push({name: '', value: ''});
                };

                $scope.save = function () {
                    $scope.dataset.fe_filters.fabricated.map(function (fabricated) {
                        fabricated.choices[0].match.field = 'rowParams.' + fabricated.choices[0].match.field;
                    });

                    $scope.data.defaultFilters.forEach(function (filter) {
                        if (!$scope.dataset.fe_filters.default) $scope.dataset.fe_filters.default = {};
                        $scope.dataset.fe_filters.default[filter.name] = filter.value;
                    });

                    $mdDialog.hide($scope.dataset);
                }
            }

            $scope.openImageScrapingDialog = function (evt) {
                $mdDialog.show({
                    controller: ImageScrapingDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.imagescraping.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset
                    }
                })
                    .then(function (savedDataset) {
                        $scope.$parent.$parent.dataset = savedDataset;
                        sortColumnsByDisplayOrder();
                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the image scraping dialog.');
                    });
            };

            function ImageScrapingDialogController($scope, $mdDialog, $filter, dataset) {
                $scope.reset = function () {
                    $scope.dataset = angular.copy(dataset);
                    $scope.data = {};

                    if (!$scope.dataset.imageScraping) $scope.dataset.imageScraping = [];
                    $scope.availableDesignatedFields = availableDesignatedFields;

                    if (!$scope.dataset.fe_designatedFields) $scope.dataset.fe_designatedFields = {};
                    $scope.data.designatedFields = {};
                    for (var key in $scope.dataset.fe_designatedFields) {
                        $scope.data.designatedFields[$scope.dataset.fe_designatedFields[key]] = key;
                    }

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.reset();

                $scope.addImageToScrap = function () {
                    $scope.dataset.imageScraping.push({
                        htmlSourceAtURLInField: '',
                        setFields: [
                            {
                                newFieldName: '',
                                prependToImageURLs: '',
                                resize: 600
                            }
                        ]
                    });
                };

                $scope.removeImageToScrap = function (index) {
                    $scope.dataset.imageScraping.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.addField = function (setFields) {
                    setFields.push({
                        newFieldName: '',
                        prependToImageURLs: '',
                        resize: 600
                    });
                };

                $scope.removeField = function (setFields, index) {
                    setFields.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.verifyUniqueHtmlSource = function (imageScraping, index) {
                    var unique = true;
                    $scope.dataset.imageScraping.forEach(function (_imageScraping) {
                        if (_imageScraping == imageScraping) return;

                        if (imageScraping.htmlSourceAtURLInField == _imageScraping.htmlSourceAtURLInField)
                            unique = false;
                    });

                    $scope.dialog.form['imageScrapingField_' + index].$setValidity('unique', unique);
                };

                $scope.verifyValidNewFieldName = function (fieldName, index) {
                    var unique = true, valid = true;
                    $scope.dataset.imageScraping.forEach(function (_imageScraping) {
                        var i = 0;
                        _imageScraping.setFields.forEach(function (field) {
                            if (field.newFieldName == fieldName && i != index) unique = false;
                            i++;
                        });
                    });

                    if ($filter('dotless')(fieldName) != fieldName) valid = false;

                    $scope.dialog.form['newField_' + index].$setValidity('unique', unique);
                    $scope.dialog.form['newField_' + index].$setValidity('valid', valid);
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {
                    for (var fieldName in $scope.data.designatedFields) {
                        $scope.dataset.fe_designatedFields[$scope.data.designatedFields[fieldName]] = fieldName;
                    }

                    $mdDialog.hide($scope.dataset);
                };
            }

            $scope.openJoinDialog = function(evt) {
                $mdDialog.show({
                    controller: JoinDialogController,
                    controllerAs: 'dialog',
                    templateUrl: 'templates/blocks/data.join.html',
                    parent: angular.element(document.body),
                    targetEvent: evt,
                    clickOutsideToClose: true,
                    fullscreen: true, // Only for -xs, -sm breakpoints.
                    locals: {
                        dataset: $scope.$parent.$parent.dataset,
                        fields: $scope.data.fields
                    }
                })
                    .then(function (savedDataset) {
                        console.log(savedDataset);
                        $scope.$parent.$parent.dataset = savedDataset;
                        sortColumnsByDisplayOrder();

                        $scope.vm.dataForm.$setDirty();
                    }, function () {
                        console.log('You cancelled the dataset join dialog.');
                    });
            };

            function JoinDialogController($scope, $mdDialog, DatasetService, AuthService, dataset, fields) {
                $scope.data = {};
                $scope.data.columns = [];
                $scope.dataset = angular.copy(dataset);
                if (!$scope.dataset.relationshipFields) $scope.dataset.relationshipFields = [];

                DatasetService.getAvailableMatchFns()
                    .then(function(availableMatchFns) {
                        $scope.availableMatchFns = availableMatchFns
                    })
                    .catch(function(error) {
                        console.error(error);
                    });

                var user = AuthService.currentUser();
                if (user.role == 'superAdmin' || user.role == 'admin') {
                    DatasetService.getDatasetsWithQuery({_team: user.defaultLoginTeam._id})
                        .then(initializeDatasets)
                        .catch(function(error) {
                            console.error(error);
                        });
                } else if (user.role == 'editor') {
                    DatasetService.getDatasetsWithQuery({_id: {$in: user._editors}, _team: user.defaultLoginTeam._id})
                        .then(initializeDatasets)
                        .catch(function(error) {
                            console.error(error);
                        });
                } else {
                    $scope.datasets = [];
                    $scope.data.foreignDataset = [];
                }

                function initializeDatasets(datasets) {
                    if (!datasets) return;
                    $scope.datasets = datasets.filter(function(source) { return source._id != dataset._id });

                    $scope.data.foreignDataset = $scope.dataset.relationshipFields.map(function(relationshipField) {
                        return $scope.datasets.find(function(source) {
                            return source.uid == relationshipField.by.ofOtherRawSrcUID && source.importRevision == relationshipField.by.andOtherRawSrcImportRevision;
                        });
                    });

                    $scope.dataset.relationshipFields.forEach(function(relationshipField, index) {
                        var pKey = relationshipField.by.ofOtherRawSrcUID + '-v' + relationshipField.by.andOtherRawSrcImportRevision;
                        DatasetService.getMappingDatasourceCols(pKey)
                            .then(function(columns) {
                                $scope.data.columns[index] = columns;
                            });
                    });
                }

                $scope.reset = function() {
                    $scope.dataset = angular.copy(dataset);
                    initializeDatasets();

                    if ($scope.dialog.form) $scope.dialog.form.$setPristine();
                };

                $scope.verifyValidFieldName = function(fieldName, index) {
                    var unique = true, valid = true;
                    var i = 0;
                    $scope.dataset.relationshipFields.forEach(function(relationshipField) {
                        if (fieldName == relationshipField.field && i != index) unique = false;
                        i ++;
                    });
                    if (unique) {
                        // fields.forEach(function (field) {
                        //     if (fieldName == field.name) {
                        //
                        //     }
                        // });
                    }

                    if ($filter('dotless')(fieldName) != fieldName) valid = false;

                    $scope.dialog.form['field_' + index].$setValidity('unique', unique);
                    $scope.dialog.form['field_' + index].$setValidity('valid', valid);
                };

                $scope.removeJoin = function(index) {
                    $scope.dataset.relationshipFields.splice(index, 1);
                    $scope.dialog.form.$setDirty();
                };

                $scope.loadColumnsForDataset = function(index) {
                    var source = $scope.data.foreignDataset[index];
                    var pKey = source.uid + '-v' + source.importRevision;

                    DatasetService.getMappingDatasourceCols(pKey)
                        .then(function(columns) {
                            $scope.data.columns[index] = columns;
                        });
                };

                $scope.addJoin = function() {
                    $scope.dataset.relationshipFields.push({
                        field: '',
                        singular: true,
                        relationship: false,
                        by: {
                            operation: "Join",
                            findingMatchOnFields: []
                        }
                    });
                    $scope.dialog.form.$setDirty();
                };

                $scope.cancel = function () {
                    $mdDialog.cancel();
                };

                $scope.save = function () {
                    $scope.data.foreignDataset.forEach(function(source, index) {
                        $scope.dataset.relationshipFields[index].by.ofOtherRawSrcUID = source.uid;
                        $scope.dataset.relationshipFields[index].by.andOtherRawSrcImportRevision = source.importRevision;
                    });
                    $mdDialog.hide($scope.dataset);
                };
            }

            function sortColumnsByDisplayOrder() {
                $scope.data.fields = $scope.$parent.$parent.dataset.columns.concat(
                    $scope.$parent.$parent.dataset.customFieldsToProcess.map(function(customField, index) {
                        return {
                            name: customField.fieldName,
                            sample: null,
                            custom: true,
                            customField: customField,
                            customFieldIndex: index
                        };
                    })
                ).concat(
                    $scope.$parent.$parent.dataset.fe_nestedObject.fields.map(function(field, index) {
                        return {
                            name: $scope.$parent.$parent.dataset.fe_nestedObject.prefix + field,
                            sample: null,
                            custom: true
                        };
                    })
                ).concat(
                    $scope.$parent.$parent.dataset.imageScraping.reduce(function(imageScraping1, imageScraping2) {
                        var setFields1 = imageScraping1.setFields || [],
                            setFields2 = imageScraping2.setFields || [];

                        return setFields1.map(function(field) {
                            return {
                                name: field.newFieldName,
                                sample: null,
                                custom: true
                            }
                        }).concat(setFields2.map(function(field) {
                            return {
                                name: field.newFieldName,
                                sample: null,
                                custom: true
                            }
                        }))
                    }, [])
                );

                $scope.data.fields.sort(function (column1, column2) {
                    if ($scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column1.name) == -1 &&
                        $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column2.name) != -1)
                        return 1;
                    else if ($scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column2.name) == -1 &&
                        $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column1.name) != -1)
                        return -1;
                    else
                        return $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column1.name) -
                            $scope.$parent.$parent.dataset.fe_fieldDisplayOrder.indexOf(column2.name);
                });
            }

            $scope.fieldSortableOptions = {
                stop: function (e, ui) {
                    $scope.$parent.$parent.dataset.fe_fieldDisplayOrder =
                        $scope.data.fields.map(function (field) {
                            return field.name;
                        });

                    $scope.vm.dataForm.$setDirty();
                }
            };

            $scope.saveRequiredFields = function() {

                $scope.$parent.$parent.dataset.fn_new_rowPrimaryKeyFromRowObject = $scope.data.fn_new_rowPrimaryKeyFromRowObject;
                $scope.$parent.$parent.dataset.fe_designatedFields = $scope.data.fe_designatedFields;

            };

            $scope.reset = function () {
                $scope.$parent.$parent.dataset = angular.copy(dataset);

                if (!dataset.columns) return;

                $scope.data = {};
                $scope.coercionScheme = angular.copy(dataset.raw_rowObjects_coercionScheme);
                $scope.data.fn_new_rowPrimaryKeyFromRowObject = dataset.fn_new_rowPrimaryKeyFromRowObject;
                $scope.data.fe_designatedFields = dataset.fe_designatedFields;
                sortColumnsByDisplayOrder();

                if ($scope.vm) $scope.vm.dataForm.$setPristine();
            };

            $scope.changeCoercionSchemeByOperation = function (colName) {
                var coercion = $scope.coercionScheme[colName];
                if ($filter('typeCoercionToString')(coercion) != 'Date') {
                    $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                } else {
                    if (!$scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName])
                        $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName] = coercion;
                    else
                        $scope.$parent.$parent.dataset.raw_rowObjects_coercionScheme[colName].operation = coercion.operation;
                }
            };

            $scope.reset();

            $scope.data.fe_designatedFields = dataset.fe_designatedFields;
            $scope.data.fn_new_rowPrimaryKeyFromRowObject = dataset.fn_new_rowPrimaryKeyFromRowObject;


            $scope.submitForm = function (isValid) {
                //Save Primary Key UI setting iof the primary key
                $scope.saveRequiredFields();

                if (isValid) {

                    var errorHandler = function (error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    }, done = function() {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Dataset updated successfully!')
                                .position('top right')
                                .hideDelay(3000)
                        );

                        $state.transitionTo('dashboard.dataset.views', {id: dataset._id}, {
                            reload: true,
                            inherit: false,
                            notify: true
                        });
                    };

                    var queue = [];

                    var finalizedDataset = angular.copy($scope.$parent.$parent.dataset);
                    console.log(finalizedDataset);
                    delete finalizedDataset.columns;

                    // console.log(finalizedDataset)

                    queue.push(DatasetService.save(finalizedDataset));

                    $scope.additionalDatasources.forEach(function(datasource) {
                        var finalizedDatasource = angular.copy(datasource);
                        delete finalizedDatasource.fn_new_rowPrimaryKeyFromRowObject;
                        delete finalizedDatasource.raw_rowObjects_coercionScheme;
                        delete finalizedDatasource._otherSources;
                        delete finalizedDatasource._team;
                        delete finalizedDatasource.title;
                        delete finalizedDatasource.importRevision;
                        delete finalizedDatasource.author;
                        delete finalizedDatasource.updatedBy;
                        delete finalizedDatasource.brandColor;
                        delete finalizedDatasource.customFieldsToProcess;
                        delete finalizedDatasource.urls;
                        delete finalizedDatasource.description;
                        delete finalizedDatasource.fe_designatedFields;
                        delete finalizedDatasource.fe_excludeFields;
                        delete finalizedDatasource.fe_displayTitleOverrides;
                        delete finalizedDatasource.fe_fieldDisplayOrder;
                        delete finalizedDatasource.imageScraping;
                        delete finalizedDatasource.isPublished;
                        delete finalizedDatasource.fe_views;
                        delete finalizedDatasource.fe_filters;
                        queue.push(DatasetService.save(finalizedDatasource));
                    });

                    $q.all(queue)
                        .then(done)
                        .catch(errorHandler);
                }
            };

        }
    ]);