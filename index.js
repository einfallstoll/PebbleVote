var fs = require('fs')
, path = require('path')

var _ = require('underscore')
, bodyParser = require('body-parser')
, express = require('express')
, moment = require('moment')
, MongoClient = require('mongodb').MongoClient
, ObjectID = require('mongodb').ObjectID

var db = fs.readFileSync(path.join(__dirname, 'db.txt')).toString()

var app = express()

app.listen(80)

app.use(bodyParser.json())

app.all('*', function(request, response, next) {
    response.setHeader('Content-Type', 'text/json')
    next()
})

app.get('/', function(request, response) {
    response.end(JSON.stringify({
        status: 'PebbleVote API'
    }))
})

/*
Returns questions to a specific user

{
  user: UUID
}
*/
app.post('/my-questions', function(request, response) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.find({
                user: request.body.user
            }).toArray(function(error, results) {
                if (error) {
                    console.error(error.message)
                    
                    response.status(500)
                    response.end(JSON.stringify({
                        error: error.message
                    }))
                } else {
                    results.map(function(result) {
                        return _.extend(result, {
                            upvote: result.upvote ? result.upvote.length : 0,
                            downvote: result.downvote ? result.downvote.length : 0,
                            report: result.report ? result.report.length : 0
                        })
                    })
                    
                    response.end(JSON.stringify(results))
                }
                
                db.close()
            })
        }
    })
})


/*
Returns random questions to a specific language

{
  user: UUID,
  language: STRING
}
*/
app.post('/random-questions', function(request, response) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            
            var tenDaysAgo = parseInt(moment().subtract('10', 'days').format('X'))
            
            questions.find({
                user: { $ne: request.body.user },
                language: request.body.language,
                timestamp: { $gte: tenDaysAgo },
                "upvote.user": { $ne: request.body.user },
                "downvote.user": { $ne: request.body.user },
                "report.user": { $ne: request.body.user },
                $where: "this.report.length < 10 || (this.report.length / (this.upvote.length + this.downvote.length + 1) < 0.05)"
            }, {
                limit: 25,
                sort: 'timestamp'
            }).toArray(function(error, results) {
                if (error) {
                    console.error(error.message)
                    
                    response.status(500)
                    response.end(JSON.stringify({
                        error: error.message
                    }))
                } else {
                    console.log(results)
                    
                    results.map(function(result) {
                        return _.extend(result, {
                            upvote: result.upvote ? result.upvote.length : 0,
                            downvote: result.downvote ? result.downvote.length : 0,
                            report: result.report ? result.report.length : 0
                        })
                    })
                    
                    response.end(JSON.stringify(results))
                }
                
                db.close()
            })
        }
    })
})


/*
Adds a new question

{
  user: UUID,
  question: STRING,
  language: STRING
}
*/
app.post('/question', function(request, response) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.insert({
                user: request.body.user,
                question: request.body.question,
                language: request.body.language,
                timestamp: parseInt(moment().format('X')),
                upvote: [],
                downvote: [],
                report: []
            }, {
                safe: true
            }, function(error) {
                if (error) {
                    console.error(error.message)
                    
                    response.status(500)
                    response.end(JSON.stringify({
                        error: error.message
                    }))
                } else {
                    response.end(JSON.stringify({
                        status: 'ok'
                    }))
                }
                
                db.close()
            })
        }
    })
})


/*
Reports a question

{
  user: UUID,
  question: ID
}
*/
app.post('/report', function(request, response) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.update({
                _id: ObjectID(request.body.question)
            }, {
                $addToSet: {
                    report: {
                        user: request.body.user
                    }
                }
            }, {
                safe: true
            }, function(error) {
                if (error) {
                    console.error(error.message)
                    
                    response.status(500)
                    response.end(JSON.stringify({
                        error: error.message
                    }))
                } else {
                    response.end(JSON.stringify({
                        status: 'ok'
                    }))
                }
                
                db.close()
            })
        }
    })
})


/*
Adds an upvote to a question

{
  user: UUID,
  question: ID
}
*/
app.post('/upvote', function(request, response) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.update({
                _id: ObjectID(request.body.question)
            }, {
                $addToSet: {
                    upvote: {
                        user: request.body.user
                    }
                }
            }, {
                safe: true
            }, function(error) {
                if (error) {
                    console.error(error.message)
                    
                    response.status(500)
                    response.end(JSON.stringify({
                        error: error.message
                    }))
                } else {
                    response.end(JSON.stringify({
                        status: 'ok'
                    }))
                }
                
                db.close()
            })
        }
    })
})


/*
Adds an downvote to a question

{
  user: UUID,
  question: ID
}
*/
app.post('/downvote', function(request, response) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.update({
                _id: ObjectID(request.body.question)
            }, {
                $addToSet: {
                    downvote: {
                        user: request.body.user
                    }
                }
            }, {
                safe: true
            }, function(error) {
                if (error) {
                    console.error(error.message)
                    
                    response.status(500)
                    response.end(JSON.stringify({
                        error: error.message
                    }))
                } else {
                    response.end(JSON.stringify({
                        status: 'ok'
                    }))
                }
                
                db.close()
            })
        }
    })
})


app.all('*', function(request, response) {
    response.status(404)
    response.end(JSON.stringify({
        error: 'Site not found!'
    }))
})
