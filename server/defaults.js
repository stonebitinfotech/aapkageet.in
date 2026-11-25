// Default content used the first time the app starts. Everything here is editable from /admin.

const settings = {
  brandName: 'Aapka Geet',
  productName: 'Personalised Song – Aapki Kahani, Aapka Geet ❤️',
  tagline: 'Their name. Your memories. A real song -made just for them.',
  announcement: '⚡ Aaj order karo → 30 min mein gaana WhatsApp pe',
};

const faqs = [
  { q: '❤️ Mujhe kya details deni hongi?', a: 'Bas unke baare mein batao -aapka rishta, yaadein, inside jokes, special moments, ya jo bhi aap gaane mein chahte ho. Jitni zyada details, utna personal gaana.' },
  { q: '⏳ Delivery mein kitna time lagta hai?', a: 'Payment aur saari details milne ke baad gaana usually 30 minute mein deliver ho jaata hai. Agar koi detail galat ya adhoori ho (jaise galat WhatsApp number ya email), toh hamari team aapse contact karegi, aur sahi details milne ke baad gaana generally 24 ghante ke andar deliver hota hai. Peak time mein thoda zyada time lag sakta hai.' },
  { q: '📱 Gaana mujhe kaise milega?', a: 'Aapka personalised gaana WhatsApp aur/ya Email pe MP3 mein bheja jaata hai. Aap use save, share aur kabhi bhi play kar sakte ho.' },
  { q: '🎵 Kya gaane mein unka naam aayega?', a: 'Haan ❤️ -naam, nickname, yaadein aur special details sab gaane mein daale jaate hain.' },
  { q: '🌎 Kaun si languages available hain?', a: 'Hindi, English, Hinglish, Punjabi, Haryanvi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Bhojpuri aur bahut saari.' },
  { q: '💝 Kin occasions ke liye perfect hai?', a: 'Birthday, Anniversary, Proposal, Wedding, Parents, Best Friends, Long Distance, Karwa Chauth, Rakhi -ya bas aise hi, kyunki wo special hain.' },
  { q: '🤔 Agar mujhe samajh na aaye kya likhun?', a: 'Koi tension nahi. Jo bhi yaad hai wo likh do -hamari team usse ek khoobsurat gaane mein badal degi.' },
  { q: '🔒 Kya meri details private rahengi?', a: 'Bilkul. Aapki yaadein aur personal details sirf aapka gaana banane ke liye use hoti hain aur kisi ke saath share nahi ki jaati.' },
  { q: '💳 Kya Cash On Delivery available hai?', a: 'Nahi. Har gaana specially aapke liye banta hai, isliye abhi sirf prepaid orders (UPI, Cards, Netbanking) accept hote hain.' },
  { q: '🔄 Kya main changes request kar sakta/sakti hoon?', a: 'Haan. Agar koi important detail galat ho gayi hai, toh hamari support team aapki help karegi.' },
];

const policies = require('./policies');

// "One song. Every moment that matters." cards (images can be added from the dashboard)
const occasions = [
  { title: 'Birthday', text: "'Happy Birthday' wala message chhodo. Unhe unka apna gaana sunao.", cta: 'Surprise them', icon: 'cake', prefill: 'occasion=Birthday' },
  { title: 'Impress Your Crush', text: 'Bina kahe sab keh do -ek gaana jisme unka naam ho.', cta: 'Make them blush', icon: 'sparkles', prefill: 'occasion=Proposal' },
  { title: 'For Wife / Husband', text: 'Yaad dilao ki aaj bhi tum unhe hi chunoge.', cta: 'Win their heart again', icon: 'rings', prefill: 'occasion=Anniversary' },
  { title: 'For Girlfriend / Boyfriend', text: "Sabse pyaara 'I love you' jo unhone kabhi suna ho.", cta: 'Say it in a song', icon: 'heart', prefill: "occasion=Valentine's Day" },
  { title: 'For Mummy-Papa', text: 'Wo sab jo kabhi keh nahi paaye -ek gaane mein.', cta: 'Make them proud', icon: 'home', prefill: 'recipient=Mummy' },
  { title: 'Wedding & Sangeet', text: 'Entry, first dance ya sangeet -sirf aapka gaana.', cta: 'Plan the surprise', icon: 'rings', prefill: 'occasion=Wedding' },
];

const LANGUAGES = ['Hindi', 'English', 'Hinglish', 'Punjabi', 'Haryanvi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bhojpuri', 'Rajasthani', 'Odia', 'Urdu', 'Assamese'];
const STYLES = ['Romantic', 'Bollywood', 'Emotional / Sad', 'Sufi', 'Punjabi Pop', 'Rap / Hip-hop', 'Lo-fi', 'Acoustic', 'Party / Dance', 'Classical', 'Devotional'];

const fields = [
  // Step 1
  { key: 'recipient', label: 'Gaana kiske liye hai?', type: 'chips', step: 'Kiske liye?', required: true,
    options: ['Wife', 'Husband', 'Girlfriend', 'Boyfriend', 'Mummy', 'Papa', 'Best Friend', 'Bhai / Behen', 'Someone else'] },
  { key: 'occasion', label: 'Occasion', type: 'chips', step: 'Kiske liye?', required: true,
    options: ['Birthday', 'Anniversary', 'Proposal', 'Wedding', "Valentine's Day", 'Karwa Chauth', 'Rakhi', 'Sorry / Manana', 'Just because'] },
  { key: 'their_name', label: 'Unka naam (gaane mein aayega)', type: 'text', step: 'Kiske liye?', required: true,
    placeholder: 'e.g. Shivani', role: 'recipient_name', maxLength: 60 },
  { key: 'nickname', label: 'Pyaar ka naam / Nickname', type: 'text', step: 'Kiske liye?', placeholder: 'e.g. Shivu, Babu', maxLength: 60 },

  // Step 2
  { key: 'how_met', label: 'Aap kaise mile the?', type: 'textarea', step: 'Aapki kahani',
    placeholder: 'College mein, office mein, ek shaadi mein…' },
  { key: 'memories', label: 'Khaas yaadein', type: 'textarea', step: 'Aapki kahani', required: true,
    placeholder: 'First date, trips, wo din jab…', help: 'Jitni zyada details, utna personal gaana.' },
  { key: 'inside_jokes', label: 'Inside jokes / unki aadatein', type: 'textarea', step: 'Aapki kahani',
    placeholder: 'Wo cheez jo sirf aap dono samajhte ho 😄' },
  { key: 'message', label: 'Ek baat jo aap unse kehna chahte ho', type: 'textarea', step: 'Aapki kahani',
    placeholder: 'Thank you for always…' },

  // Step 3
  { key: 'language', label: 'Gaane ki language', type: 'select', step: 'Gaane ka vibe', required: true, options: LANGUAGES },
  { key: 'voice', label: 'Singer ki awaaz', type: 'radio', step: 'Gaane ka vibe', required: true, options: ['Male voice', 'Female voice'] },
  { key: 'style', label: 'Music style', type: 'chips', step: 'Gaane ka vibe', required: true, options: STYLES },

  // Step 4
  { key: 'customer_name', label: 'Aapka naam', type: 'text', step: 'Delivery details', required: true,
    placeholder: 'Your full name', role: 'customer_name', maxLength: 80 },
  { key: 'whatsapp', label: 'WhatsApp number (gaana yahan aayega)', type: 'tel', step: 'Delivery details', required: true,
    placeholder: '98765 43210', role: 'customer_phone' },
  { key: 'email', label: 'Email', type: 'email', step: 'Delivery details', required: true,
    placeholder: 'you@example.com', role: 'customer_email' },
];

module.exports = { settings, faqs, policies, fields, occasions };
