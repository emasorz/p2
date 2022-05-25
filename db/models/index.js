//file for load all mongoose models in one 

const { Test } = require("./test.model");
const { User } = require("./user.model");
const { Doc } = require("./doc.model");
const { Exam } = require("./exam.model");

module.exports = {
    Test,
    User,
    Doc,
    Exam
}