import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as english from '@zxcvbn-ts/language-en';
import * as french from '@zxcvbn-ts/language-fr';

export const dictionaries = {
  common: common.dictionary,
  en: english.dictionary,
  fr: french.dictionary,
};
export type DictionaryName = keyof typeof dictionaries;
export const MAX_PASSWORD_LENGTH = 128;

export function createEstimator(selected: DictionaryName[]) {
  return new ZxcvbnFactory({
    dictionary: Object.assign({}, ...selected.map(name => dictionaries[name])),
    graphs: common.adjacencyGraphs,
    translations: english.translations,
    // Reject longer input in the UI instead of silently estimating a prefix.
    maxLength: MAX_PASSWORD_LENGTH,
  });
}
