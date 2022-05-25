const mongoose = require("mongoose");

const docSchema = new mongoose.Schema({
    name: {type:String, required:true, trim:true},
    specs: {type:String, required:true, trim:true},
    _userId: { type: mongoose.Types.ObjectId, required: true },
})

const Doc = mongoose.model('doc', docSchema);

module.exports = {
    Doc
}