var mongoose = require('mongoose');

mongoose.connect(process.env.DB);

// Region schema
const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true, index: { unique: true } },
    //aorList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AOR' }],
    //regionList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Region' }],
});

// return the model
module.exports = mongoose.model('Organization', OrganizationSchema);