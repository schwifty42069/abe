'use strict';
const config = require('config');
const token_secret = config.get('token.token_secret');
const jwt = require('jsonwebtoken');

// this isn't quite working, needs debugging
const verify = (req, res, next) => {
    try {
        jwt.verify(req.headers.authorization, token_secret, function(err, verify) {
            if(err) {
                res.status(400).json({"msg": `Error: ${err}`})
            } else {
                console.log(verify);
                next();
            }
        })
    } catch(error) {

        res.status(400).json({"msg": "Invalid auth token!"});
    }
}

module.exports = function(ccoms) {
    let CCOMDb = require('../controllers/CCOMDBController.js');

    // ccom routes -> fetch by name, lang and author
    ccoms.route('/ccoms')
        .get(CCOMDb.list_all_ccoms)
        .post(CCOMDb.create_ccom);

    ccoms.route('/ccoms/name/:name', verify)
        .get(CCOMDb.get_ccom_by_name)
        .put(CCOMDb.update_ccom_by_name)
        .delete(CCOMDb.delete_ccom, verify);

    ccoms.route('/ccoms/author/:author')
        .get(CCOMDb.get_ccoms_by_author);

    ccoms.route('/ccoms/lang/:lang')
        .get(CCOMDb.get_ccoms_by_lang);
};
