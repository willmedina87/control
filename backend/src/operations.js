
//trabalha com datas
var moment = require('moment');

//https://www.npmjs.com/package/mongoose-geojson-schema
var GeoJSON = require('mongoose-geojson-schema');
var mongoose = require('mongoose');

var settings = require('../config.json');

//connects to mongodb
var db = mongoose.createConnection(settings.db, function(error){
	if(error){
		console.log(error);
	}
});


var Schema = mongoose.Schema;

//var usuarios = new Schema({ any: Schema.Types.Mixed });
//Schema.Types.ObjectId

var secoesSchema = new Schema({
  nome:  String
});
var secoes = db.model('secoes', secoesSchema);

var funcoesSchema = new Schema({
  nome:  String,
  secao: secoesSchema
});
var funcoes = db.model('funcoes', funcoesSchema);

var usuariosSchema = new Schema({
  nome:  String,
  nomeGuerra: String,
  login:   String,
  senha: String,
  postGrad:  {type: String, enum: ['Sd', 'Cb', '3ºSgt', '2ºSgt', '1ºSgt',
              'STen', 'Asp', '2ºTen', '1ºTen', 'Cap', 'Maj', 'TC', 'Cel', 'Gen']},
  turno:  {type: String, enum: ['Integral', 'Manhã', 'Tarde']},
  secao: secoesSchema,
  perfil:  {type: String, enum: ['Operador', 'Gerente de Fluxo', 'Chefe de Seção',
              'Visualizador', 'Administrador']},
  funcoes: [{funcao: funcoesSchema, dataInicio: Date, dataFim: Date }],
	funcoesTexto: String
});
var usuarios = db.model('usuarios', usuariosSchema);

var fasesSchema = new Schema({
  nome:  String
});
var fases = db.model('fases', fasesSchema);

var subfasesSchema = new Schema({
  nome:  String,
  fase: fasesSchema,
  funcoes: [funcoesSchema],
	funcoesTexto: String
});


subfasesSchema.post('update', function() {
	  //encontra documentos que tiveram update
		this.find({}, function(err,doc){
			doc.forEach(function(d){
				d.funcoesTexto = d.funcoes.map(function(d){
					return d.nome;
				}).join(',')
				d.save();
			})
		})
});

var subfases = db.model('subfases', subfasesSchema);

var projetosSchema = new Schema({
  nome:  String
});
var projetos = db.model('projetos', projetosSchema);

var subProjetosSchema = new Schema({
  nome:  String,
  projeto: projetosSchema,
  subfases: [{subfase: subfasesSchema, ordem: Number}],
});
var subprojetos = db.model('subProjetos', subProjetosSchema);


var tarefasSchema = new Schema({
  mi: String,
  inom: String,
  escala: Number,
  asc:  {type: String, enum: ['1ª DL', 'CIGEX', '3ª DL', '4ª DL', '5ª DL']},
	subprojeto: subProjetosSchema,
  subfaseAtual: subfasesSchema,
  concluido: Boolean,
  nomeFolha: String,
  palavrasChave: [String],
  datasetIndividual: String,
  datasetContinuo: String,
  geometria: mongoose.Schema.Types.Polygon
});
var tarefas = db.model('tarefas', tarefasSchema);

var tipoAtividadeEspecialSchema = new Schema({
  nome:  String,
  descricao: String
});
var tipoAtividadeEspecial = db.model('tipoAtividadeEspecial', tipoAtividadeEspecialSchema);

var atividadesSchema = new Schema({
  operador: usuariosSchema,
  dataInicio: Date,
  dataFim:   Date,
  horasTrabalhadas: Number,
  tarefa: tarefasSchema,
	subfase: subfasesSchema,
  status:  {type: String, enum: ['Em execução', 'Pausado', 'Finalizado', 'Iniciado', 'Não iniciado']},
  regime:  {type: String, enum: ['Turno', 'Integral', 'Serviço', 'Saindo de serviço']},
  motivoPausa: tipoAtividadeEspecialSchema,
  filaOperador: [usuariosSchema],
	observacao: String,
	prioridade: Number,
  nomeBloco: String,

});
atividadesSchema.add({atividadesBloco: [atividadesSchema]})
var atividades = db.model('atividades', atividadesSchema);

var atividadesEspeciaisSchema = new Schema({
  operador:  usuariosSchema,
  dataInicio: Date,
  dataFim: Date,
  horasTrabalhadas: Date,
  tipoAtividadeEspecial: tipoAtividadeEspecialSchema,
  status: {type: String, enum: ['Em execução', 'Pausado', 'Finalizado', 'Iniciado', 'Não iniciado']},
  regime: {type: String, enum: ['Turno', 'Integral', 'Serviço', 'Saindo de serviço']},
  observacao: String,
  atividadeTecnica: Boolean
});

var atividadesEspeciais = db.model('atividadesEspeciais', atividadesEspeciaisSchema);


// function addativ(){
// 	var data1 = new tipoAtividadeEspecial({nome: 'Sindicância'})
// 	data1.save();
// 	var data2 = new tipoAtividadeEspecial({nome: 'Exame pagamento'})
// 	data2.save();
// 	var data3 = new tipoAtividadeEspecial({nome: 'Fim expediente'})
// 	data3.save();
// 	var data4 = new tipoAtividadeEspecial({nome: 'Almoço'})
// 	data4.save();
// 	var data5 = new tipoAtividadeEspecial({nome: 'Intervalo'})
// 	data5.save();
// 	var data6 = new tipoAtividadeEspecial({nome: 'Tabela FME'})
// 	data6.save();
// }
//

var moldurasSchema = new Schema({
	type:  {type: String, enum: ['Feature']},
	geometry: mongoose.Schema.Types.Polygon,
	properties: {
		mi: String,
		inom: String,
		escala: Number,
		asc:  {type: String, enum: ['1DL', 'CIGEX', '3DL', '4DL', '5DL']}
	}
});
var molduras = db.model('molduras', moldurasSchema);

//usuarios.schema.path('perfil').enumValues


//USUARIOS
//get, get por secao, post, update, delete
function getUsuarios(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};
	//secao
	if(req.query.secao !== undefined){
		var id = new mongoose.Types.ObjectId(req.query.secao);

		match['secao._id'] = id;
	}

	aggregate.push({$match : match});

	usuarios.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}


//ATIVIDADES
//get, update, post, get por status, por usuario, se está distribuída
//por seção, por função, usuario_fila
//alem dos atributos auxiliares orderby, count offset
//pode ser multiplos valores nos atributos funcao, status

function getAtividades(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};
	match['$and'] = [];

	//multiple
	if(req.query.status !== undefined){
		var status = req.query.status.split(',');
		if(status.length >1){
			var or = {};
			or['$or'] = [];
			status.forEach(function(d){
				or['$or'].push({status: d})
			})
			match['$and'].push(or);
		} else{
			match['$and'].push({status: status[0]});
		}
	}

	if(req.query.usuario !== undefined){
		match['$and'].push({'operador._id': new mongoose.Types.ObjectId(req.query.usuario)});
	}

	if(req.query.distribuida !== undefined){
		if(req.query.distribuida === '1'){
			//true
			match['$and'].push({filaOperador: { $gt: [] }});

		} else {
			//false
			match['$and'].push({filaOperador: { $eq: [] }});

		}
	}

	if(req.query.secao !== undefined){
		match['$and'].push({'subfase.funcoes': { $elemMatch : { 'secao._id': new mongoose.Types.ObjectId(req.query.secao)}}});
	}

	if(req.query.usuario_fila !== undefined){
		match['$and'].push({'filaOperador': { $elemMatch : { '_id': new mongoose.Types.ObjectId(req.query.usuario_fila)}}});
	}


	if(match['$and'].length > 0){
		aggregate.push({$match: match});
	} else {
		aggregate.push({$match: {}});
	}


	// sortby = -att1,att2,-att3
	if(req.query.orderby !== undefined){
		var sort = {};
		var atts = req.query.orderby.split(',');
		atts.forEach( function(val){
			if(val.charAt(0) === '-') {
				sort[val.slice( 1 )] = -1;
			} else {
				sort[val] = 1;
			}
		});
		console.log(sort)
		aggregate.push({ $sort: sort });
	}

	//positive integer
	if(req.query.offset !== undefined){
		aggregate.push({ $skip: parseInt(req.query.offset) });
	}

	//positive integer
	if(req.query.count !== undefined){
		aggregate.push({ $limit: parseInt(req.query.count) });
	}

	atividades.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}


function getAtividadesEspeciais(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};
	match['$and'] = [];

	//multiple
	if(req.query.status !== undefined){
		var status = req.query.status.split(',');
		if(status.length >1){
			var or = {};
			or['$or'] = [];
			status.forEach(function(d){
				or['$or'].push({status: d})
			})
			match['$and'].push(or);
		} else{
			match['$and'].push({status: status[0]});
		}
	}

	if(req.query.usuario !== undefined){
		match['$and'].push({'usuario._id': new mongoose.Types.ObjectId(req.query.usuario)});
	}

	// sortby = -att1,att2,-att3
	if(req.query.orderby !== undefined){
		var sort = {};
		var atts = req.query.orderby.split(',');
		atts.forEach( function(val){
			if(val.charAt(0) === '-') {
				sort[val.slice( 1 )] = -1;
			} else {
				sort[val] = 1;
			}
		});
		aggregate.push({ $sort: sort });
	}

	//positive integer
	if(req.query.offset !== undefined){
		aggregate.push({ $skip: parseInt(req.query.offset) });
	}

	//positive integer
	if(req.query.count !== undefined){
		aggregate.push({ $limit: parseInt(req.query.count) });
	}

	atividadesEspeciais.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}


var deepCopy = function(object){
	if(object){
		return JSON.parse(JSON.stringify(object));
	} else{
		return {};
	}
}


function getSecoes(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	secoes.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getFuncoes(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	funcoes.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getFases(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	fases.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getSubfases(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	if(req.query.fase !== undefined){
		match.fase = {}
		match.fase._id = req.query.fase;
	}

	aggregate.push({$match : match});


	subfases.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getTarefas(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	tarefas.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getTipoAtividadeEspecial(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	tipoAtividadeEspecial.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getProjetos(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	projetos.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}

function getSubprojetos(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	aggregate.push({$match : match});

	subprojetos.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result

				//pega tarefas de um projeto
				result.forEach(function(d){
					d.tarefas = [];
				})

				tarefas.find({},function(err,documents){
					if (err){
						console.log(err);
						return res.status(500).end();
					}
					result.forEach(function(d){
						documents.forEach(function(tar){
							if(tar.subprojeto._id.toString() === d._id.toString()){
								d.tarefas.push(tar)
							}
						})
					})
					//console.log(result)
					return res.json(result);
				})
				}
			}
	});
}



function getMolduras(req,res){

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	var match = {};

	if(req.query.mi !== undefined){
		match['properties.mi'] = req.query.mi;
	}

	if(req.query.buscami !== undefined){
		var regex = "^"+req.query.buscami+".*"
		match['properties.mi'] = {'$regex': regex};
	}

	aggregate.push({$match : match});

	molduras.aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json([]);
			} else {
				//Found result
				return res.json(result);
				}
			}
	});
}


function postFuncoes(req, res){
	//só insere uma Funcao
	var novaFuncao = new funcoes(req.body)

	novaFuncao.save(function (err, doc) {
	  if (err){
			console.log('error');
			return res.status(500).end();
		}
		return res.status(201).end();
	});

}

function postSecoes(req, res){
	//só insere uma secao
	var novaSecao = new secoes(req.body)

	novaSecao.save(function (err, doc) {
	  if (err){
			console.log('error');
			return res.status(500).end();
		}
		return res.status(201).end();
	});
}

function postFases(req, res){
	//só insere uma Fase
	var novaFase = new fases(req.body)

	novaFase.save(function (err, doc) {
	  if (err){
			console.log('error');
			return res.status(500).end();
		}
		return res.status(201).end();
	});
}

function postSubfases(req, res){
	//só insere uma subfase
	var novaSubFase = new subfases(req.body)

	novaSubFase.save(function (err, doc) {
	  if (err){
			console.log('error');
			return res.status(500).end();
		}
		return res.status(201).end();
	});

}

function postUsuarios(req, res){
	var novoUsuario = new usuarios(req.body)
	console.log(novoUsuario)

	novoUsuario.save(function (err, doc) {
	  if (err){
			console.log(err);
			return res.status(500).end();
		}
		return res.status(201).end();
	});
}

function postProjetos(req, res){
	//só insere um projeto
	var novoProjeto = new projetos(req.body)

	novoProjeto.save(function (err, doc) {
	  if (err){
			console.log('error');
			return res.status(500).end();
		}
		return res.status(201).end();
	});

}

function postSubprojetos(req, res){
	//só insere um subprojeto
	// problemas com atomicidade

	var primeiraSub;
	req.body.subfases.forEach(function(s){
		if(s.ordem === 0){
			primeiraSub = s.subfase;
		}
	})

	var secao = primeiraSub.funcoes[0].secao;

	req.body.tarefas.forEach(function(d){
		d.subfaseAtual = primeiraSub;
	})

	var novoSubProjeto = new subprojetos({nome: req.body.nome, projeto: req.body.projeto, subfases: req.body.subfases})

	novoSubProjeto.save(function (err, doc) {
		if (err){
			console.log(err);
			return res.status(500).end();
		}

		console.log(doc)

		req.body.tarefas.forEach(function(d){
			d.subprojeto = deepCopy(doc);
		})

		tarefas.collection.insert(req.body.tarefas, function(err,results){
			if (err) {
				console.log(err);
				return res.status(500).end();
			} else {
				//garante os Ids;
				//req.body.tarefas = results.ops;
				console.log(results.ops)

				//pega menor prioridade (maior numero)
				var prioridade = 1;
				var ativQuery = atividades.find({'subfase.funcoes': { $elemMatch : { 'secao._id': new mongoose.Types.ObjectId(secao._id)}}})
					.sort({prioridade : -1}).limit(1);

				ativQuery.exec(function(err, maxResult){
				    if (err) {
							console.log(err);
							return res.status(500).end();
						}
						if(maxResult.length>0){
							prioridade = maxResult[0].prioridade+1;
						}

						req.body.tarefas.forEach(function(d){
							var ativ = {};
							ativ.tarefa = d;
							ativ.subfase = primeiraSub;
							ativ.status = 'Não iniciado';
							ativ.prioridade = prioridade;
							prioridade++;
							var novaAtiv = new atividades(ativ);
							novaAtiv.save(function (err, doc) {
								if (err){
									console.log(err);
									return res.status(500).end();
								}
							});
						})
						return res.status(201).end();
				});

			}
	})

	});




}

function postAtividadesEspeciais(req, res, id){
	var novaAtiv = new atividadesEspeciais(req.body)

	novaAtiv.save(function (err, doc) {
	  if (err){
			console.log('error');
			return res.status(500).end();
		}
		return res.status(201).end();
	});
}


function putFases(req, res, id){

	delete req.body._id
	delete req.body.__v


	var id = new mongoose.Types.ObjectId(id);
	//update em subfase, subprojeto, tarefa, atividade

	//update em fases
	fases.findByIdAndUpdate(id, { $set: req.body}, function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		}
		if(result === null){
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result
			subfases.update({'fase._id': id}, {$set: {'fase.nome': req.body.nome}}, {multi: true}, function(e, docs){
				if (e){
					console.log(err);
					return res.status(500).end();
				} else {
					console.log(docs)
					return res.status(200).end();
				}
			})
		}
	});
}

function putFuncoes(req, res, id){

	delete req.body._id
	delete req.body.__v

	var id = new mongoose.Types.ObjectId(id);
	//update em usuarios, subfases, tarefa, atividade

	//update em fases
	funcoes.findByIdAndUpdate(id, { $set: req.body}, function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		}
		if(result === null){
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result
			subfases.update({'funcoes._id': id}, {$set: {'funcoes.$.nome': req.body.nome, 'funcoes.$.secao': req.body.secao}}, {multi: true}, function(e, docs){
				if (e){
					console.log(e);
					return res.status(500).end();
				} else {
					console.log(docs)
					return res.status(200).end();
				}
			})
		}
	});
}


function putSecoes(req, res, id){

	delete req.body._id
	delete req.body.__v


	var id = new mongoose.Types.ObjectId(id);
	//update em funcoes, usuarios, subfases, tarefa, atividade

	//update em fases
	secoes.findByIdAndUpdate(id, { $set: req.body}, function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		}
		if(result === null){
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result
			funcoes.update({'secao._id': id}, {$set: {'secao.nome': req.body.nome}}, {multi: true}, function(e, docs){
				if (e){
					console.log(err);
					return res.status(500).end();
				} else {
					console.log(docs)
					return res.status(200).end();
				}
			})
		}
	});
}

function putUsuarios(req, res, id){

	delete req.body._id
	delete req.body.__v


	var id = new mongoose.Types.ObjectId(id);
	//update em atividades, atividadesespeciais

	//update em fases
	usuarios.findByIdAndUpdate(id, { $set: req.body}, function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		}
		if(result === null){
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result
			return res.status(200).end();

		}
	});
}

function putAtividades(req, res, id){

	delete req.body._id
	delete req.body.__v

	atividades.findById(id,function(err,document){
		if (err) {
			console.log(err);
			return res.status(500).end();
		}
		if(document === null){
			//Did not find any entry
			console.log('erro na query, não retornou resultados')
			res.status(500).end();
		}

		if(document.prioridade != req.body.prioridade){
			var secao = req.body.subfase.funcoes[0].secao;
			var ativQuery = atividades.find({'subfase.funcoes': { $elemMatch : { 'secao._id': new mongoose.Types.ObjectId(secao._id)}}})
			.sort({prioridade : 1});

			ativQuery.exec(function(err, results){
				if (err) {
					console.log(err);
					return res.status(500).end();
				}
				if(results === null){
					//Did not find any entry
					console.log('erro na query, não retornou resultados')
					res.status(500).end();
				}

				var count = 1;
				var passed = false;
				results.forEach(function(d,i){
					if(id === d._id.toString()){
						Object.keys(req.body).forEach(function(key){
							d[key] = req.body[key];
						})
						if(d.prioridade === req.body.prioridade){
							count++;
						}
						passed = true;
					} else {
						if((i+1) === req.body.prioridade && !passed){
							count++;
						}
						d.prioridade = count;
						count++;
						if((i+1) === req.body.prioridade && passed){
							count++;
						}
					}
					d.save();
				})
				return res.status(200).end();

			})
		} else {
			//verifica se Finalizado
			Object.keys(req.body).forEach(function(key){
				document[key] = req.body[key];
			})
			document.save();

			if(req.body.status === 'Finalizado'){
				//cria atividade no proximo ordenamento

				var subfaseatual = req.body.subfase._id;
				var subprojetoId = req.body.tarefa.subprojeto._id;
				console.log(subfaseatual)
				console.log(subprojetoId)

				subprojetos.findById(subprojetoId,function(err,subproj){
					if (err) {
						console.log(err);
						return res.status(500).end();
					}
					if(subproj === null){
						//Did not find any entry
						console.log('erro na query, não retornou resultados')
						res.status(500).end();
					}

					var ordemAtual;
					subproj.subfases.forEach(function(s){
						if(s.subfase._id.toString() === subfaseatual){
							ordemAtual = s.ordem;
						}
						console.log(s.ordem, ordemAtual)
						if(s.ordem === ordemAtual+1){
							proximaSub = s.subfase;
						}
					})
					console.log(proximaSub)
					var secao = proximaSub.funcoes[0].secao;
					console.log(secao)

					var prioridade = 1;
					var prioridadeQuery = atividades.find({'subfase.funcoes': { $elemMatch : { 'secao._id': new mongoose.Types.ObjectId(secao._id)}}})
					.sort({prioridade : -1}).limit(1);

					prioridadeQuery.exec(function(err, maxResult){
						if (err) {
							console.log(err);
							return res.status(500).end();
						}
						if(maxResult.length>0){
							prioridade = maxResult[0].prioridade+1;
						}
						console.log(prioridade)

						var ativ = {};
						ativ.tarefa = req.body.tarefa;
						ativ.subfase = proximaSub;
						ativ.status = 'Não iniciado';
						ativ.prioridade = prioridade;
						var novaAtiv = new atividades(ativ);
						novaAtiv.save(function (err, doc) {
							if (err){
								console.log(err);
								return res.status(500).end();
							}
							console.log(doc)
						});
					})
				})

			} else if(req.body.status === 'Pausado'){
				//cria copia da atividade
				var ativ = deepCopy(req.body);
				delete ativ.dataFim;
				delete ativ.horasTrabalhadas;
				delete ativ.dataInicio;
				delete ativ.motivoPausa;
				delete ativ.regime;
				ativ.status = 'Iniciado';
				var novaAtiv = new atividades(ativ);
				novaAtiv.save(function (err, doc) {
					if (err){
						console.log(err);
						return res.status(500).end();
					}
					console.log(doc)
				});

			}

			return res.status(200).end();

		}

	});





}

function putSubprojetos(req, res, id){
	//adiciona tarefas
	//cria tarefas e atividades

	delete req.body._id
	delete req.body.__v


	var id = new mongoose.Types.ObjectId(id);
	//update em atividades, atividadesespeciais

	//update em fases    findByIdAndUpdate   { $set: req.body}
	subprojetos.findById(id, function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		}
		if(result === null){
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result
			var novaTarefas = [];
			req.body.tarefas.forEach(function(d){
				var novo = !result.tarefas.some(function(tarefa){
					return tarefa._id.toString() === d._id;
				})
				if(novo){
					novaTarefas.push(d)
				}
			})

			var primeiraSub;
			req.body.subfases.forEach(function(s){
				if(s.ordem === 0){
					primeiraSub = s.subfase;
				}
			})

			var secao = primeiraSub.funcoes[0].secao;

			novaTarefas.forEach(function(d){
				d.subfaseAtual = primeiraSub;
				d.subprojeto = deepCopy(req.body);
			})

			//insere novas tarefas
			tarefas.collection.insert(novaTarefas, function(err,tarefasInsert){
					if (err) {
						console.log(err);
						return res.status(500).end();
					} else {
						// //garante os Ids;
						// result.tarefas = result.tarefas.concat(tarefasInsert.ops);
						//
						// //update no subprojetos
						// result.save();

						//pega menor prioridade (maior numero)
						var prioridade = 1;
						var ativQuery = atividades.find({'subfase.funcoes': { $elemMatch : { 'secao._id': new mongoose.Types.ObjectId(secao._id)}}})
							.sort({prioridade : -1}).limit(1);

						ativQuery.exec(function(err, maxResult){
						    if (err) {
									console.log(err);
									return res.status(500).end();
								}
								if(maxResult.length>0){
									prioridade = maxResult[0].prioridade+1;
								}

							//cria atividades
							tarefasInsert.ops.forEach(function(d){
								var ativ = {};
								ativ.tarefa = d;
								ativ.subfase = primeiraSub;
								ativ.prioridade = prioridade;
								prioridade++;
								ativ.status = 'Não iniciado';
								var novaAtiv = new atividades(ativ);
								novaAtiv.save(function (err, doc) {
									if (err){
										console.log(err);
										return res.status(500).end();
									}
										console.log(doc)
								});
							})

						});
					}
			})


			console.log(novaTarefas)
			return res.status(200).end();

		}
	});
}


function putAtividadesEspeciais(req, res, id){

}

// function delFuncoes(res, id){
//
// 	funcoes.findByIdAndRemove(id, function(err,result){
// 		//error
// 		if (err){
// 			console.log(err);
// 			return res.status(500).end();
// 		}
// 		if(result === null){
// 			//Did not find any entry
// 			res.status(404).end();
// 		} else {
// 			//Found result
// 			return res.status(204).end();
// 		}
// 	});
// }
//
// function delSecoes(res, id){
//
// 	secoes.findByIdAndRemove(id, function(err,result){
// 		//error
// 		if (err){
// 			console.log(err);
// 			return res.status(500).end();
// 		}
// 		if(result === null){
// 			//Did not find any entry
// 			res.status(404).end();
// 		} else {
// 			//Found result
// 			return res.status(204).end();
// 		}
// 	});
// }



var get = {}
get.usuarios = getUsuarios;
get.atividades = getAtividades;
get.funcoes = getFuncoes;
get.secoes = getSecoes;
get.projetos = getProjetos;
get.subprojetos = getSubprojetos;
get.fases = getFases;
get.subfases = getSubfases;
get.tarefas = getTarefas;
get.atividadesespeciais = getAtividadesEspeciais;
get.tipoatividadesespecial = getTipoAtividadeEspecial;

get.molduras = getMolduras;

var post = {};
post.usuarios = postUsuarios;
post.funcoes = postFuncoes;
post.secoes = postSecoes;
post.projetos = postProjetos;
post.subprojetos = postSubprojetos;
post.fases = postFases;
post.subfases = postSubfases;
post.atividadesespeciais = postAtividadesEspeciais;
// post.tipoatividadesespecial = postTipoAtividadeEspecial;

var put = {};
put.usuarios = putUsuarios;
put.atividades = putAtividades;
put.funcoes = putFuncoes;
put.secoes = putSecoes;
// put.projetos = putProjetos;
put.subprojetos = putSubprojetos;
 put.fases = putFases;
// put.subfases = putSubfases;
// put.tarefas = putTarefas;
put.atividadesespeciais = putAtividadesEspeciais;
// put.tipoatividadesespecial = putTipoAtividadeEspecial;

var del = {};
// del.usuarios = delUsuarios;
// del.atividades = delAtividades;
// del.funcoes = delFuncoes;
// del.secoes = delSecoes;
// del.projetos = delProjetos;
// del.subprojetos = delSubprojetos;
// del.fases = delFases;
// del.subfases = delSubfases;
// del.tarefas = delTarefas;
// del.atividadesespeciais = delAtividadesEspeciais;
// del.tipoatividadesespecial = delTipoAtividadeEspecial;

module.exports.get = get;
module.exports.post = post;
module.exports.del = del;
module.exports.put = put;
