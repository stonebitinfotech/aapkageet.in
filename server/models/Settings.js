const { Schema, model } = require('mongoose');
const defaults = require('../defaults');

// Sample song cards: title = big name ("Riya"), subtitle = "Hindi romantic · for his wife", tag = top pill ("For wife")
const SampleSchema = new Schema({ title: String, subtitle: String, tag: String, image: String, audio: String }, { _id: false });
// "One song. Every moment that matters." cards. prefill = e.g. "occasion=Birthday" (pre-selects the option in checkout)
const OccasionSchema = new Schema({ title: String, text: String, cta: String, image: String, icon: String, prefill: String }, { _id: false });
const ImageItemSchema = new Schema({ image: String, caption: String }, { _id: false });
const TestimonialSchema = new Schema({
  name: String, text: String, rating: { type: Number, default: 5 },
  date: String, // e.g. "7 Nov"
  source: { type: String, default: 'WhatsApp message' },
  verified: { type: Boolean, default: false },
}, { _id: false });
// Hero phone slides: photo or video + overlay text
const HeroSlideSchema = new Schema({ media: String, poster: String, name: String, forLabel: String, lyric: String }, { _id: false });
const FaqSchema = new Schema({ q: String, a: String }, { _id: false });

const SettingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: 'main' },

    // Look
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },

    // Brand
    brandName: { type: String, default: defaults.settings.brandName },
    businessName: { type: String, default: '' }, // legal name shown in footer
    tagline: { type: String, default: defaults.settings.tagline },
    logo: { type: String, default: '' },
    announcement: { type: String, default: defaults.settings.announcement },

    // Pricing (INR)
    price: { type: Number, default: 599 },
    comparePrice: { type: Number, default: 1499 },
    productName: { type: String, default: defaults.settings.productName },
    deliveryPromise: { type: String, default: '30 min' },
    statsText: { type: String, default: '' }, // e.g. "5,000+ stories turned into songs" (hidden when empty)

    // Contact
    supportEmail: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    supportHours: { type: String, default: 'Mon–Sat, 11:00 AM – 6:30 PM' },
    address: { type: String, default: '' }, // registered business address (policy pages + footer)
    jurisdiction: { type: String, default: '' }, // city for legal jurisdiction, e.g. "Ahmedabad, Gujarat"
    instagramHandle: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    instagramFollowers: { type: String, default: '' },

    // Media
    heroImage: { type: String, default: '' },
    heroVideo: { type: String, default: '' },
    heroSlides: { type: [HeroSlideSchema], default: [] },
    storyImage: { type: String, default: '' }, // "A song with their name & story in it" section
    samples: { type: [SampleSchema], default: [] },
    occasions: { type: [OccasionSchema], default: () => defaults.occasions },
    reactions: { type: [ImageItemSchema], default: [] },
    deliveryShots: { type: [ImageItemSchema], default: [] },
    testimonials: { type: [TestimonialSchema], default: [] },
    faqs: { type: [FaqSchema], default: () => defaults.faqs },

    // Policy pages (required by Razorpay for account activation)
    policies: {
      privacy: { type: String, default: defaults.policies.privacy },
      terms: { type: String, default: defaults.policies.terms },
      refund: { type: String, default: defaults.policies.refund },
      return: { type: String, default: defaults.policies.return },
      shipping: { type: String, default: defaults.policies.shipping },
      disclaimer: { type: String, default: defaults.policies.disclaimer },
      contact: { type: String, default: defaults.policies.contact },
    },
  },
  { timestamps: true }
);

SettingsSchema.statics.getMain = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) doc = await this.create({ key: 'main' });
  return doc;
};

module.exports = model('Settings', SettingsSchema);
