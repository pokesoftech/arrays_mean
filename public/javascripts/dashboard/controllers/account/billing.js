angular.module('arraysApp')
    .controller('BillingCtrl', ['$scope', '$mdDialog', '$state',
        function($scope, $mdDialog, $state) {

            $scope.$parent.currentNavItem = 'billing';

            //
            // for testing
            //
            // display name, cost per dataset
            $scope.testPlans = {
                trial: {
                    name: 'Pro',
                    cost: { // per month
                        trial: 0,
                        month: 0,
                        year: 0
                    }
                },
                pro: {
                    name: 'Pro',
                    cost: { // per month
                        month: 149,
                        year: 99
                    }
                },
                // enterprise: {
                //     name: 'Enterprise',
                // }
            };
            // for testing, to attach to user
            $scope.testUser = {};

            $scope.testUser.p = 'pro';
            $scope.testUser.plan = $scope.testPlans[$scope.testUser.p];
            $scope.testUser.paidDatasets = 2; // not the current number but the allowed, paid number
            $scope.testUser.billingCycle = 'month';

            // $scope.testUser.p = 'trial';
            // $scope.testUser.plan = $scope.testPlans[$scope.testUser.p];
            // $scope.testUser.paidDatasets = 1;
            // $scope.testUser.billingCycle = 'trial';
            //
            // for testing
            //

            $scope.openBillingDialog = function(ev, template) {
                $mdDialog.show({
                    controller: BillingDialogController,
                    templateUrl: 'templates/blocks/account.billing.' + template + '.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    // clickOutsideToClose: true,
                    fullscreen: true,
                    locals: {
                        testPlans: $scope.testPlans,
                        testUser: $scope.testUser
                    }
                });
            };

            function BillingDialogController($scope, $mdDialog, testPlans, testUser) {
                $scope.testPlans = testPlans;
                $scope.testUser = testUser;

                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
                $scope.answer = function(answer) {
                    $mdDialog.hide(answer);
                };
            }

    }]);
