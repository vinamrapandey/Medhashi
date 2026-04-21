/* ============================================
   AS WEDDING — i18n (Internationalization)
   All text strings in EN + HI
   ============================================ */

const STRINGS = {
  // ---- Screen 0: Language Select ----
  langSelectEn: 'Please select your language',
  langSelectHi: 'कृपया अपनी भाषा चुनें',
  langEnglish: 'English',
  langHindi: 'हिन्दी',

  // ---- Screen 1: Phone Entry ----
  phoneHeading: {
    en: "You're Invited",
    hi: 'आपको आमंत्रित किया गया है'
  },
  phoneSubtext: {
    en: 'Please enter your phone number to continue',
    hi: 'जारी रखने के लिए कृपया अपना फ़ोन नंबर दर्ज करें'
  },
  phonePlaceholder: {
    en: '10-digit phone number',
    hi: '10 अंकों का फ़ोन नंबर'
  },
  phoneContinue: {
    en: 'Continue',
    hi: 'जारी रखें'
  },
  phoneErrorNotFound: {
    en: "This number isn't on our guest list. Please contact the family.",
    hi: 'यह नंबर हमारी अतिथि सूची में नहीं है। कृपया परिवार से संपर्क करें।'
  },
  phoneErrorInvalid: {
    en: 'Please enter a valid 10-digit phone number',
    hi: 'कृपया 10 अंकों का मान्य फ़ोन नंबर दर्ज करें'
  },
  phoneErrorGeneric: {
    en: 'Something went wrong. Please try again.',
    hi: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।'
  },
  phoneWelcome: {
    en: (name) => `Welcome, ${name}! 🌸`,
    hi: (name) => `स्वागत है, ${name}! 🌸`
  },

  // ---- Screen 2: Hero ----
  heroPreText: {
    en: 'Together with their families',
    hi: 'अपने परिवारों के साथ'
  },
  heroCoupleName: {
    en: 'Apoorva & Saumya',
    hi: 'अपूर्वा & सौम्य'
  },
  heroPostText: {
    en: 'invite you to celebrate their union',
    hi: 'अपने मिलन का जश्न मनाने के लिए आपको आमंत्रित करते हैं'
  },
  scrollText: {
    en: 'Scroll',
    hi: 'स्क्रॉल करें'
  },

  // ---- Screen 3: Family Names ----
  familyHeading: {
    en: 'With the Blessings of',
    hi: 'आशीर्वाद के साथ'
  },
  brideName: {
    en: 'Apoorva Pandey',
    hi: 'अपूर्वा पाण्डेय'
  },
  brideRelation: {
    en: 'D/O',
    hi: 'पुत्री'
  },
  brideFather: {
    en: 'Shri Vinod Kumar Pandey',
    hi: 'श्री विनोद कुमार पाण्डेय'
  },
  brideMother: {
    en: 'Smt. Madhu Pandey',
    hi: 'श्रीमती मधु पाण्डेय'
  },
  groomName: {
    en: 'Saumya Ranjan Dwivedy',
    hi: 'सौम्य रंजन द्विवेदी'
  },
  groomRelation: {
    en: 'S/O',
    hi: 'पुत्र'
  },
  groomFather: {
    en: 'Shri Rajarshi Dwivedy',
    hi: 'श्री राजर्षि द्विवेदी'
  },
  groomMother: {
    en: 'Smt. Aprajita Dwivedy',
    hi: 'श्रीमती अपराजिता द्विवेदी'
  },
  andText: {
    en: '&',
    hi: 'एवं'
  },

  // ---- Screen 4: Personal Message ----
  personalMessage: {
    en: 'As two families come together in love and celebration, we are overjoyed to share these precious moments with you. Your presence would make our happiness complete.',
    hi: 'जब दो परिवार प्रेम और उत्सव में एक होते हैं, तो आपकी उपस्थिति हमारी खुशी को पूर्ण बनाती है।'
  },
  messageSignature: {
    en: '— Apoorva & Saumya 🌸',
    hi: '— अपूर्वा & सौम्य 🌸'
  },

  // ---- Screen 5: Events ----
  eventsHeading: {
    en: 'Our Celebrations',
    hi: 'हमारे उत्सव'
  },

  // ---- Events Data ----
  events: {
    engagement: {
      title: { en: 'Engagement', hi: 'सगाई' },
      date: '2026-04-23',
      dateFormatted: { en: '23rd April, 2026', hi: '२३ अप्रैल, २०२६' },
      time: { en: 'Time: TBD', hi: 'समय: जल्द सूचित किया जाएगा' },
      icon: '💍',
      venue: {
        name: { en: 'Lucknow Golf Club', hi: 'लखनऊ गोल्फ क्लब' },
        address: {
          en: '1, Kalidas Marg, Gulistan Colony, Lucknow, UP 226001',
          hi: '1, कालिदास मार्ग, गुलिस्तान कॉलोनी, लखनऊ, UP 226001'
        },
        mapUrl: 'https://maps.app.goo.gl/oegG1c93RpHvdR1M8'
      },
      theme: 'engagement'
    },
    haldi: {
      title: { en: 'Haldi, Mehandi & Sangeet', hi: 'हल्दी, मेहंदी और संगीत' },
      date: '2026-04-25',
      dateFormatted: { en: '25th April, 2026', hi: '२५ अप्रैल, २०२६' },
      time: { en: '5 PM Onwards', hi: 'शाम 5 बजे से' },
      icon: '🌺',
      venue: {
        name: { en: 'Club Dancing Donalds', hi: 'क्लब डांसिंग डोनाल्ड्स' },
        address: {
          en: 'Antas Mall Rooftop, Gomti Nagar, Lucknow',
          hi: 'अंतस मॉल रूफटॉप, गोमती नगर, लखनऊ'
        },
        mapUrl: 'https://maps.app.goo.gl/mFm9cYrvFJzzCiAGA'
      },
      theme: 'haldi'
    },
    wedding: {
      title: { en: 'Wedding', hi: 'विवाह' },
      date: '2026-04-27',
      dateFormatted: { en: '27th April, 2026', hi: '२७ अप्रैल, २०२६' },
      time: { en: '7 PM Onwards', hi: 'शाम 7 बजे से' },
      icon: '🕉️',
      venue: {
        name: { en: 'Chinmay Resort', hi: 'चिन्मय रिसॉर्ट' },
        address: {
          en: '331, Sultanpur Rd, Ahmamau, UP 226002',
          hi: '331, सुल्तानपुर रोड, अहमामौ, UP 226002'
        },
        mapUrl: 'https://maps.app.goo.gl/JPDFWe1jdB3LEn6i9'
      },
      theme: 'wedding'
    }
  },

  // ---- Event Detail Page ----
  venueLabel: {
    en: 'Venue',
    hi: 'स्थान'
  },
  takeMethere: {
    en: 'Take me there →',
    hi: 'मुझे वहाँ ले चलें →'
  },
  invitationHeading: {
    en: 'Your Invitation',
    hi: 'आपका निमंत्रण'
  },
  downloadPdf: {
    en: 'Download as PDF',
    hi: 'PDF डाउनलोड करें'
  },
  photosHeading: {
    en: 'Photo Gallery',
    hi: 'फोटो गैलरी'
  },
  uploadPhotos: {
    en: 'Upload Photos',
    hi: 'फोटो अपलोड करें'
  },
  galleryEmpty: {
    en: 'No photos yet. Be the first to share!',
    hi: 'अभी तक कोई फोटो नहीं। पहले शेयर करने वाले बनें!'
  },
  uploadNotAllowed: {
    en: 'Photo upload is not enabled for your account.',
    hi: 'आपके अकाउंट के लिए फोटो अपलोड सक्षम नहीं है।'
  },
  uploadSuccess: {
    en: 'Photo uploaded successfully! 📸',
    hi: 'फोटो सफलतापूर्वक अपलोड हो गई! 📸'
  },

  // ---- Countdown ----
  countdownDays: { en: 'Days', hi: 'दिन' },
  countdownHours: { en: 'Hrs', hi: 'घंटे' },
  countdownMinutes: { en: 'Min', hi: 'मिनट' },
  countdownSeconds: { en: 'Sec', hi: 'सेकंड' },
  countdownToday: {
    en: 'Today is the day! 🎉',
    hi: 'आज वो दिन है! 🎉'
  },

  // ---- Navigation ----
  langToggleLabel: {
    en: 'हिं',
    hi: 'EN'
  },
  backText: {
    en: '←',
    hi: '←'
  },

  // ---- Invitation Card ----
  invCardLine1: {
    en: 'Together with their families',
    hi: 'अपने परिवारों के साथ'
  },
  invCardCouple: {
    en: 'Apoorva & Saumya',
    hi: 'अपूर्वा & सौम्य'
  },
  invCardLine2: {
    en: 'request the pleasure of your company at their',
    hi: 'आपकी उपस्थिति का अनुरोध करते हैं'
  },

  // ---- WhatsApp Share Section ----
  shareHeading: {
    en: 'Share Your Memories',
    hi: 'अपनी यादें साझा करें'
  },
  waSendPhotos: {
    en: 'Send Photos',
    hi: 'फ़ोटो भेजें'
  },
  waSubtext: {
    en: 'Easy for everyone',
    hi: 'सबके लिए आसान'
  },
  waTag: {
    en: '📸 Photos & Clips',
    hi: '📸 फोटो और क्लिप्स'
  },
  waOpenBtn: {
    en: 'Open WhatsApp',
    hi: 'व्हाट्सऐप खोलें'
  },
  uploadVideosLabel: {
    en: 'Upload Videos',
    hi: 'वीडियो अपलोड करें'
  },
  uploadVideosSubtext: {
    en: 'Full quality',
    hi: 'पूर्ण गुणवत्ता'
  },
  uploadVideosTag: {
    en: '🎥 Long Videos',
    hi: '🎥 लंबे वीडियो'
  },
  uploadBtn: {
    en: 'Upload',
    hi: 'अपलोड करें'
  },
  shareNote: {
    en: 'Photos sent via WhatsApp will appear in the gallery after admin review.',
    hi: 'व्हाट्सऐप से भेजी गई तस्वीरें समीक्षा के बाद गैलरी में दिखेंगी।'
  },
  sharePhotosBtn: {
    en: 'Share Your Photos 📸',
    hi: 'अपनी तस्वीरें साझा करें 📸'
  },
  sharePhotosNote: {
    en: 'Photos will appear in the gallery after review.',
    hi: 'तस्वीरें समीक्षा के बाद गैलरी में दिखेंगी।'
  },
  waPrefilledMsg: {
    en: (eventName) => `Hi! I am sharing my photos from ${eventName}. My name is: `,
    hi: (eventName) => `नमस्ते! मैं ${eventName} की तस्वीरें साझा कर रहा/रही हूँ। मेरा नाम है: `
  },
  sharedBy: {
    en: (name) => `Shared by ${name}`,
    hi: (name) => `${name} द्वारा साझा`
  },

  // ---- Story Onboarding ----
  storyWelcomeSmall: {
    en: 'Together with our families',
    hi: 'अपने परिवारों के साथ'
  },
  storyWelcomeHeading: {
    en: "You're Invited",
    hi: 'आपको आमंत्रित किया जाता है'
  },
  storyWelcomeBody: {
    en: 'With hearts full of joy, Apoorva & Saumya request the honour of your presence as they begin their forever.',
    hi: 'हर्षपूर्ण हृदय के साथ, अपूर्वा और सौम्य आपकी उपस्थिति का सम्मानपूर्वक अनुरोध करते हैं।'
  },
  storyCelebrations: {
    en: 'Our Celebrations',
    hi: 'हमारे उत्सव'
  },
};

/* ---- Language Functions ---- */
function getLang() {
  return localStorage.getItem('as_wedding_lang') || null;
}

function setLang(lang) {
  localStorage.setItem('as_wedding_lang', lang);
}

function t(key) {
  const lang = getLang() || 'en';
  const value = STRINGS[key];

  if (!value) return key;

  // If it's a simple string (for screen 0 dual-language items)
  if (typeof value === 'string') return value;

  // If it has en/hi properties
  if (value[lang] !== undefined) return value[lang];

  // Fallback to en
  if (value.en !== undefined) return value.en;

  return key;
}

function getEventData(eventKey) {
  return STRINGS.events[eventKey] || null;
}

function formatDateHindi(dateStr) {
  const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return dateStr.replace(/\d/g, d => hindiDigits[d]);
}

/* ---- Sync live config from API (non-blocking) ---- */
async function syncWorkspaceConfig() {
  try {
    const res = await fetch(
      'https://medhashi-api.medhashi.workers.dev/api/workspace/public',
      { cache: 'no-store' }
    )
    if (!res.ok) return
    const { config } = await res.json()
    if (!config) return

    // Overwrite name strings if present
    if (config.brideName)
      STRINGS.brideName = { en: config.brideName, hi: config.brideNameHindi || config.brideName }
    if (config.groomName)
      STRINGS.groomName = { en: config.groomName, hi: config.groomNameHindi || config.groomName }
    if (config.brideFather)
      STRINGS.brideFather = { en: config.brideFather, hi: config.brideFatherHindi || config.brideFather }
    if (config.brideMother)
      STRINGS.brideMother = { en: config.brideMother, hi: config.brideMotherHindi || config.brideMother }
    if (config.groomFather)
      STRINGS.groomFather = { en: config.groomFather, hi: config.groomFatherHindi || config.groomFather }
    if (config.groomMother)
      STRINGS.groomMother = { en: config.groomMother, hi: config.groomMotherHindi || config.groomMother }

    // Overwrite couple name composites
    if (config.brideName && config.groomName) {
      const bn = config.brideName.split(' ')[0]
      const gn = config.groomName.split(' ')[0]
      const bnh = (config.brideNameHindi || config.brideName).split(' ')[0]
      const gnh = (config.groomNameHindi || config.groomName).split(' ')[0]
      STRINGS.heroCoupleName = { en: `${bn} & ${gn}`, hi: `${bnh} & ${gnh}` }
      STRINGS.invCardCouple = { en: `${bn} & ${gn}`, hi: `${bnh} & ${gnh}` }
      STRINGS.messageSignature = { en: `— ${bn} & ${gn} 🌸`, hi: `— ${bnh} & ${gnh} 🌸` }
      STRINGS.storyWelcomeBody = {
        en: `With hearts full of joy, ${bn} & ${gn} request the honour of your presence as they begin their forever.`,
        hi: `हर्षपूर्ण हृदय के साथ, ${bnh} और ${gnh} आपकी उपस्थिति का सम्मानपूर्वक अनुरोध करते हैं।`
      }
    }

    // Overwrite event data if present
    if (config.events && Array.isArray(config.events)) {
      config.events.forEach(ev => {
        if (!ev.key || !STRINGS.events[ev.key]) return
        const target = STRINGS.events[ev.key]
        if (ev.title) target.title = { en: ev.title, hi: ev.titleHindi || ev.title }
        if (ev.date) {
          target.date = ev.date
          target.dateFormatted = {
            en: new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            hi: new Date(ev.date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })
          }
        }
        if (ev.time) target.time = { en: ev.time, hi: ev.timeHindi || ev.time }
        if (ev.icon) target.icon = ev.icon
        if (ev.venueName && target.venue) {
          target.venue.name = { en: ev.venueName, hi: ev.venueNameHindi || ev.venueName }
          target.venue.address = { en: ev.venueAddress || '', hi: ev.venueAddressHindi || '' }
          target.venue.mapUrl = ev.mapUrl || target.venue.mapUrl
        }
      })
    }

    // Update WhatsApp number if present
    if (config.whatsappNumber) {
      const num = config.whatsappNumber.replace(/\D/g, '')
      if (typeof window !== 'undefined') window.WHATSAPP_NUMBER = num
    }

  } catch {
    // Silent fail — defaults remain
  }
}
