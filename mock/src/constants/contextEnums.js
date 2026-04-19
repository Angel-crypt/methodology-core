/**
 * constants/contextEnums.js
 * Enumeraciones de contexto compartidas entre rutas del mock.
 * Fuente única de verdad — importar desde m4.js y config.js.
 */

const VALID_EDUCATION_LEVELS  = ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'];
const VALID_SCHOOL_TYPES      = ['public', 'private', 'unknown'];
const VALID_GENDERS           = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
const VALID_SOCIOECONOMIC     = ['low', 'medium', 'high', 'unknown'];

module.exports = {
  VALID_EDUCATION_LEVELS,
  VALID_SCHOOL_TYPES,
  VALID_GENDERS,
  VALID_SOCIOECONOMIC,
};
