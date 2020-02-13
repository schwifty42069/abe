'use strict';

const config = require('config');
const token_secret = config.get('token.token_secret');
const mongoose = require('mongoose'),
ml_ccom = mongoose.model('CCOMDB');

const jwt = require('jsonwebtoken');

const verify = (req, res, next) => {
    try {
        jwt.verify(req.headers.authorization, token_secret, function(err, verify) {
            if(err) {
                res.end({"msg": `Error: ${err}`});
            } else {
                console.log(verify);
                next();
            }
        })
    } catch(error) {
        // Don't know what's going on here
        console.log(res);
    }
}

exports.list_all_ccoms = function(req, res) {
    ml_ccom.find({}, function(err, ccom) {
        if (err) res.send(err);
        res.json(ccom);
    });
};

exports.create_ccom = function(req, res) {
    let new_ccom = new ml_ccom(req.body);
    new_ccom.save(function(err, ccom) {
        if (err) res.send({'code': 400, 'data': err});
        res.json(ccom);
    });
};

exports.get_ccom_by_name = function(req, res) {
     ml_ccom.find({name: req.params.name}, verify, function(err, ccom) {
         if (err) res.send({'code': 400, 'data': err});
         res.json(ccom);
     });
};

exports.update_ccom_by_name = function(req, res) {
    ml_ccom.findOneAndUpdate({name: req.params.name}, req.body, {new: true}, function(err, ccom) {
        if (err) res.send({'code': 400, 'data': err});
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
    ml_ccom.remove({name: req.params.name}, verify, function(err, ccom) {
        if (err) res.send({'code': 400, 'data': err});
        res.json("Successfully removed ccom!");
    });
};
