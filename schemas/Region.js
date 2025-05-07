var mongoose = require('mongoose');

mongoose.connect(process.env.DB);

// Region schema
const RegionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    boundingBox: [[]],
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
});

// return the model
module.exports = mongoose.model('Region', RegionSchema);