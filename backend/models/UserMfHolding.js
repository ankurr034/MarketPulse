import mongoose from 'mongoose';

const UserMfHoldingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  schemeCode: {
    type: String,
    required: true
  },
  schemeName: {
    type: String,
    required: true
  },
  units: {
    type: Number,
    required: true,
    min: 0
  },
  avgBuyNav: {
    type: Number,
    required: true,
    min: 0
  },
  buyDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

const UserMfHolding = mongoose.model('UserMfHolding', UserMfHoldingSchema);

export default UserMfHolding;
