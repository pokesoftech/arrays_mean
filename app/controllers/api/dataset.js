var winston = require('winston');
var datasource_description = require('../../models/descriptions');
var raw_source_documents = require('../../models/raw_source_documents');
var mongoose_client = require('../../models/mongoose_client');
var _ = require('lodash');

module.exports.getAll = function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    datasource_description.find({schema_id: {$exists: false}}, {
        _id: 1,
        title: 1,
        importRevision: 1
    }, function (err, datasets) {
        if (err) {
            winston.error("❌  Error getting all datasets: " + err.message);

            return res.send(JSON.stringify({
                error: err.message
            }))
        }
        return res.send(JSON.stringify({datasets: datasets}));
    });
};

module.exports.remove = function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (!req.body.id)
        return res.send(JSON.stringify({error: 'No ID given'}));

    var batch = new Batch();
    batch.concurrency(1);

    var description;
    var srcDocPKey;
    batch.push(function(done) {
        datasource_description.findById(req.body.id, function(err, data) {
            if (err) return done(err);

            if (!data) return done(new Error('No datasource exists : ' + req.body.id));

            description = data;
            srcDocPKey = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(description.uid, description.importRevision);
            done();
        });
    });

    // Remove source document
    batch.push(function(done) {

        raw_source_documents.Model.findOne({primaryKey: srcDocPKey}, function(err, document) {
            if (err) return done(err);

            if (!document) return done();
            document.remove(done);
        });
    });

    // Remove processed row object
    batch.push(function(done) {

        mongoose_client.dropCollection('processedrowobjects-' + srcDocPKey,done)

    });

    // Remove raw row object
    batch.push(function(done) {

        mongoose_client.dropCollection('rawrowobjects-' + srcDocPKey,done)

    });

    // Remove datasource description
    batch.push(function(done) {
        description.remove(done);
    });

    // Remove datasource description with schema_id
    batch.push(function(done) {
        datasource_description.find({schema_id: description._id}, function(err, results) {
            if (err) return done(err);

            var batch = new Batch();
            batch.concurrency(1);

            results.forEach(function(element) {
                batch.push(function(done) {
                    element.remove(done);
                });
            });

            batch.end(function(err) {
                done(err);
            });

        });
    });

    batch.end(function(err) {
        if (err)
            return res.send(JSON.stringify({error: err.message}));
        res.send(JSON.stringify({success: 'ok'}));
    });
}

module.exports.get = function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (!req.params.id)
        return res.send(JSON.stringify({error: 'No ID given'}));

    req.session.uploadData_columnNames = null;
    req.session.uploadData_firstRecord = null;

    datasource_description.findById(req.params.id, function (err, doc) {
        if (err) return res.send(JSON.stringify({error: err.message}));
        if (!doc) return res.send(JSON.stringify({error: 'Invalid ID'}));

        return res.send(JSON.stringify({dataset: doc._doc}));
    });
};

module.exports.update = function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (!req.body._id)
        return res.send(JSON.stringify({error: 'No ID given'}));

    datasource_description.findById(req.body._id, function (err, doc) {
        if (err) return res.send(JSON.stringify({error: err.message}));
        if (!doc) return res.send(JSON.stringify({error: 'Invalid Operation'}));

        _.forOwn(req.body, function(value, key) {
            if (key != '_id' && !_.isEqual(value, doc._doc[key])) {
                doc[key] = value;
                if (typeof value === 'object')
                    doc.markModified(key);
                console.log('Updated with - ' + key + ' with ' + value);

                // TODO: detect whether you need to re-import dataset to the system or not, and inform that the client
            }
        });

        doc.save(function(err, updatedDoc) {
            if (err) return res.send(JSON.stringify({error: err.message}));
            if (!updatedDoc) return res.send(JSON.stringify({error: 'Invalid Operation'}));

            return res.send(JSON.stringify({success: 'ok'}));
        });
    });
};