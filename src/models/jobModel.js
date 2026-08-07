const mongoose = require('mongoose');
const jobSchema = new mongoose.Schema({
  jobId: {type: String, required: true, unique: true, index: true},
  title: {type: String, required: true},
  description: {type: String, required: true},
  customerId: {type: String, required: true},
  price: {type: Number, required: true},
  currency: {type: String, default: 'EUR'},
  category: {type: String, enum: ['gardening','cleaning','maintenance','delivery','other'], default: 'other'},
  location: {lat: Number, lng: Number, address: String},
  status: {type: String, enum: ['published','accepted','in_progress','completed','cancelled','expired'], default: 'published'},
  robotId: {type: String, default: null},
  acceptedAt: {type: Date, default: null},
  completedAt: {type: Date, default: null},
  rating: {type: Number, default: null},
  review: {type: String, default: null},
  createdAt: {type: Date, default: Date.now},
  expiresAt: {type: Date, default: null}
});
jobSchema.statics.findAvailable = function(lat, lng, maxDist) {
  const q = this.find({status: 'published'});
  if (lat && lng && maxDist) {
    return q.where('location.lat').gte(lat-maxDist).lte(lat+maxDist).where('location.lng').gte(lng-maxDist).lte(lng+maxDist);
  }
  return q.sort({createdAt: -1});
};
module.exports = mongoose.model('Job', jobSchema);
