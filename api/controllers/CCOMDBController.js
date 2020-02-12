'use strict';

let mongoose = require('mongoose'),
ml_ccom = mongoose.model('CCOMDB');
const http = require('http');

exports.list_all_ccoms = function(req, res) {
    ml_ccom.find({}, function(err, ccom) {
        if (err) res.send(err);
        res.json(ccom);
    });
};

exports.create_ccom = function(req, res) {
    let new_ccom = new ml_ccom(req.body);
    new_ccom.save(function(err, ccom) {
        if (err) res.send(err);
        res.json(ccom);
    });
};

exports.get_ccom_by_name = function(req, res) {
     ml_ccom.find({name: req.params.name}, function(err, ccom) {
         if (err) res.send(err);
         res.json(ccom);
     });
};

exports.update_ccom_by_name = function(req, res) {
    ml_ccom.findOneAndUpdate({name: req.params.name}, req.body, {new: true}, function(err, ccom) {
        if (err) res.send(err);
        res.json(ccom);
    });
};

exports.get_ccoms_by_author = function(req, res) {
    ml_ccom.find({author: req.params.author}, function(err, ccom) {
        if (err) res.send(err);
        res.json(ccom);
    });
};

exports.get_ccoms_by_lang = function(req, res) {
    ml_ccom.find({lang: req.params.lang}, function(err, ccom) {
        if(err) res.send(err);
        res.json(ccom);
    });
};

exports.delete_ccom = function(req, res) {
    ml_ccom.remove({name: req.params.name}, function(err, ccom) {
        if (err) res.send(err);
        res.json({ message: 'ccom successfully deleted' });
    });
};
