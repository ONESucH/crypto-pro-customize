import { Promise } from 'es6-promise';
import _ from 'underscore';
var cadesplugin: any = window['cadesplugin'];

function CryptoProPlugin() {

  private pathToFileAPI = `cadesplugin-api.js`;
  private pathToChromiumAPI = `async-crypto.js`;
  private pathToFileAPIie = `sync-crypto.js`;
  private cspAPI;
  private readonly isChromium;

  varructor(public url: string = 'js') {
    this.isChromium = this.isChromiumBased();
    var pathToFileLib = (this.isChromium ? this.pathToChromiumAPI : this.pathToFileAPIie);

    this.cspAPI = this.scriptLoader([
      `${url}/${this.pathToFileAPI}`,
      `${url}/${pathToFileLib}`
    ]);
  }

  /**
   * Подгрузка скриптов
   */
  private scriptLoader(url) {
    if (Array.isArray(url)) {
      var self = this;
      var prom = [];

      _.each(url, item => {
        prom.push(self.scriptLoader(item));
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
        if (!r && (!this.readyState || this.readyState === 'complete')) {
          r = true;
          resolve(this);
        }
      };
      s.onerror = s.onabort = reject;

      t.parentNode.insertBefore(s, t.nextSibling);
    });

  }

  private isChromiumBased() {
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

  /**
   * Инициализация КриптоПро
   */
  public then(resolve, reject): any {
    this.cspAPI.then(() => { });

    this.cspAPI.then(() => {
      var csp = window['cadesplugin'];

      if (this.isChromium) {
        csp.then(
          () => {
            this.isPluginEnable().then(
              () => resolve(csp),
              () => reject('Не установлен Крипто-про CSP')
            );
          },
          (error) => reject(error)
        );
      } else {
        window.addEventListener('message', (event) => {
          if (event.data === 'cadesplugin_loaded') {
            resolve(cadesplugin);
          } else if (event.data === 'cadesplugin_load_error') {
            reject('cadesplugin_load_error');
          }
          resolve(cadesplugin);
        }, false);
        window.postMessage('cadesplugin_echo_request', '*');
      }
    }, reject);
  }

  /**
   * Подписание ЭЦП
   * (имя можно получить из списка полученного с помощью getCertList)
   */
  public signMessage(certSubjectName, base64EncodedString) {
    return {
      then: (resolve, reject) => {

        if (this.isChromium) {
          var thenable = window['sign'](certSubjectName, base64EncodedString);
          thenable.then(
            (result) => resolve(result),
            (error) => reject(error)
          );
        } else {
          try {
            var result = window['sign'](certSubjectName, base64EncodedString);
            if (result === null) { reject(result); } else { resolve(result); }
          } catch (error) {
            reject(error);
          }
        }
      }
    };
  }

  public signXml(certSubjectName, xml) {
    return {
      then: (resolve, reject) => {

        if (this.isChromium) {
          var thenable = window['signXml'](certSubjectName, xml);
          thenable.then(
            (result) => resolve(result),
            (error) => reject(error)
          );
        } else {
          try {
            var result = window['signXml'](certSubjectName, xml);
            if (result === null) { reject(result); } else { resolve(result); }
          } catch (error) {
            reject(error);
          }
        }
      }
    };
  }

  public dec(certificateName, decodeString) {
    return {
      then: (resolve, reject) => {

        if (this.isChromium) {
          var thenable = window['decrypt'](certificateName, decodeString);
          thenable.then((result) => resolve(result), (error) => reject(error));
        } else {
          try {
            var result = window['decrypt'](certificateName, decodeString);
            if (result === null) { reject(result); } else { resolve(result); }
          } catch (error) {
            reject(error);
          }
        }
      }
    };
  }

  public getCertificate(subjectName) {
    return {
      then: (resolve, reject) => {

        if (this.isChromium) {
          var thenable = window['getCertificate'](subjectName);
          thenable.then(
            (result) => resolve(result),
            (error) => reject(error)
          );
        } else {
          try {
            var result = window['getCertificate'](subjectName);
            if (result === null) { reject(result); } else { resolve(result); }
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
  public getCertList(): Promise<any> {
    if (this.isChromiumBased()) {
      return new Promise((resolve, reject) => {
        return window['getCertificates']().then(
          (certList) => resolve(certList),
          (error) => reject(error)
        ).catch((e) => {
          console.log(e);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          var certList = window['getCertificates']();
          if (typeof certList === 'string') {
            reject(certList);
          } else {
            resolve(certList);
          }
        }, 0);
      }).catch((e) => {
        console.log(e);
      });
    }
  }

  public isPluginEnable(): Promise<any> {
    if (this.isChromiumBased()) {
      return new Promise((resolve, reject) => {
        return window['pluginInstaled']().then(
          (value) => resolve(value),
          (error) => reject(error)
        ).catch((e) => {
          console.log(e);
        });
      });
    } else {
      return new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (_.isUndefined(window['PluginInstaled'])) {
            reject('Плагин не установлен');
          }
          var value = window['PluginInstaled']();
          if (typeof value === 'boolean') {
            reject(value);
          } else {
            resolve(value);
          }
        }, 0);
      }).catch((e) => {
        console.log(e);
      });
    }
  }
}

export default CryptoProPlugin;