var mongoose = require('mongoose');

mongoose.connect(process.env.DB);

// Region schema
const AORSchema = new mongoose.Schema({
    name: { type: String, required: true },
    regionList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Region' }],
    userList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
});

// return the model
module.exports = mongoose.model('AOR', AORSchema);