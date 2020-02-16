'use strict';

const config = require('config');
const token_secret = config.get('token.token_secret');
const mongoose = require('mongoose'),
ml_ccom = mongoose.model('CCOMDB');
const jwt = require('jsonwebtoken');

// sorry duckgoose, used a synchronous call for jwt.verify, at least for now
const verify = (req, res, next) => {
    try {
        jwt.verify(req.headers.authorization, token_secret);
        res.json("successfully added ccom!");
        return true;
    } catch(error) {
        res.status(401).json({"msg": `Error: ${error.message}`});
        console.log("Caught error in controller");
        return false;
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
    if(verify(req, res)) {
        new_ccom.save(function(err, ccom) {
            if (err) console.log({'code': 400, 'data': `Server replied with error: ${err.message}`});
            console.log("success!");
        });
    } else {
        console.log("Unauthorized attempt to add ccom was made!");
    }
};

exports.get_ccom_by_name = function(req, res) {
     ml_ccom.find({name: req.params.name}, function(err, ccom) {
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
    ml_ccom.find({author_nick: req.params.author_nick}, function(err, ccom) {
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
    if (verify(req, res)) {
        ml_ccom.deleteOne({name: req.params.name}, function(err, ccom) {
            if (err) console.log({'code': 400, 'data': `Error occurred in delete_ccom: ${err}`});
                console.log("Successfully removed ccom!");
        });
    }
}
