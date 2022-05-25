const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
    name: {type:String, required:true, trim:true},
    price: {type:String, required:true, trim:true},
    _userId: { type: mongoose.Types.ObjectId, required: true },
})

const Exam = mongoose.model('exam', examSchema);

module.exports = {
    Exam
}