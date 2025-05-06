var mongoose = require('mongoose');

mongoose.connect(process.env.DB);

// Region schema
const RegionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    boundingBox: [[]],
});

// return the model
module.exports = mongoose.model('Region', RegionSchema);