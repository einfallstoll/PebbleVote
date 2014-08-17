var fs = require('fs')
, path = require('path')

var MongoClient = require('mongodb')

var db = fs.readFileSync(path.join(__dirname, 'db.txt')).toString()

MongoClient.connect(db, function(error, db) {
    if (error) {
        console.error(error.message)

        response.status(500)
        response.end(JSON.stringify({
            error: error.message
        }))
    } else {
        var questions = db.collection('questions')
        questions.remove(function(error) {
            if (error) {
                console.error(error.message)
            } else {
                console.log('Cleaned')
            }

            db.close()
        })
    }
})
