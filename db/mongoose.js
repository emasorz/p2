//this file will handle connection logic to mongoDB database

//load mongoose
const mongoose = require("mongoose");

/**
 * 4VAjbvTRhkrJWZUW
/////////////////////////////
mongoose.Promise = global.Promise;

mongoose.connect("mongodb://localhost:27017/test", { useNewUrlParser: true }).then(() => {
    console.log("Connected to MongoDB successfully: ");
}).catch((e) => {
    console.log("Error while attempting to connect to MongoDB")
    console.log(e);
})
 */
const uri = "mongodb+srv://emasorz:4VAjbvTRhkrJWZUW@cluster0.e10lm.mongodb.net/?retryWrites=true&w=majority";
mongoose.Promise = global.Promise;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("Connected to MongoDB successfully: ");
}).catch((e) => {
    console.log("Error while attempting to connect to MongoDB")
    console.log(e);
})

module.exports = {
    mongoose
}