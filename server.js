'use strict';

const config = require('config');
const db_user = config.get('mongodb.db_user');
const db_pwd = config.get('mongodb.db_pwd');
const express = require('express'),
    mlccdb = express(),
    port = process.env.PORT || 42069,
    mongoose = require('mongoose'),
    ml_ccom = require('./api/models/CCOMDBModel'),
    bodyParser = require('body-parser'),
    helmet = require('helmet');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://${db_user}:${db_pwd}@localhost/CCOMDB`,  {useNewUrlParser: true});

mlccdb.use(bodyParser.urlencoded({ extended: true }));
mlccdb.use(bodyParser.json());
mlccdb.use(helmet());
let routes = require('./api/routes/CCOMDBRoutes');
routes(mlccdb);

mlccdb.listen(port);

console.log('MLCC RESTful API server started on: ' + port);
