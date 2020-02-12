'use strict';

let express = require('express'),
    mlccdb = express(),
    port = process.env.PORT || 42069,
    mongoose = require('mongoose'),
    ml_ccom = require('./api/models/CCOMDBModel'),
    bodyParser = require('body-parser');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/CCOMDB',  {useNewUrlParser: true});

mlccdb.use(bodyParser.urlencoded({ extended: true }));
mlccdb.use(bodyParser.json());

let routes = require('./api/routes/CCOMDBRoutes');
routes(mlccdb);

mlccdb.listen(port);

console.log('MLCC RESTful API server started on: ' + port);
