var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var cors = require('cors');

// create application/json parser
var jsonParser = bodyParser.json()

//Javascript com operações de banco
var operations = require('../src/operations');


//CORS middleware
router.use(cors({
  exposedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Link, Location"
}));
// router.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });

var availableLayers = ['usuarios', 'funcoes', 'secoes', 'projetos', 'subprojetos',
'fases', 'subfases', 'tarefas', 'atividades', 'atividadesespeciais', 'tipoatividadesespecial', 'molduras']

var layersVerify = function (req, res, next) {
	if (availableLayers.indexOf(req.params.layer) != -1) {
		next();
	} else {
		res.status(404).end();
	}
};


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get('/data/:layer', layersVerify, function(req, res, next) {
  operations.get[req.params.layer](req, res);
});

router.post('/data/:layer', layersVerify, jsonParser, function(req, res, next) {
  operations.post[req.params.layer](req, res);
});

router.delete('/data/:layer/:id', layersVerify, function(req, res, next) {
  operations.delete[req.params.layer](res, req.params.id);
});

router.put('/data/:layer/:id', layersVerify, jsonParser, function(req, res, next) {
  operations.put[req.params.layer](req, res, req.params.id);
});

module.exports = router;
