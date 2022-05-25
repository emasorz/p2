//load express
const express = require('express');
const app = express();
let port = process.env.PORT || 3000;

const { mongoose } = require('./db/mongoose');

const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");

const { encrypt, decrypt } = require('./db/models/crypto');
const jwt = require('jsonwebtoken')

const ROOT = "https://www.tiphub.cloud";
//const ROOT = "https://localhost:4200";


//Load in the mongoose models using index.js file instead load one at a time
const { User, Test, Doc, Exam } = require("./db/models");

/** MIDDLEWARE */

//load Middleware
// app.use(bodyParser.json());
app.use(bodyParser.json({ limit: "50mb" }))

// CORS HEADERS MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    );

    next();
});

// check whether the request has a valid JWT access token
// means that the id of session is an authenticated user    
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid - * DO NOT AUTHENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next();
        }
    });
}

// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
        // grab the refresh token from the request header
        let refreshToken = req.header('x-refresh-token');

        // grab the _id from the request header
        let _id = req.header('_id');

        User.findByIdAndToken(_id, refreshToken).then((user) => {
            if (!user) {
                // user couldn't be found
                return Promise.reject({
                    'error': 'User not found. Make sure that the refresh token and user id are correct'
                });
            }


            // if the code reaches here - the user was found
            // therefore the refresh token exists in the database - but we still have to check if it has expired or not

            req.user_id = user._id;
            req.userObject = user;
            req.refreshToken = refreshToken;

            let isSessionValid = false;

            user.sessions.forEach((session) => {
                if (session.token === refreshToken) {
                    // check if the session has expired
                    if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                        // refresh token has not expired
                        isSessionValid = true;
                    }
                }
            });

            if (isSessionValid) {
                // the session is VALID - call next() to continue with processing this web request
                next();
            } else {
                // the session is not valid
                return Promise.reject({
                    'error': 'Refresh token has expired or the session is invalid'
                })
            }

        }).catch((e) => {
            res.status(401).send(e);
        })
    }
    /** END MIDDLEWARE */


app.get('/', (req, res) => {
    Test.find({} /** no query fields */ ).then((tests) => {
        res.send("<h1>Eureka!</h1><h4>Tutto fuziona corettamente!</h4><br><h2>Test Data</h2><p>" + tests + "</p>");
    }).catch((e) => {

    });
})

/**
 * GET /test
 * Purpose: get all list
 */
app.get('/test', (req, res) => {
    //return an array of the tests in the database
    Test.find({} /** no query fields */ ).then((tests) => {
        res.send(tests)
    }).catch((e) => {

    });
})

/**
 * POST /test
 * Purpose: create a test
 */
app.post('/test', (req, res) => {
    //create a new test and return the new test document back to the user (wich includes the id)
    //the list information (fields) will be passed in via the JSON request body
    let name = req.body.name; //for to do this. is require install and setup body-parser
    let newTest = new Test({
        name
    });

    newTest.save().then((testDoc) => {
        //the full document is returned
        res.send(testDoc);
    });
})

/**
 * PATCH /list/:id
 * Purpose: Update specified test
 */
app.patch('/test/:id', (req, res) => {
    //update the spcecified test with the new values specified in the JSON body of the request
    Test.findOneAndUpdate({
        _id: req.params.id
    }, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    })
})

/**
 * DELETE /test/:id
 * Purpose: Delete specified test
 */
app.delete('/test/:id', (req, res) => {
    //delete the specified test
    Test.findOneAndRemove({
        _id: req.params.id
    }).then((removedTestDoc) => {
        res.send(removedTestDoc);
    })
})

/* USER ROUTES */

/**
 * POST /users
 * Purpose: Sign up
 */
app.post('/users', (req, res) => {
    // User sign up


    let body = req.body;
    console.log(req.body);
    let newUser = new User(body);

    let id = newUser._id;
    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Session created successfully - refreshToken returned.
        // now we geneate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        console.log(e);
        res.status(400).send(e);
    })
})


/**
 * POST /users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully - refreshToken returned.
            // now we geneate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        console.log(e);
        res.send({"error":e});
    });
})



/** testing */
app.get('/users', (req, res) => {
    //return an array of the tests in the database
    let criteria = new RegExp(req.query.search, 'i');
    User.find(
    {"$or": [ 
        { "firstName" : { $regex: criteria }},
        { "lastName" : { $regex: criteria }},
        { "username" : { $regex: criteria }},
    ]}
    ).then((users) => {
        res.send(users)
    }).catch((e) => {

    });
})

app.get('/users/:user_id', authenticate, (req, res) => {
    //return an array of the tests in the database
    User.find({ _id: req.params.user_id } /** no query fields */ ).then((user) => {
        res.send(user)
    }).catch((e) => {
        res.send(e);
    });
})

/** testing */
app.delete('/users/:email', (req, res) => {
    //delete the specified test
    User.findOneAndRemove({
        email: req.params.email
    }).then((removedTestDoc) => {
        res.send(removedTestDoc);
    })
})

app.patch('/users/:id', (req, res) => {
    //update the spcecified test with the new values specified in the JSON body of the request
    console.log(req.body);
    User.findOneAndUpdate({
        _id: req.params.id
    }, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    })
})

/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 * _id and x-refresh-token in the header of req
 */
app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})




/** DOC ROUTES */

/**
 * GET /test
 * Purpose: get all list
 */
 app.get('/users/:id/doc', (req, res) => {
    //return an array of the tests in the database
    Doc.find({_userId : req.params.id} /** no query fields */ ).then((docs) => {
        res.send(docs)
    }).catch((e) => {

    });
})

/**
 * POST /test
 * Purpose: create a test
 */
app.post('/users/:id/doc', (req, res) => {
    //create a new test and return the new test document back to the user (wich includes the id)
    //the list information (fields) will be passed in via the JSON request body
    let name = req.body.name; //for to do this. is require install and setup body-parser
    let specs = req.body.specs;
    let _userId = req.params.id;
    let newDoc = new Doc({
        name,
        specs,
        _userId
    });

    newDoc.save().then((docDoc) => {
        //the full document is returned
        res.send(docDoc);
    });
})

/**
 * PATCH /list/:id
 * Purpose: Update specified test
 */
app.patch('/test/:id', (req, res) => {
    //update the spcecified test with the new values specified in the JSON body of the request
    Test.findOneAndUpdate({
        _id: req.params.id
    }, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200);
    })
})

/**
 * DELETE /test/:id
 * Purpose: Delete specified test
 */
app.delete('/users/:id/doc/:docId', (req, res) => {
    //delete the specified test
    Doc.findOneAndRemove({
        _userId: req.params.id,
        _id: req.params.docId
    }).then((removedDocDoc) => {
        res.send(removedDocDoc);
    })
})


/** EXAM ROUTES */

/**
 * GET /test
 * Purpose: get all list
 */
 app.get('/users/:id/exam', (req, res) => {
    //return an array of the tests in the database
    Exam.find({_userId : req.params.id} /** no query fields */ ).then((exams) => {
        res.send(exams)
    }).catch((e) => {

    });
})

/**
 * POST /test
 * Purpose: create a test
 */
app.post('/users/:id/exam', (req, res) => {
    //create a new test and return the new test document back to the user (wich includes the id)
    //the list information (fields) will be passed in via the JSON request body
    let name = req.body.name; //for to do this. is require install and setup body-parser
    let price = req.body.price;
    let _userId = req.params.id;
    let newExam = new Exam({
        name,
        price,
        _userId
    });

    newExam.save().then((examDoc) => {
        //the full document is returned
        res.send(examDoc);
    });
})

/**
 * PATCH /list/:id
 * Purpose: Update specified test
 */
app.patch('/users/:id/exam/:examId', (req, res) => {
    //update the spcecified test with the new values specified in the JSON body of the request
    console.log(req.body);
    Exam.findOneAndUpdate({
        _userId: req.params.id,
        _id:req.params.examId
    }, {
        $set: req.body
    }).then(() => {
        res.send({status: 'Ok'});
    })
})

/**
 * DELETE /test/:id
 * Purpose: Delete specified test
 */
app.delete('/users/:id/exam/:examId', (req, res) => {
    //delete the specified test
    Exam.findOneAndRemove({
        _userId: req.params.id,
        _id: req.params.examId
    }).then((removedExamDoc) => {
        res.send(removedExamDoc);
    })
})




//start server on port 3000
app.listen(port, () => {
    console.log("Server is listening on port 3000\n");
})