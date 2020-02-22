'use strict';
const config = require('config');

module.exports = function(ccoms) {
    let CCOMDb = require('../controllers/CCOMDBController.js');

    // ccom routes -> fetch by name, lang and author
    ccoms.route('/ccoms')
        .get(CCOMDb.list_all_ccoms)
        .post(CCOMDb.create_ccom);

    ccoms.route('/ccoms/name/:name')
        .get(CCOMDb.get_ccom_by_name)
        .put(CCOMDb.update_ccom_by_name)
        .delete(CCOMDb.delete_ccom);

    ccoms.route('/ccoms/author/:author_nick')
        .get(CCOMDb.get_ccoms_by_author);

    ccoms.route('/ccoms/lang/:lang')
        .get(CCOMDb.get_ccoms_by_lang);
};
