/**
 * Collection of character sets used for the Matrix Rain animation.
 * The active set is determined by ACTIVE_CHARSET.
 */

// The user-provided character set
export const CUSTOM_SET = [
  '*', '+', '0', '1', '2', '3', '4', '5', '7', '8', '9', '<', '>', 'Z', '-', ':', '"', '=', '|', '¦', '╌', '゠',
  'ア', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'ツ', 'テ', 'ナ', 'ニ', 'ヌ', 'ネ', 'ハ', 'ヒ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ヨ', 'ラ', 'リ', 'ワ', 'ー'
];

export const STANDARD_KATAKANA = Array.from({ length: 96 }, (_, i) => String.fromCharCode(0x30A0 + i));

export const CHARACTER_SETS = {
  CUSTOM: CUSTOM_SET,
  KATAKANA: STANDARD_KATAKANA
};

// Expose the active set for easy swapping
export const ACTIVE_CHARSET = CHARACTER_SETS.CUSTOM;
