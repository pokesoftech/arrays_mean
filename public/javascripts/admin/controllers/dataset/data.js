angular.module('arraysApp')
    .controller('DatasetDataCtrl', ['$scope', 'dataset',
        function($scope, dataset) {

            $scope.$parent.$parent.dataset = dataset;
            $scope.$parent.$parent.currentNavItem = 'Data';

        }
    ]);