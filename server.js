var express    = require('express'); // use express
var bodyParser = require('body-parser');
var jwt        = require('jsonwebtoken'); // use JWT authentication
var passport   = require('passport');
var cors       = require('cors');
var authController    = require('./auth');
var authJwtController = require('./auth_jwt');

var mongoose = require('mongoose');
var User = require('./schemas/Users');
var Organization = require('./schemas/Organization');
var Region = require('./schemas/Region');
var AoR = require('./schemas/AOR');
const AOR = require('./schemas/AOR');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

var router = express.Router();

// create and get organizations
// only admin of app can register new orgs

router.route('/orgs')
    .get(authController.isAuthenticated, (req, res) => {
        Organization.find().exec((err, list) => {
            if(err) return res.send(err);
            else return res.status(200).json(list);
        });
    })
    .post(authController.isAuthenticated, function(req, res) {
        if(!req.body.name) {
            return res.status(400).json({success: false, msg: 'Please include a name for your organization.'});
        }
        else {
            var Org = new Organization();
            Org.name = req.body.name;
    
            Org.save(function(err){
                if (err) {
                    if (err.code == 11000)
                        return res.status(400).json({ success: false, message: 'An organization with that username already exists.'});
                    else
                        return res.status(400).json(err);
                }
                else return res.status(201).json({success: true, msg: `Successfully created new organization.`})
            });
        }
    })
    .all(authJwtController.isAuthenticated, function(req, res) {  // Any other HTTP Method
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

// user sign in and sign out

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({success: false, msg: 'Please include both username and password to signup.'})
    } 
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        user.role = req.body.role;

        try { // match required org ID with existing org in database
            var newOrgId = mongoose.Types.ObjectId(req.body.orgId);

            Organization.findOne({ _id: newOrgId }).exec((err, entry) => {
                if(entry == null) {
                    return res.status(400).json({success: false, msg: 'Specify a valid organization ID.'})
                }
                else {
                    user.orgId = newOrgId;
            
                    user.save(function(err){
                        if (err) {
                            if (err.code == 11000)
                                return res.status(400).json({ success: false, message: 'A user with that username already exists.'});
                            else
                                return res.status(400).json(err);
                        }
                        else return res.status(201).json({success: true, msg: `Successfully created new user.`})
                    });
                }
            });
        }
        catch(e) {
            return res.status(400).json({success: false, msg: e.message});
        }
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password role orgId').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '3h' });
                res.json ({success: true, token: 'JWT ' + token, username: user.username, role: user.role, orgId: user.orgId});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.route('/users').get(authJwtController.isAuthenticated, function (req, res) {
    var orgId = req.body.orgId;

    if(!orgId) {
        return res.status(400).json({success: false, message: 'Missing orgId from body.'});
    }
    else if(req.body.role !== 'Admin') {
        return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
    }
    else {
        
        try {
            User.find({orgId: mongoose.Types.ObjectId(orgId)}).exec(function(err, userList) {
                if(err) return res.status(400).json(err);
                else return res.status(200).json(userList);
            });
        }
        catch(e) {
            return res.status(400).json({success: false, message: e.message});
        }
    }
});

// regions and areas of responsibilities (AORs)

router.route('/regions') // TODO: put and delete routes for /regions
    .get(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else {
            try {
                Region.find({orgId: mongoose.Types.ObjectId(orgId)}).exec(function(err, regionList) {
                    if(err) return res.status(400).json(err);
                    else return res.status(200).json(regionList);
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .post(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else if(req.body.role !== 'Admin') {
            return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
        }
        else {
            try {
                var newRegion = Region();
                newRegion.name = req.body.name;
                newRegion.boundingBox = req.body.boundingBox;
                newRegion.orgId = mongoose.Types.ObjectId(orgId);

                //testing for malformed bounding box
                newRegion.boundingBox[0][0]; newRegion.boundingBox[0][1]; newRegion.boundingBox[1][0]; newRegion.boundingBox[1][1];

                newRegion.save(function(err) {
                    if(err) return res.status(400).json({success: false, ...err});
                    else return res.status(201).json({success: true, message: 'Region created.'});
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .all(authJwtController.isAuthenticated, function(req, res) {  // Any other HTTP Method
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

router.route('/regions/:regionId')
    .get(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else {
            try {
                Region.find({_id: mongoose.Types.ObjectId(req.params.regionId)}).exec(function(err, region) {
                    if(err) return res.status(400).json(err);
                    else if(region === null) return res.status(404).json({success: false, message: 'Region not found.'});
                    else return res.status(200).json(region);
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .put(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else if(req.body.role !== 'Admin') {
            return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
        }
        else {
            try {
                Region.findOne({
                    _id: mongoose.Types.ObjectId(req.params.regionId),
                    orgId: mongoose.Types.ObjectId(orgId),
                }).exec(function(err, region) {
                    if(region === null) return res.status(404).json({success: false, message: 'Region not found.'});
                    else {
                        region.name = req.body.name || region.name;
                        region.boundingBox = req.body.boundingBox || region.boundingBox;

                        Region.replaceOne({
                            _id: mongoose.Types.ObjectId(req.params.regionId),
                            orgId: mongoose.Types.ObjectId(orgId),
                        }, region)
                        .exec(function(err, result) {
                            if(err) return res.status(400).send({ success: false, ...err });
                            else return res.status(200).json({ success: true, message: "Region updated." });
                        });
                    }
                })
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .delete(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else if(req.body.role !== 'Admin') {
            return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
        }
        else {
            try {
                Region.deleteOne({ 
                    _id: mongoose.Types.ObjectId(req.params.regionId),
                    orgId: mongoose.Types.ObjectId(orgId),
                })
                .exec(function(err, result) {
                    if(err) return res.status(400).send(err);

                    else if(result.deletedCount == 0)
                        res.status(404).json({ success: false, message: "Region not found." });

                    else return res.status(200).json({ success: true, message: "Region deleted." });
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .all(authJwtController.isAuthenticated, function(req, res) {  // Any other HTTP Method
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

router.route('/AOR')
    .get(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else {
            try {
                AoR.aggregate([
                    {
                        $lookup: {
                            from: "regions",
                            localField: "regionList",
                            foreignField: "_id",
                            as: "regionList",
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userList",
                            foreignField: "_id",
                            as: "userList",
                        }
                    }
                ])
                .exec(function(err, result) {
                    if(err) return res.status(400).send(err);
                    else return res.status(200).json(result);
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .post(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else if(req.body.role !== 'Admin') {
            return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
        }
        else {
            try {
                var newAOR = new AoR();
                newAOR.name = req.body.name;
                newAOR.orgId = orgId;

                newAOR.save(function(err) {
                    if(err) return res.status(400).json({success: false, ...err});
                    else return res.status(201).json({success: true, message: 'AOR created.'});
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .all(authJwtController.isAuthenticated, function(req, res) {  // Any other HTTP Method
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

router.route('/AOR/:aorId')
    .get(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else {
            try {
                AoR.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(req.params.aorId),
                            orgId: mongoose.Types.ObjectId(orgId),
                        }
                    },
                    {
                        $lookup: {
                            from: "regions",
                            localField: "regionList",
                            foreignField: "_id",
                            as: "regionList",
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userList",
                            foreignField: "_id",
                            as: "userList",
                        }
                    }
                ])
                .exec(function(err, result) {
                    if(err) return res.status(400).send(err);
    
                    else if(result.length == 0) 
                        return res.status(404).send({success: false, message: `AOR not found.`});
                    
                    else return res.status(200).json(result);
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .put(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else if(req.body.role !== 'Admin') {
            return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
        }
        else {
            try {
                AoR.findOne({
                    _id: mongoose.Types.ObjectId(req.params.aorId),
                    orgId: mongoose.Types.ObjectId(orgId),
                }).exec(function(err, aor) {
                    if(aor === null) return res.status(404).json({success: false, message: 'AOR not found.'});
                    else {
                        aor.name       = req.body.name || aor.name;
                        aor.regionList = req.body.regionList || aor.regionList;
                        aor.userList   = req.body.userList || aor.userList;

                        AoR.replaceOne({
                            _id: mongoose.Types.ObjectId(req.params.aorId),
                            orgId: mongoose.Types.ObjectId(orgId),
                        }, aor)
                        .exec(function(err, result) {
                            if(err) return res.status(400).send({ success: false, ...err });
                            else return res.status(200).json({ success: true, message: "AOR updated." });
                        });
                    }
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .delete(authJwtController.isAuthenticated, function(req, res) {
        var orgId = req.body.orgId;

        if(!orgId) {
            return res.status(400).json({success: false, message: 'Missing orgId from body.'});
        }
        else if(req.body.role !== 'Admin') {
            return res.status(403).json({success: false, message: 'User must be admin to manage AORs.'});
        }
        else {
            try {
                AoR.deleteOne({ 
                    _id: mongoose.Types.ObjectId(req.params.aorId),
                    orgId: mongoose.Types.ObjectId(orgId),
                })
                .exec(function(err, result) {
                    if(err) return res.status(400).send(err);

                    else if(result.deletedCount == 0)
                        res.status(404).json({ message: "AOR not found." });

                    else return res.status(200).json({ message: "AOR deleted." });
                });
            }
            catch(e) {
                return res.status(400).json({success: false, message: e.message});
            }
        }
    })
    .all(authJwtController.isAuthenticated, function(req, res) {  // Any other HTTP Method
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only