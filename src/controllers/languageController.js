const Boom = require('@hapi/boom');

// Daftar bahasa yang tersedia dalam aplikasi
const availableLanguages = [
  {
    code: 'id',
    name: 'Bahasa Indonesia',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
    isDefault: true,
    isActive: true
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    isDefault: false,
    isActive: true
  }

];

// @desc    Mendapatkan daftar bahasa yang tersedia
// @route   GET /lang
// @access  Public
exports.getAvailableLanguages = async (request, h) => {
  try {
    const { active_only = 'true' } = request.query;
    
    let languages = [...availableLanguages];
    
    // Filter bahasa yang aktif saja jika parameter active_only=true
    if (active_only.toLowerCase() === 'true') {
      languages = languages.filter(lang => lang.isActive);
    }
    
    return {
      success: true,
      count: languages.length,
      data: languages
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Mendapatkan detail bahasa berdasarkan kode bahasa
// @route   GET /lang/{code}
// @access  Public
exports.getLanguageByCode = async (request, h) => {
  try {
    const { code } = request.params;
    
    const language = availableLanguages.find(
      lang => lang.code.toLowerCase() === code.toLowerCase()
    );
    
    if (!language) {
      return Boom.notFound(`Bahasa dengan kode ${code} tidak ditemukan`);
    }
    
    return {
      success: true,
      data: language
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Mendapatkan bahasa default
// @route   GET /lang/default
// @access  Public
exports.getDefaultLanguage = async (request, h) => {
  try {
    const defaultLanguage = availableLanguages.find(lang => lang.isDefault);
    
    return {
      success: true,
      data: defaultLanguage
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};
