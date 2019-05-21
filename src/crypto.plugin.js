require('./cadesplugin-api');
var _ = require('underscore'),
  cspAPI,
  isChromium,
  async = require('./async-crypto'),
  pathToFileAPI = 'cadesplugin-api.js',
  pathToChromiumAPI = 'async-crypto.js',
  pathToFileAPIie = 'sync-crypto.js',
  url = 'js';
/**
 * Подгрузка скриптов
 */
function ScriptLoader(url) {
  if (Array.isArray(url)) {
    var self = this;
    var prom = [];

    _.each(url, (item) => {
      prom.push(self.ScriptLoader(item));
    });

    return Promise.all(prom);
  }

  return new Promise((resolve, reject) => {
    var r = false;
    var scripts = document.getElementsByTagName('script');
    var t = scripts[scripts.length - 1];

    var s = document.createElement('script');

    s.type = 'text/javascript';
    s.src = url;
    s.defer = true;
    s['onload'] = s['onreadystatechange'] = () => {
      if (!r && (!readyState || readyState === 'complete')) {
        r = true;
        resolve(this);
      }
    };
    s.onerror = s.onabort = reject;

    t.parentNode.insertBefore(s, t.nextSibling);
  });
}

function IsChromiumBased() {
  var isChrome = navigator.userAgent.match(/chrome/i);
  var isOpera = navigator.userAgent.match(/opr/i);

  if (!isChrome) {
    // В Firefox и IE работаем через NPAPI
    return false;
  } else {
    // В Chrome и Opera работаем через асинхронную версию
    if (isChrome.length > 0 || isOpera) {
      return true;
    }
  }

  return false;
}

isChromium = IsChromiumBased();

var pathToFileLib = isChromium ? pathToChromiumAPI : pathToFileAPIie;

cspAPI = ScriptLoader(url + '/' + pathToFileAPI, url + '/' + pathToFileLib);

/**
 * Инициализация КриптоПро
 */
function Then(resolve, reject) {
  cspAPI.then(() => {});

  cspAPI.then(() => {
    if (isChromium) {
      cadesplugin.then(
        () => {
          IsPluginEnable().then(
            () => resolve(cadesplugin),
            () => reject('Не установлен Крипто-про CSP')
          );
        },
        (error) => reject(error)
      );
    } else {
      window.addEventListener(
        'message',
        (event) => {
          if (event.data === 'cadesplugin_loaded') {
            resolve(cadesplugin);
          } else if (event.data === 'cadesplugin_load_error') {
            reject('cadesplugin_load_error');
          }
          resolve(cadesplugin);
        },
        false
      );
      window.postMessage('cadesplugin_echo_request', '*');
    }
  }, reject);
}

/**
 * Подписание ЭЦП
 * (имя можно получить из списка полученного с помощью getCertList)
 */
function SignMessage(certSubjectName, base64EncodedString) {
  return new Promise((resolve, reject) => {
    if (isChromium) {
      var thenable = async.Sign(certSubjectName, base64EncodedString);
      thenable
        .then((result) => resolve(result))
        .catch((error) => reject(error));
    } else {
      try {
        var result = async.Sign(certSubjectName, base64EncodedString);
        if (!result) {
          reject(result);
        } else resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  });
}

function SignXmlCert(certSubjectName, xml) {
  return new Promose((resolve, reject) => {
    if (isChromium) {
      var thenable = SignXml(certSubjectName, xml);
      thenable
        .then((result) => resolve(result))
        .catch((error) => reject(error));
    } else {
      try {
        var result = SignXml(certSubjectName, xml);
        if (!result) {
          reject(result);
        } else resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  });
}

function Dec(certificateName, decodeString) {
  return new Promose((resolve, reject) => {
    if (isChromium) {
      var thenable = Decrypt(certificateName, decodeString);
      thenable
        .then((result) => resolve(result))
        .catch((error) => reject(error));
    } else {
      try {
        var result = Decrypt(certificateName, decodeString);
        if (!result) {
          reject(result);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    }
  });
}

function GetCertificateName(subjectName) {
  return new Promose((resolve, reject) => {
    if (isChromium) {
      var thenable = GetCertificate(subjectName);
      thenable
        .then((result) => resolve(result))
        .catch((error) => reject(error));
    } else {
      try {
        var result = GetCertificate(subjectName);
        if (result === null) {
          reject(result);
        } else resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  });
}

/**
 * Получение списка сертифкатов
 */
function GetCertificate() {
  if (IsChromiumBased()) {
    return new Promise((resolve, reject) =>
      async
        .GetCertificates()
        .then((certList) => resolve(certList))
        .catch((error) => reject(error))
    );
  } else
    new Promise((resolve, reject) => {
      var certList = async.GetCertificates();
      if (typeof certList === 'string') {
        reject(certList);
      } else resolve(certList);
    }).catch((e) => console.log(e));
}

function IsPluginEnable() {
  if (IsChromiumBased()) {
    return new Promise((resolve, reject) =>
      async
        .PluginInstaled()
        .then((value) => resolve(value))
        .catch((error) => reject(error))
    );
  } else {
    return new Promise(
      function(resolve, reject) {
        setTimeout(() => {
          if (_.isUndefined(async.PluginInstaled())) {
            reject('Плагин не установлен');
          }
          var value = async.PluginInstaled();
          if (typeof value === 'boolean') {
            reject(value);
          } else {
            resolve(value);
          }
        }, 0);
      }.catch((e) => console.log(e))
    );
  }
}

var cryptoProPlugin = {
  IsPluginEnable: IsPluginEnable,
  ScriptLoader: ScriptLoader,
  IsChromiumBased: IsChromiumBased,
  Then: Then,
  SignMessage: SignMessage,
  SignXmlCert: SignXmlCert,
  Dec: Dec,
  GetCertificate: GetCertificate,
  async: async
};

module.exports = cryptoProPlugin;
