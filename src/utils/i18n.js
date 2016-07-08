/**
 * @fileoverview Internationalization and localization (i18n).
 *
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author mbordihn@google.com (Markus Bordihn)
 */
goog.provide('cwc.utils.I18n');

goog.require('cwc.locales.de.Translation');
goog.require('cwc.locales.en.Translation');
goog.require('cwc.locales.ko.Translation');

goog.require('cwc.utils.Logger');



/**
 * Helper for i18n.
 * @constructor
 * @final
 * @export
 */
cwc.utils.I18n = function() {

  /** @type {!string} */
  this.name = 'i18n';

  /** @private {!cwc.utils.LogLevel} */
  this.loglevel_ = cwc.utils.LogLevel.NOTICE;

  /** @private {!cwc.utils.Logger} */
  this.log_ = new cwc.utils.Logger(this.loglevel_, this.name);

  /** @type {!string} */
  this.language = '';

  /** @type {!string} */
  this.fallbackLanguage = 'en';

  /** @type {!Object} */
  this.untranslated = {};

  /** @type {!Object} */
  this.usage = {};
};


/**
 * @param {Function=} opt_callback
 * @param {string=} opt_language
 */
cwc.utils.I18n.prototype.prepare = function(opt_callback, opt_language) {
  var callback = function(error) {
    if (error) {
      console.error('I18n error:', error);
      return;
    }
    // Mapping global short-cuts
    window['i18t'] = this.translate.bind(this);
    window['i18soy'] = this.translateSoy.bind(this);

    // Callback
    if (goog.isFunction(opt_callback)) {
      opt_callback();
    }
  }.bind(this);

  // Sets default language
  this.language = opt_language || this.getLanguage();
  var options = {
    'lng': opt_language,
    'fallbackLng': this.fallbackLanguage,
    'keySeparator': false,
    'nsSeparator': false,
    'resources': {
      'de': {
        'translation': cwc.locales.de.Translation
      },
      'en': {
        'translation': cwc.locales.en.Translation
      },
      'ko': {
        'translation': cwc.locales.ko.Translation
      }
    }
  };

  // Init i18next
  this.log_.info('Init i18n with', options);
  i18next.init(options, callback);
};


/**
 * Translate the given text to the current language.
 * @param {!string} text
 * @param {Object=} opt_options
 * @return {!string}
 */
cwc.utils.I18n.prototype.translate = function(text, opt_options) {
  var translatedText = i18next.t(text, opt_options);
  if (text == translatedText && this.language &&
      !this.isTranslated(text, opt_options)) {
    if (text in this.untranslated) {
      this.untranslated[text]++;
    } else {
      this.log_.warn('[i18n] Untranslated:', text);
      this.untranslated[text] = 1;
    }
  }
  return translatedText;
};


/**
 * Translate the given soy context to the current language.
 * @param {!string} text
 * @param {Object=} opt_values
 * @return {!string}
 */
cwc.utils.I18n.prototype.translateSoy = function(text, opt_values) {
  if (!opt_values) {
    return this.translate(text);
  }

  var indirect = (/^\{\$\w+\}$/.test(text));
  if (!indirect) {
    text = this.translate(text);
  }
  text = text.replace(/\{\$([^}]+)}/g, function(match, key) {
    return (opt_values != null && key in opt_values) ? opt_values[key] : match;
  });

  return indirect ? this.translate(text) : text;
};


/**
 * @return {!string}
 */
cwc.utils.I18n.prototype.getLanguage = function() {
  if (!this.language) {
    if (typeof chrome.i18n !== 'undefined') {
      return chrome.i18n.getUILanguage();
    } else if (this.fallbackLanguage) {
      return this.fallbackLanguage;
    }
  }
  return this.language;
};


/**
 * @param {string=} opt_language
 */
cwc.utils.I18n.prototype.setLanguage = function(opt_language) {
  this.language = opt_language || this.getLanguage();
  i18next.changeLanguage(this.language);
};


/**
 * @param {string=} opt_language
 * @param {string=} opt_text
 */
cwc.utils.I18n.prototype.getLanguageData = function(opt_language, opt_text) {
  var language = opt_language || this.getLanguage();
  if (opt_text) {
    return i18next.store.data[language].translation[opt_text];
  }
  return i18next.store.data[language].translation;
};


/**
 * Checks if the given text is known / translated for the current language.
 * @param {!string} text
 * @param {Object=} opt_options
 * @return {!boolean}
 */
cwc.utils.I18n.prototype.isTranslated = function(text, opt_options) {
  return i18next.exists(text, opt_options);
};


/**
 * @return {!string}
 */
cwc.utils.I18n.prototype.getToDo = function() {
  var counter = 0;
  var result = '';
  for (var textId in this.untranslated) {
    if (this.untranslated.hasOwnProperty(textId)) {
      result += '  \'' + textId + '\': \'' + textId + '\',\n';
    }
    counter += 1;
  }
  if (result) {
    console.log('Found', counter, 'untranslated text for', this.getLanguage());
    console.log('File: src/locales/' + this.getLanguage() + '/translation.js');
    console.log(result);
  }
  return result;
};
