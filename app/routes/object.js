var winston = require('winston');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();

module.exports = function(context) {
    var app = context.app;

    app.get('/array/:source_key/:object_id', ensureLoggedIn, function(req, res)
    {
        var source_key = req.params.source_key;
        if (source_key == null || typeof source_key === 'undefined' || source_key == "") {
            res.status(403).send("Bad Request - source_key missing")

            return;
        }
        var object_id = req.params.object_id;
        if (object_id == null || typeof object_id === 'undefined' || object_id == "") {
            res.status(403).send("Bad Request - object_id missing")

            return;
        }

        context.object_details_controller.BindDataFor_array(source_key, object_id, function(err, bindData)
        {
            if (err) {
                winston.error("❌  Error getting bind data for Array source_key " + source_key + " object " + object_id + " details: ", err);
                res.status(500).send(err.response || 'Internal Server Error');

                return;
            }
            if (bindData == null) { // 404
                res.status(404).send(err.response || 'Not Found');

                return;
            }
            bindData.referer = req.headers.referer;
            res.render('object/show', bindData);
        });
    });
}