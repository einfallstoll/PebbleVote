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
app.use(bodyParser.urlencoded())

app.all('*', function(request, response, next) {
    response.setHeader('Content-Type', 'text/json')
    next()
})

app.get('/', function(request, response) {
    response.end(JSON.stringify({
        status: 'PebbleVote API'
    }))
})

function MongoFind(query, options, callback) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.find(query, options).toArray(function(error, results) {
                callback(error, results)
                db.close()
            })
        }
    })
}

function MongoInsert(document, options, callback) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.insert(document, options, function(error) {
                callback(error)
                db.close()
            })
        }
    })
}

function MongoUpdate(document, options, moreoptions, callback) {
    MongoClient.connect(db, function(error, db) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            var questions = db.collection('questions')
            questions.update(document, options, moreoptions, function(error) {
                callback(error)
                db.close()
            })
        }
    })
}

/*
Returns questions to a specific user

{
  user: UUID
}
*/
app.post('/statistics', function(request, response) {
    MongoFind({
        user: request.body.user
    }, {
        
    }, function(error, results) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            results.map(function(result) {
                return _.extend(result, {
                    either_count: result.either_user ? result.either_user.length : 0,
                    or_count: result.or_user ? result.or_user.length : 0,
                    report_count: result.report_user ? result.report_user.length : 0,
                    skip_count: result.skip_user ? result.skip_user.length : 0
                })
            })

            response.end(JSON.stringify(results))
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
app.post('/random', function(request, response) {
    var tenDaysAgo = parseInt(moment().subtract('10', 'days').format('X'))
    MongoFind({
        user: { $ne: request.body.user },
        language: request.body.language,
        timestamp: { $gte: tenDaysAgo },
        "either_user.user": { $ne: request.body.user },
        "or_user.user": { $ne: request.body.user },
        "report_user.user": { $ne: request.body.user },
        "skip_user.user": { $ne: request.body.user },
        $where: "this.report.length < 10 || (this.report.length / (this.upvote.length + this.downvote.length + 1) < 0.05)"
    }, {
        limit: 25,
        sort: 'timestamp'
    }, function(error, results) {
        if (error) {
            console.error(error.message)

            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            results.map(function(result) {
                return _.extend(result, {
                    either_count: result.either_user ? result.either_user.length : 0,
                    or_count: result.or_user ? result.or_user.length : 0,
                    report_count: result.report_user ? result.report_user.length : 0,
                    skip_count: result.skip_user ? result.skip_user.length : 0
                })
            })

            response.end(JSON.stringify(results))
        }
    })
})


/*
Returns voted questions to a specific user

{
  user: UUID
}
*/
app.post('/voted', function(request, response) {
    MongoFind({
        $or: [
            { "either_user.user": request.body.user },
            { "or_user.user": request.body.user }
        ]
    }, {
        
    }, function(error, results) {
        if (error) {
            console.error(error.message)
            
            response.status(500)
            response.end(JSON.stringify({
                error: error.message
            }))
        } else {
            results.map(function(result) {
                return _.extend(result, {
                    either_count: result.either_user ? result.either_user.length : 0,
                    or_count: result.or_user ? result.or_user.length : 0,
                    report_count: result.report_user ? result.report_user.length : 0,
                    skip_count: result.skip_user ? result.skip_user.length : 0
                })
            })

            response.end(JSON.stringify(results))
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
    MongoInsert({
        user: request.body.user,
        either: request.body.either,
        or: request.body.or,
        language: request.body.language,
        timestamp: parseInt(moment().format('X')),
        either_user: [],
        or_user: [],
        report_user: [],
        skip_user: []
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
    MongoUpdate({
        _id: ObjectID(request.body.question)
    }, {
        $addToSet: {
            report_user: {
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
    })
})


/*
Skips a question

{
  user: UUID,
  question: ID
}
*/
app.post('/skip', function(request, response) {
    MongoUpdate({
        _id: ObjectID(request.body.question)
    }, {
        $addToSet: {
            skip_user: {
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
    })
})


/*
Adds an either to a question

{
  user: UUID,
  question: ID
}
*/
app.post('/either', function(request, response) {
    MongoUpdate({
        _id: ObjectID(request.body.question)
    }, {
        $addToSet: {
            either_user: {
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
    })
})


/*
Adds an or to a question

{
  user: UUID,
  question: ID
}
*/
app.post('/or', function(request, response) {
    MongoUpdate({
        _id: ObjectID(request.body.question)
    }, {
        $addToSet: {
            or_user: {
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
    })
})


app.all('*', function(request, response) {
    response.status(404)
    response.end(JSON.stringify({
        error: 'Site not found!'
    }))
})
