const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const qrcode = require('qrcode');
const geolib = require('geolib');
const crypto = require('crypto');
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in your .env file or environment variables.");
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

app.use('/uploads', express.static('uploads'));

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stamp-loyalty';

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profileImage: {
    type: String,
    default: 'default-profile.png'
  },
  preferences: {
    categories: [String],
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    pushToken: String
  },
  demographics: {
    birthYear: Number,
    gender: String,
    interests: [String]
  },
  favoriteBusinesses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Restaurant', 'Cafe', 'Retail', 'Beauty', 'Health', 'Entertainment', 'Other']
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0,0],
      required: false
    }
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String
  },
  logo: {
    type: String
  },
  description: String,
  businessHours: [
    {
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      open: String,
      close: String,
      closed: Boolean
    }
  ],
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

businessSchema.index({ location: '2dsphere' });

const Business = mongoose.model('Business', businessSchema);

const campaignSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  stampGoal: {
    type: Number,
    required: true,
    min: 1,
    default: 10
  },
  reward: {
    type: String,
    required: true
  },
  rewardValue: {
    type: Number
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  image: String,
  terms: String,
  locationRequired: {
    type: Boolean,
    default: false
  },
  proximityThreshold: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Campaign = mongoose.model('Campaign', campaignSchema);

const stampSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  redeemed: {
    type: Boolean,
    default: false
  },
  issuedLocation: {
    latitude: Number,
    longitude: Number
  },
  redeemedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Stamp = mongoose.model('Stamp', stampSchema);

const promotionSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: String,
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  code: String,
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'freeItem', 'other'],
    default: 'percentage'
  },
  discountValue: Number,
  targetAudience: {
    minStamps: Number,
    interests: [String],
    ageRange: {
      min: Number,
      max: Number
    },
    gender: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Promotion = mongoose.model('Promotion', promotionSchema);

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['promotion', 'stamp', 'reward', 'system'],
    default: 'system'
  },
  relatedData: {
    businessId: mongoose.Schema.Types.ObjectId,
    promotionId: mongoose.Schema.Types.ObjectId,
    campaignId: mongoose.Schema.Types.ObjectId
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

const analyticsSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  metrics: {
    stampsIssued: {
      type: Number,
      default: 0
    },
    stampsRedeemed: {
      type: Number,
      default: 0
    },
    newUsers: {
      type: Number,
      default: 0
    },
    totalVisits: {
      type: Number,
      default: 0
    },
    uniqueVisits: {
      type: Number,
      default: 0
    },
    promotionViews: {
      type: Number,
      default: 0
    },
    promotionRedemptions: {
      type: Number,
      default: 0
    },
    rewardsRedeemed: {
      type: Number,
      default: 0
    }
  }
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication required' });
  }
};

const businessAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      throw new Error('API key is required');
    }

    const business = await Business.findOne({ apiKey });

    if (!business) {
      throw new Error('Invalid API key');
    }

    req.business = business;
    next();
  } catch (error) {
    res.status(401).json({ message: error.message || 'Authentication required' });
  }
};

const businessOwnerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    
    const businessId = req.params.businessId || req.body.businessId;
    console.log("ide baka");
    console.log(businessId);
    if (!businessId) {
      throw new Error('Business ID is required');
    }
    
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    if (business.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: You do not own this business' });
    }

    req.user = user;
    req.business = business;
    next();
  } catch (error) {
    res.status(401).json({ message: error.message || 'Authentication required' });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const updateAnalytics = async (businessId, metricsToUpdate) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({
      business: businessId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!analytics) {
      analytics = new Analytics({
        business: businessId,
        date: today
      });
    }

    Object.keys(metricsToUpdate).forEach(key => {
      if (analytics.metrics[key] !== undefined) {
        analytics.metrics[key] += metricsToUpdate[key];
      }
    });

    await analytics.save();
    return analytics;
  } catch (error) {
    console.error('Analytics update error:', error);
  }
};

const isWithinProximity = (userLocation, businessLocation, threshold) => {
  if (!userLocation || !businessLocation) return false;

  const distanceInMeters = geolib.getDistance(
    { latitude: userLocation.latitude, longitude: userLocation.longitude },
    { latitude: businessLocation.coordinates[1], longitude: businessLocation.coordinates[0] }
  );

  return distanceInMeters <= threshold;
};

const generateQRCode = async (data) => {
  try {
    const qrCodeString = await qrcode.toDataURL(JSON.stringify(data));
    return qrCodeString;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw error;
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({
      name,
      email,
      password
    });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('favoriteBusinesses', 'name logo category');

    if (user) {
      // Check if user owns any businesses
      const ownedBusinesses = await Business.find({ owner: user._id });
      const isBusinessOwner = ownedBusinesses.length > 0;

      res.json({
        ...user.toObject(),
        isBusinessOwner
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.name = req.body.name || user.name;
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = req.body.email;
    }
    if (req.body.password) {
      user.password = req.body.password;
    }
    if (req.body.preferences) {
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences
      };
    }
    if (req.body.demographics) {
      user.demographics = {
        ...user.demographics,
        ...req.body.demographics
      };
    }
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      preferences: updatedUser.preferences,
      demographics: updatedUser.demographics
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.profileImage = req.file.path;
    await user.save();
    res.json({
      message: 'Profile image uploaded successfully',
      profileImage: user.profileImage
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const toggleFavoriteBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ message: 'Business ID is required' });
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    const user = await User.findById(req.user._id);
    const favoriteIndex = user.favoriteBusinesses.findIndex(
      id => id.toString() === businessId
    );
    if (favoriteIndex === -1) {
      user.favoriteBusinesses.push(businessId);
    } else {
      user.favoriteBusinesses.splice(favoriteIndex, 1);
    }
    await user.save();
    res.json({
      message: favoriteIndex === -1 ? 'Business added to favorites' : 'Business removed from favorites',
      favoriteBusinesses: user.favoriteBusinesses
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const registerBusiness = async (req, res) => {
  try {
    const {
      name,
      category,
      address,
      stampsRequired,
      coordinates
    } = req.body;

    if (!name || !category || !address || !stampsRequired) {
      return res.status(400).json({ message: 'Missing required business fields: name, category, address, or stampsRequired.' });
    }
    if (isNaN(parseInt(stampsRequired)) || parseInt(stampsRequired) <= 0) {
      return res.status(400).json({ message: 'Stamps required must be a positive number.' });
    }

    const apiKey = crypto.randomBytes(16).toString('hex');
    const businessData = {
      name,
      category,
      address: address,
      location: {
        type: 'Point',
        coordinates: coordinates || [0, 0]
      },
      apiKey,
      owner: req.user._id,
    };

    const business = await Business.create(businessData);
    const defaultCampaign = await Campaign.create({
      business: business._id,
      name: `Loyalty Program - ${business.name}`,
      description: `Collect ${stampsRequired} stamps to earn a reward!`,
      stampGoal: parseInt(stampsRequired),
      reward: "Default Reward (e.g., 1 Free Item)",
      isActive: true,
    });

    res.status(201).json({
      _id: business._id,
      name: business.name,
      apiKey: business.apiKey,
      message: `Business '${business.name}' registered successfully with a default loyalty campaign.`,
      defaultCampaign: {
        _id: defaultCampaign._id,
        name: defaultCampaign.name,
        stampGoal: defaultCampaign.stampGoal
      }
    });

  } catch (error) {
    console.error("Error in registerBusiness:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: 'Server error during business registration.', error: error.message });
  }
};

const uploadBusinessLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const business = await Business.findById(req.params.businessId);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    business.logo = req.file.path;
    await business.save();
    res.json({
      message: 'Logo uploaded successfully',
      logo: business.logo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const business = req.business;
    const fieldsToUpdate = [
      'name', 'category', 'address', 'contactInfo',
      'description', 'businessHours'
    ];
    fieldsToUpdate.forEach(field => {
      if (req.body[field]) {
        business[field] = req.body[field];
      }
    });
    if (req.body.coordinates) {
      business.location.coordinates = req.body.coordinates;
    }
    const updatedBusiness = await business.save();
    res.json({
      _id: updatedBusiness._id,
      name: updatedBusiness.name,
      message: 'Business updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getNearbyBusinesses = async (req, res) => {
  try {
    const { latitude, longitude, distance = 5000, category } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(distance)
        }
      }
    };
    if (category) {
      query.category = category;
    }
    const businesses = await Business.find(query)
      .select('name logo category address location description');
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return res.status(404).json({ message: 'No business found for this user' });
    }

    const campaigns = await Campaign.find({
      business: business._id,
      isActive: true
    });

    const promotions = await Promotion.find({
      business: business._id,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    res.json({
      business,
      campaigns,
      promotions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBusinessDetails = async (req, res) => {
  try {
    console.log("ideeee");
    
    const business = await Business.findById(req.params.businessId)
      .select('-apiKey');
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    const campaigns = await Campaign.find({
      business: business._id,
      isActive: true
    });
    const promotions = await Promotion.find({
      business: business._id,
      isActive: true,
      endDate: { $gte: new Date() }
    });
    res.json({
      business,
      campaigns,
      promotions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      stampGoal,
      reward,
      rewardValue,
      endDate,
      locationRequired,
      proximityThreshold,
      terms
    } = req.body;
    const business = req.business;
    const campaign = await Campaign.create({
      business: business._id,
      name,
      description,
      stampGoal: stampGoal || 10,
      reward,
      rewardValue,
      endDate,
      locationRequired: locationRequired || false,
      proximityThreshold: proximityThreshold || 100,
      terms
    });
    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const uploadCampaignImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    const business = await Business.findById(campaign.business);
    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    campaign.image = req.file.path;
    await campaign.save();
    res.json({
      message: 'Campaign image uploaded successfully',
      image: campaign.image
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    const business = await Business.findById(campaign.business);
    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const fieldsToUpdate = [
      'name', 'description', 'stampGoal', 'reward', 'rewardValue',
      'endDate', 'isActive', 'locationRequired', 'proximityThreshold', 'terms'
    ];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });
    const updatedCampaign = await campaign.save();
    res.json({
      message: 'Campaign updated successfully',
      campaign: updatedCampaign
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserCampaigns = async (req, res) => {
  try {
    const userStamps = await Stamp.find({
      user: req.user._id,
      redeemed: false
    })
      .populate({
        path: 'campaign',
        select: 'name description stampGoal reward image business',
        populate: {
          path: 'business',
          select: 'name logo category'
        }
      });
    const campaignsMap = new Map();
    userStamps.forEach(stamp => {
      if (!stamp.campaign || !stamp.campaign._id) return;
      const campaignId = stamp.campaign._id.toString();
      if (!campaignsMap.has(campaignId)) {
        campaignsMap.set(campaignId, {
          campaign: stamp.campaign,
          stampCount: 1
        });
      } else {
        campaignsMap.get(campaignId).stampCount += 1;
      }
    });
    const userCampaigns = Array.from(campaignsMap.values());
    res.json(userCampaigns);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addStamp = async (req, res) => {
  try {
    const { userId, campaignId, location } = req.body;
    if (!userId || !campaignId) {
      return res.status(400).json({ message: 'User ID and Campaign ID are required' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (!campaign.isActive) {
      return res.status(400).json({ message: 'This campaign is no longer active' });
    }
    if (campaign.locationRequired && location) {
      const business = await Business.findById(req.business._id);
      const isNearby = isWithinProximity(
        location,
        business.location,
        campaign.proximityThreshold
      );
      if (!isNearby) {
        return res.status(400).json({
          message: 'You must be at the business location to receive a stamp'
        });
      }
    }
    const stamp = await Stamp.create({
      user: userId,
      business: req.business._id,
      campaign: campaignId,
      issuedLocation: location
    });
    updateAnalytics(req.business._id, { stampsIssued: 1 });
    const stampCount = await Stamp.countDocuments({
      user: userId,
      campaign: campaignId,
      redeemed: false
    });
    let rewardEarned = false;
    if (stampCount >= campaign.stampGoal) {
      rewardEarned = true;
      await Notification.create({
        user: userId,
        title: 'Reward Earned!',
        message: `You've earned: ${campaign.reward} at ${req.business.name}`,
        type: 'reward',
        relatedData: {
          businessId: req.business._id,
          campaignId: campaign._id
        }
      });
    }
    res.json({
      message: 'Stamp added successfully',
      stamp,
      stampCount,
      rewardEarned
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getStampsByUser = async (req, res) => {
  try {
    const stamps = await Stamp.find({ user: req.user._id })
      .populate({
        path: 'business',
        select: 'name logo category'
      })
      .populate({
        path: 'campaign',
        select: 'name stampGoal reward'
      })
      .sort({ createdAt: -1 });
    res.json(stamps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const redeemReward = async (req, res) => {
  try {
    const { campaignId, location } = req.body;
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    const stampCount = await Stamp.countDocuments({
      user: req.user._id,
      campaign: campaignId,
      redeemed: false
    });
    if (stampCount < campaign.stampGoal) {
      return res.status(400).json({
        message: `Not enough stamps. You need ${campaign.stampGoal} stamps to redeem this reward.`
      });
    }
    if (campaign.locationRequired && location) {
      const business = await Business.findById(campaign.business);
      const isNearby = isWithinProximity(
        location,
        business.location,
        campaign.proximityThreshold
      );
      if (!isNearby) {
        return res.status(400).json({
          message: 'You must be at the business location to redeem this reward'
        });
      }
    }
    const stamps = await Stamp.find({
      user: req.user._id,
      campaign: campaignId,
      redeemed: false
    }).limit(campaign.stampGoal);
    const stampIds = stamps.map(stamp => stamp._id);
    await Stamp.updateMany(
      { _id: { $in: stampIds } },
      { redeemed: true }
    );
    updateAnalytics(campaign.business, { stampsRedeemed: campaign.stampGoal });
    const redemptionData = {
      userId: req.user._id,
      businessId: campaign.business,
      campaignId: campaign._id,
      reward: campaign.reward,
      redeemedAt: new Date()
    };
    const qrCode = await generateQRCode(redemptionData);
    res.json({
      message: 'Reward redeemed successfully',
      reward: campaign.reward,
      qrCode
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPromotion = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      code,
      discountType,
      discountValue,
      targetAudience
    } = req.body;
    const business = req.business;
    const promotion = await Promotion.create({
      business: business._id,
      title,
      description,
      startDate,
      endDate,
      code,
      discountType,
      discountValue,
      targetAudience
    });
    if (targetAudience) {
      let userQuery = {};
      if (targetAudience.interests && targetAudience.interests.length > 0) {
        userQuery['demographics.interests'] = { $in: targetAudience.interests };
      }
      if (targetAudience.gender) {
        userQuery['demographics.gender'] = targetAudience.gender;
      }
      if (targetAudience.ageRange && (targetAudience.ageRange.min || targetAudience.ageRange.max)) {
        userQuery['demographics.birthYear'] = {};
        const currentYear = new Date().getFullYear();
        if (targetAudience.ageRange.min) {
          userQuery['demographics.birthYear'].$lte = currentYear - targetAudience.ageRange.min;
        }
        if (targetAudience.ageRange.max) {
          userQuery['demographics.birthYear'].$gte = currentYear - targetAudience.ageRange.max;
        }
      }
      userQuery['preferences.notificationsEnabled'] = true;
      const targetedUsers = await User.find(userQuery);
      const notifications = targetedUsers.map(user => ({
        user: user._id,
        title: 'New Promotion!',
        message: `${business.name}: ${title}`,
        type: 'promotion',
        relatedData: {
          businessId: business._id,
          promotionId: promotion._id
        }
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }
    res.status(201).json({
      message: 'Promotion created successfully',
      promotion
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const uploadPromotionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const promotion = await Promotion.findById(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    const business = await Business.findById(promotion.business);
    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    promotion.image = req.file.path;
    await promotion.save();
    res.json({
      message: 'Promotion image uploaded successfully',
      image: promotion.image
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserPromotions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const query = {
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    };
    if (user.favoriteBusinesses && user.favoriteBusinesses.length > 0) {
      query.business = { $in: user.favoriteBusinesses };
    }
    const promotions = await Promotion.find(query)
      .populate('business', 'name logo category');
    const relevantPromotions = promotions.filter(promo => {
      if (!promo.targetAudience) return true;
      if (promo.targetAudience.interests && promo.targetAudience.interests.length > 0) {
        if (!user.demographics || !user.demographics.interests) {
          return false;
        }
        const hasMatchingInterest = user.demographics.interests.some(interest =>
          promo.targetAudience.interests.includes(interest)
        );
        if (!hasMatchingInterest) return false;
      }
      if (promo.targetAudience.gender && user.demographics) {
        if (user.demographics.gender !== promo.targetAudience.gender) {
          return false;
        }
      }
      if (promo.targetAudience.ageRange && user.demographics && user.demographics.birthYear) {
        const userAge = new Date().getFullYear() - user.demographics.birthYear;
        if (promo.targetAudience.ageRange.min && userAge < promo.targetAudience.ageRange.min) {
          return false;
        }
        if (promo.targetAudience.ageRange.max && userAge > promo.targetAudience.ageRange.max) {
          return false;
        }
      }
      return true;
    });
    res.json(relevantPromotions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    notification.read = true;
    await notification.save();
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBusinessAnalytics = async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { timeRange } = req.query;
    const today = new Date();
    let startDate;
    switch (timeRange) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
    }
    const analyticsData = await Analytics.find({
      business: business._id,
      date: { $gte: startDate, $lte: today }
    }).sort({ date: 1 });
    const campaigns = await Campaign.find({ business: business._id });
    const campaignStats = await Promise.all(
      campaigns.map(async campaign => {
        const stampsIssued = await Stamp.countDocuments({
          campaign: campaign._id
        });
        const stampsRedeemed = await Stamp.countDocuments({
          campaign: campaign._id,
          redeemed: true
        });
        const uniqueUsers = await Stamp.distinct('user', {
          campaign: campaign._id
        }).then(users => users.length);
        return {
          campaignId: campaign._id,
          name: campaign.name,
          stampsIssued,
          stampsRedeemed,
          uniqueUsers,
          conversionRate: stampsIssued > 0 ? (stampsRedeemed / stampsIssued) * 100 : 0
        };
      })
    );
    const promotions = await Promotion.find({ business: business._id });
    const promotionStats = await Promise.all(
      promotions.map(async promotion => {
        const notificationsSent = await Notification.countDocuments({
          'relatedData.promotionId': promotion._id
        });
        return {
          promotionId: promotion._id,
          title: promotion.title,
          notificationsSent,
          startDate: promotion.startDate,
          endDate: promotion.endDate,
          isActive: promotion.isActive
        };
      })
    );
    res.json({
      dailyMetrics: analyticsData,
      campaignStats,
      promotionStats,
      summaryMetrics: {
        totalStampsIssued: analyticsData.reduce((sum, day) => sum + day.metrics.stampsIssued, 0),
        totalStampsRedeemed: analyticsData.reduce((sum, day) => sum + day.metrics.stampsRedeemed, 0),
        totalUniqueVisits: analyticsData.reduce((sum, day) => sum + day.metrics.uniqueVisits, 0),
        conversionRate: analyticsData.reduce((sum, day) => sum + day.metrics.stampsIssued, 0) > 0 ?
          (analyticsData.reduce((sum, day) => sum + day.metrics.stampsRedeemed, 0) /
            analyticsData.reduce((sum, day) => sum + day.metrics.stampsIssued, 0)) * 100 : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const generateStampQRCode = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Ensure req.user is populated by 'auth' middleware (as you fixed earlier)
    const business = await Business.findById(campaign.business);
    if (!business || business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied or business associated with campaign not found.' });
    }

    // Data to be embedded in the QR code - KEEP THIS MINIMAL
    const qrDataToEncode = {
      type: 'stamp',                 // Identifies the QR code's purpose
      cid: campaign._id.toString(),  // campaignId (using a shorter key 'cid')
      bid: business._id.toString(),  // businessId (using a shorter key 'bid')
      // ts: Date.now(),             // Optional: timestamp for potential future use (e.g. short-lived QRs)
                                     // but adds to data size.
    };

    // Convert the minimal data object to a JSON string
    const qrValueString = JSON.stringify(qrDataToEncode);

    res.json({
      qrValue: qrValueString, // This is the string the frontend <QRCode> component needs
      // Optionally, send human-readable data if needed for display on the business screen
      campaignNameForDisplay: campaign.name,
      businessNameForDisplay: business.name,
    });

  } catch (error) {
    console.error("Error in backend generateStampQRCode:", error);
    res.status(500).json({ message: 'Server error generating QR code data', error: error.message });
  }
};

const verifyQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }
    let data;
    try {
      data = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }
    if (!data.type || !data.businessId || !data.campaignId) {
      return res.status(400).json({ message: 'Invalid QR code data' });
    }
    const business = await Business.findById(data.businessId);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    const campaign = await Campaign.findById(data.campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json({
      valid: true,
      data: {
        type: data.type,
        business: {
          id: business._id,
          name: business.name
        },
        campaign: {
          id: campaign._id,
          name: campaign.name
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserLoyaltyCards = async (req, res) => {
  try {
    const userStamps = await Stamp.find({
      user: req.user._id,
      redeemed: false
    })
    .populate({
      path: 'campaign',
      select: 'name description stampGoal reward image business isActive endDate',
      populate: {
        path: 'business',
        select: 'name logo category _id'
      }
    })
    .sort({ createdAt: -1 });

    const campaignsMap = new Map();
    userStamps.forEach(stamp => {
      if (!stamp.campaign || !stamp.campaign._id || !stamp.campaign.business || !stamp.campaign.business._id) {
        return;
      }
      if (!stamp.campaign.isActive || (stamp.campaign.endDate && new Date(stamp.campaign.endDate) < new Date())) {
         return;
      }
      const campaignId = stamp.campaign._id.toString();
      if (!campaignsMap.has(campaignId)) {
        campaignsMap.set(campaignId, {
          populatedCampaign: stamp.campaign,
          currentUserStampCount: 1
        });
      } else {
        campaignsMap.get(campaignId).currentUserStampCount += 1;
      }
    });

    const loyaltyCards = Array.from(campaignsMap.values()).map(item => {
      const businessDetails = item.populatedCampaign.business;
      const campaignDetails = {
        _id: item.populatedCampaign._id,
        name: item.populatedCampaign.name,
        description: item.populatedCampaign.description,
        stampGoal: item.populatedCampaign.stampGoal,
        reward: item.populatedCampaign.reward,
        image: item.populatedCampaign.image,
      };
      return {
        business: {
          _id: businessDetails._id,
          name: businessDetails.name,
          logo: businessDetails.logo,
          category: businessDetails.category
        },
        campaign: campaignDetails,
        currentUserStampCount: item.currentUserStampCount
      };
    });
    res.json(loyaltyCards);
  } catch (error) {
    console.error('Error fetching user loyalty cards:', error);
    res.status(500).json({ message: 'Server error while fetching loyalty cards.', error: error.message });
  }
};

const getActiveCampaigns = async (req, res) => {
  try {
    const userId = req.user._id;
    const allActiveCampaigns = await Campaign.find({
      isActive: true,
    })
    .populate('business', 'name _id category')
    .select('name description stampGoal reward business image terms')
    .lean();

    if (!allActiveCampaigns.length) {
        return res.json([]);
    }

    const userStamps = await Stamp.find({ user: userId, redeemed: false }).select('campaign').lean();
    const joinedCampaignIds = new Set(userStamps.map(stamp => stamp.campaign.toString()));

    const discoverableCampaigns = allActiveCampaigns.filter(
      campaign => !joinedCampaignIds.has(campaign._id.toString())
    );
    res.json(discoverableCampaigns);
  } catch (error) {
    console.error("Error fetching active campaigns:", error);
    res.status(500).json({ message: "Server error fetching active campaigns." });
  }
};

const joinCampaign = async (req, res) => {
  const { campaignId } = req.body;
  const userId = req.user._id;

  if (!campaignId) {
    return res.status(400).json({ message: "Campaign ID is required." });
  }

  try {
    const campaignToJoin = await Campaign.findOne({ _id: campaignId, isActive: true });
    if (!campaignToJoin) {
      return res.status(404).json({ message: "Campaign not found or is not active." });
    }

    const existingStamp = await Stamp.findOne({
      user: userId,
      campaign: campaignId,
      redeemed: false
    });

    if (existingStamp) {
      return res.status(400).json({ message: "You are already participating in this campaign." });
    }

    const newStamp = await Stamp.create({
      user: userId,
      business: campaignToJoin.business,
      campaign: campaignId,
    });

    res.status(201).json({
      message: `Successfully joined the campaign: ${campaignToJoin.name}!`,
      stampId: newStamp._id,
      campaignId: campaignToJoin._id,
      businessId: campaignToJoin.business
    });

  } catch (error) {
    console.error("Error joining campaign:", error);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
         return res.status(400).json({ message: "Invalid Campaign ID or data.", errors: error.errors });
    }
    res.status(500).json({ message: "Server error while joining campaign." });
  }
};

const collectStampByScan = async (req, res) => {
  const userId = req.user._id;
  const { campaignId, businessIdFromQR } = req.body;

  if (!campaignId || !businessIdFromQR) {
    return res.status(400).json({ message: "Campaign ID and Business ID from QR are required." });
  }

  try {
    const campaign = await Campaign.findById(campaignId).populate('business', '_id name');
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found." });
    }
    if (!campaign.isActive) {
      return res.status(400).json({ message: "This campaign is no longer active." });
    }
    if (campaign.business._id.toString() !== businessIdFromQR) {
      console.warn(`Business ID mismatch from QR. QR: ${businessIdFromQR}, Campaign's Business: ${campaign.business._id.toString()}`);
      return res.status(400).json({ message: "Campaign and Business information mismatch. Invalid QR Code." });
    }

    // Create the new stamp
    const newStamp = await Stamp.create({
      user: userId,
      business: campaign.business._id,
      campaign: campaignId,
    });

    // Update analytics for stamp issuance
    if (campaign.business && campaign.business._id) {
      await updateAnalytics(campaign.business._id, { stampsIssued: 1 });
    }

    // Get current unredeemed stamps count
    const currentStampsForCampaign = await Stamp.countDocuments({
      user: userId,
      campaign: campaignId,
      redeemed: false
    });

    let rewardJustRedeemed = false;
    let currentUserStampCount = currentStampsForCampaign;

    // Check if this scan completes a reward cycle
    if (currentStampsForCampaign >= campaign.stampGoal) {
      rewardJustRedeemed = true;

      // Find the oldest unredeemed stamps to redeem (including the one we just created)
      const stampsToRedeem = await Stamp.find({
        user: userId,
        campaign: campaignId,
        redeemed: false
      })
      .sort({ createdAt: 1 })
      .limit(campaign.stampGoal);

      // Mark these stamps as redeemed
      const stampIds = stampsToRedeem.map(stamp => stamp._id);
      await Stamp.updateMany(
        { _id: { $in: stampIds } },
        { 
          redeemed: true,
          redeemedAt: new Date()
        }
      );

      // Create a new stamp to start the next cycle
      await Stamp.create({
        user: userId,
        business: campaign.business._id,
        campaign: campaignId,
      });

      // Update analytics for reward redemption
      await updateAnalytics(campaign.business._id, { 
        stampsRedeemed: campaign.stampGoal,
        rewardsRedeemed: 1 
      });

      // Create notification for reward earned
      await Notification.create({
        user: userId,
        title: '🎉 Reward Unlocked! 🎉',
        message: `Congratulations! You've earned: ${campaign.reward} at ${campaign.business.name}!`,
        type: 'reward',
        relatedData: {
          businessId: campaign.business._id,
          campaignId: campaign._id
        }
      });

      // Set stamp count to 1 for the new cycle
      currentUserStampCount = 1;
    }

    res.status(201).json({
      message: rewardJustRedeemed 
        ? "Congratulations! Reward redeemed and new card started!" 
        : "Stamp collected successfully!",
      currentUserStampCount,
      stampGoal: campaign.stampGoal,
      rewardName: campaign.reward,
      rewardJustRedeemed,
      campaignName: campaign.name,
      businessName: campaign.business.name
    });

  } catch (error) {
    console.error("Error collecting stamp by scan:", error);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid data provided.", errors: error.errors });
    }
    res.status(500).json({ message: "Server error while collecting stamp." });
  }
};

app.post('/api/users/register', registerUser);
app.post('/api/users/login', loginUser);
app.get('/api/users/profile', auth, getUserProfile);
app.put('/api/users/profile', auth, updateUserProfile);
app.post('/api/users/profile/image', auth, upload.single('image'), uploadProfileImage);
app.post('/api/users/favorites', auth, toggleFavoriteBusiness);
app.get('/api/users/notifications', auth, getUserNotifications);
app.put('/api/users/notifications/:notificationId', auth, markNotificationAsRead);
app.get('/api/users/stamps', auth, getStampsByUser);
app.get('/api/users/me/loyalty-cards', auth, getUserLoyaltyCards);
app.get('/api/users/promotions', auth, getUserPromotions);
app.post('/api/users/redeem', auth, redeemReward);
app.post('/api/users/me/join-campaign', auth, joinCampaign);
app.post('/api/users/me/stamps/collect-by-scan', auth, collectStampByScan);

app.post('/api/businesses/register', auth, registerBusiness);
app.put('/api/businesses/:businessId', businessOwnerAuth, updateBusiness);
app.post('/api/businesses/:businessId/logo', businessOwnerAuth, upload.single('logo'), uploadBusinessLogo);
app.get('/api/businesses/nearby', getNearbyBusinesses);
app.get('/api/businesses/me', auth, getMyBusiness);
app.get('/api/businesses/:businessId', getBusinessDetails);
app.get('/api/businesses/:businessId/analytics', businessOwnerAuth, getBusinessAnalytics);

app.post('/api/campaigns', businessOwnerAuth, createCampaign);
app.put('/api/campaigns/:campaignId', businessOwnerAuth, updateCampaign);
app.post('/api/campaigns/:campaignId/image', businessOwnerAuth, upload.single('image'), uploadCampaignImage);
app.get('/api/campaigns/:campaignId/qrcode', auth, generateStampQRCode);
app.get('/api/campaigns/active', auth, getActiveCampaigns);

app.post('/api/promotions', businessOwnerAuth, createPromotion);
app.post('/api/promotions/:promotionId/image', businessOwnerAuth, upload.single('image'), uploadPromotionImage);

app.post('/api/stamps', businessAuth, addStamp);
app.post('/api/stamps/verify', verifyQRCode);

app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? error.message : {}
  });
});

module.exports = app;