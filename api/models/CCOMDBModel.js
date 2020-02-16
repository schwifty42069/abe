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
    author: {
        type: String,
        required: 'The author of the ccom is required'
    },
    created_date: {
        type: String,
        default: new Date().toString()
    }
});

module.exports = mongoose.model('CCOMDB', CCOMDBSchema);
