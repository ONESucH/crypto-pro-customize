require('./cadesplugin-api');
var _ = require('underscore');
console.log('window', window);
console.log('underscore ', _);

var AsyncCrypto = require('./async-crypto');
console.log('AsyncCrypto', AsyncCrypto);

var cspAPI,
  isChromium,
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

    _.each(url, function(item) {
      prom.push(self.ScriptLoader(item));
    });

    return Promise.all(prom);
  }

  return new Promise(function(resolve, reject) {
    var r = false;
    var scripts = document.getElementsByTagName('script');
    var t = scripts[scripts.length - 1];

    var s = document.createElement('script');

    s.type = 'text/javascript';
    s.src = url;
    s.defer = true;
    s['onload'] = s['onreadystatechange'] = function() {
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

  if (isChrome == null) {
    // В Firefox и IE работаем через NPAPI
    return false;
  } else {
    // В Chrome и Opera работаем через асинхронную версию
    if (isChrome.length > 0 || isOpera != null) {
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
  cspAPI.then(function() {});

  cspAPI.then(function() {
    if (isChromium) {
      cadesplugin.then(
        function() {
          IsPluginEnable().then(
            function() {
              resolve(cadesplugin);
            },
            function() {
              reject('Не установлен Крипто-про CSP');
            }
          );
        },
        function(error) {
          reject(error);
        }
      );
    } else {
      window.addEventListener(
        'message',
        function(event) {
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
  return {
    then: function(resolve, reject) {
      if (isChromium) {
        var thenable = Sign(certSubjectName, base64EncodedString);
        thenable
          .then(function(result) {
            return resolve(result);
          })
          .catch(function(error) {
            return reject(error);
          });
      } else {
        try {
          var result = Sign(certSubjectName, base64EncodedString);
          if (result === null) {
            reject(result);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }
    }
  };
}

function SignXmlCert(certSubjectName, xml) {
  return {
    then: function(resolve, reject) {
      if (isChromium) {
        var thenable = SignXml(certSubjectName, xml);
        thenable
          .then(function(result) {
            return resolve(result);
          })
          .catch(function(error) {
            return reject(error);
          });
      } else {
        try {
          var result = SignXml(certSubjectName, xml);
          if (result === null) {
            reject(result);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }
    }
  };
}

function Dec(certificateName, decodeString) {
  return {
    then: function(resolve, reject) {
      if (isChromium) {
        var thenable = Decrypt(certificateName, decodeString);
        thenable
          .then(function(result) {
            return resolve(result);
          })
          .catch(function(error) {
            return reject(error);
          });
      } else {
        try {
          var result = Decrypt(certificateName, decodeString);
          if (result === null) {
            reject(result);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }
    }
  };
}

function GetCertificateName(subjectName) {
  return {
    then: function(resolve, reject) {
      if (isChromium) {
        var thenable = GetCertificate(subjectName);
        thenable
          .then(function(result) {
            return resolve(result);
          })
          .catch(function(error) {
            return reject(error);
          });
      } else {
        try {
          var result = GetCertificate(subjectName);
          if (result === null) {
            reject(result);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }
    }
  };
}

/**
 * Получение списка сертифкатов
 */
function GetCertificate(data) {
  if (IsChromiumBased()) {
    return new Promise(function(resolve, reject) {
      return AsyncCrypto.GetCertificates()
        .then(function(certList) {
          return resolve(certList);
        })
        .catch(function(error) {
          return reject(error);
        });
    });
  } else {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        var certList = AsyncCrypto.GetCertificates();
        if (typeof certList === 'string') {
          return reject(certList);
        } else {
          return resolve(certList);
        }
      }, 0);
    }).catch(function(e) {
      console.log(e);
    });
  }
}

function IsPluginEnable() {
  if (IsChromiumBased()) {
    return new Promise(function(resolve, reject) {
      return AsyncCrypro.PluginInstaled()
        .then(function(value) {
          return resolve(value);
        })
        .catch(function(error) {
          return reject(error);
        });
    });
  } else {
    return new Promise(
      function(resolve, reject) {
        setTimeout(function() {
          if (_.isUndefined(AsyncCrypro.PluginInstaled())) {
            reject('Плагин не установлен');
          }
          var value = AsyncCrypro.PluginInstaled();
          if (typeof value === 'boolean') {
            reject(value);
          } else {
            resolve(value);
          }
        }, 0);
      }.catch(function(e) {
        console.log(e);
      })
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
  AsyncCrypto: AsyncCrypto
};

module.exports = cryptoProPlugin;
