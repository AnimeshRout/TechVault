// RETURN MODEL
import mongoose from 'mongoose';

const ReturnSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Return reason is required'],
      enum: [
        'defective',
        'wrong-item',
        'not-as-described',
        'changed-mind',
        'too-late',
        'other',
      ],
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        title: String,
        quantity: { type: Number, min: 1 },
        unitPrice: Number,
      },
    ],
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'refunded'],
      default: 'requested',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stripeRefundId: {
      type: String,
      default: '',
    },
    adminNote: {
      type: String,
      default: '',
      maxlength: 500,
    },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

ReturnSchema.index({ order: 1 });
ReturnSchema.index({ user: 1, createdAt: -1 });
ReturnSchema.index({ status: 1 });

const Return = mongoose.models.Return || mongoose.model('Return', ReturnSchema);
export default Return;
