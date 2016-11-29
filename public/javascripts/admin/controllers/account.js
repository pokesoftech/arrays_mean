angular.module('arraysApp')
    .controller('AccountCtrl', ['$scope', 'AuthService',
        function($scope, AuthService) {


            $scope.logout = function() {
                console.log("logout click");
                // AuthService.logout();
            }


            $scope.updateProfile = function() {
                $('.butterbar').removeClass('hide').addClass('active');
                AuthService.updateProfile($scope.userFormData)
                    .then(function(msg) {
                        $('.butterbar').removeClass('active').addClass('hide');
                        $scope.message = msg;
                    }, function(err) {
                        $('.butterbar').removeClass('active').addClass('hide');
                        $scope.error = err;
                    });
            }
        }
    ]);