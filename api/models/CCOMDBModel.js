// very basic DB schema for mongodb

'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let CCOMDBSchema = new Schema({
    name: {
        type: String,
        required: 'The ccom name is required',
        unique: true
    },
    lang: {
        type: String,
        required: 'The ccom language is required'
    },
    code: {
        type: String,
        required: 'The ccom code is required'
    },
    author_nick: {
        type: String,
        required: 'The author\'s nick is required'
    },
    author_host: {
        type: String,
        required: 'The author\'s hostmask is required'
    },
    created_date: {
        type: String,
        default: new Date().toString()
    }
});

module.exports = mongoose.model('CCOMDB', CCOMDBSchema);
