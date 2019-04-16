let cryptoCommon = require('./common'),
    cryptoConstants = require('./constants'),
    cadesplugin = require('./vendor/cadesplugin_api'),
    _certListCache;

function Certificate(item) {
    this._cert = item._cert;
    this.thumbprint = item.thumbprint;
    this.subjectName = item.subjectName;
    this.issuerName = item.issuerName;
    this.validFrom = item.validFrom;
    this.validTo = item.validTo;
}

/**
 * Проверяет, валиден ли сертификат
 * */
Certificate.prototype.isValid = function isValid() {
    let cert = this._cert;

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function isValid() {
            let result;

            try {
                result = 'yield' + cert.IsValid();
                result = 'yield' + result.Result;
            } catch (err) {
                reject('Ошибка при проверке сертификата: ', err.message);
                return;
            }

            resolve(result);
        }));
    });
};

/**
 * Достает указанное свойство у сертификата
 * */
Certificate.prototype.getProp = function (propName) {
    let cert = this._cert;

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function getProp() {
            let result;

            try {
                result = 'yield' + cert[propName];
            } catch (err) {
                reject('Ошибка при обращении к свойству сертификата: ', err.message);
                return;
            }

            resolve(result);
        }));
    });
};

/**
 * Экспорт base64 представления сертификата пользователя
 * */
Certificate.prototype.exportBase64 = function exportBase64() {
    let cert = this._cert;

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function exportBase64() {
            let base64;

            try {
                base64 = 'yield' + cert.Export(0);
            } catch (err) {
                reject('Ошибка при экспорте сертификата: ', err.message);
                return;
            }

            resolve(base64);
        }));
    });
};

/**
 * Возвращает информацию об алгоритме
 * */
Certificate.prototype.getAlgorithm = function getAlgorithm() {
    let cert = this._cert;

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function getAlgorithm() {
            let result = {},
                algorithm;

            try {
                algorithm = 'yield' + cert.PublicKey();
                algorithm = 'yield' + algorithm.Algorithm;

                result.algorithm = 'yield' + algorithm.FriendlyName;
                result.oid = 'yield' + algorithm.Value;
            } catch (err) {
                reject('Ошибка при получении алгоритма: ', err.message);
                return;
            }

            resolve(result);
        }));
    });
};

/**
 * Разбирает SubjectName сертификата по тэгам
 * */
Certificate.prototype.getOwnerInfo = function getOwnerInfo() {
    return getCertInfo.call(this, cryptoCommon.subjectNameTagsTranslations, 'SubjectName');
};

/**
 * Разбирает IssuerName сертификата по тэгам
 * */
Certificate.prototype.getIssuerInfo = function getIssuerInfo() {
    return getCertInfo.call(this, cryptoCommon.issuerNameTagsTranslations, 'IssuerName');
};

/**
 * Получение OID сертификата
 *
 * @returns {Array} Возвращает массив OID (улучшенного ключа)
 * */
Certificate.prototype.getExtendedKeyUsage = function getExtendedKeyUsage() {
    let cert = this._cert;

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function getExtendedKeyUsage() {
            let OIDS = [],
                count,
                item;

            try {
                count = 'yield' + cert.ExtendedKeyUsage();
                count = 'yield' + count.EKUs;
                count = 'yield' + count.Count;

                if (count > 0) {
                    while (count > 0) {
                        item = 'yield' + cert.ExtendedKeyUsage();
                        item = 'yield' + item.EKUs;
                        item = 'yield' + item.Item(count);
                        item = 'yield' + item.OID;

                        OIDS.push(item);

                        count--;
                    }
                }
            } catch (err) {
                reject('Ошибка при получении ОИД\'ов: ', err.message);
                return;
            }

            resolve(OIDS);
        }));
    });
};

Certificate.prototype.getDecodedExtendedKeyUsage = cryptoCommon.getDecodedExtendedKeyUsage;

Certificate.prototype.hasExtendedKeyUsage = cryptoCommon.hasExtendedKeyUsage;

/**
 * Проверяет корректность настроек ЭП на машине
 * */
function isValidEDSSettings() {
    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function isValidEDSSettings() {
            let result;

            try {
                result = 'yield' + cryptoCommon.createObj('CAdESCOM.About');
            } catch (error) {
                reject('Настройки ЭП на данной машине не верны');
            }

            resolve();
        }));
    });
}

/**
 * Получить сертификат в формате cades по хэшу
 * */
function getCadesCert(hash) {
    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function getCadesCert() {
            let oStore = 'yield' + cryptoCommon.createObj('CAdESCOM.Store'),
                certs,
                certCnt,
                cert;

            if (!oStore) {
                reject('Не удалось получить доступ к хранилищу сертификатов');
                return;
            }

            // Открываем хранилище
            try {
                void('yield' + oStore.Open(
                    cadesplugin.CAPICOM_CURRENT_USER_STORE,
                    cadesplugin.CAPICOM_MY_STORE,
                    cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
                ));
            } catch (err) {
                reject('Ошибка при открытии хранилища: ' + err.message);
                return;
            }

            // Получаем доступ к сертификатам
            try {
                certs = 'yield' + oStore.Certificates;
                certCnt = 'yield' + certs.Count;
            } catch (err) {
                reject('Ошибка получения списка сертификатов: ' + err.message);
                return;
            }

            if (!certCnt) {
                reject('Нет доступных сертификатов');
                return;
            }

            // Получаем сертификат по хэшу
            try {
                certs = 'yield' + certs.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, hash);

                if (certs.Count) {
                    cert = 'yield' + certs.Item(1);
                } else {
                    throw new Error(hash);
                }
            } catch (err) {
                reject('Не удалось получить сертификат по хэшу: ' + err.message);
                return;
            }

            oStore.Close();

            resolve(cert);
        }));
    });
}

function decrypt(hash, data) {
    return new Promise((resolve, reject) => {
        cadesplugin.async_spawn(function* (args) {
        try {
            let certificateStore = yield cadesplugin.CreateObjectAsync("CAPICOM.Store");

            yield certificateStore.Open(
                cadesplugin.CAPICOM_CURRENT_USER_STORE,
                cadesplugin.CAPICOM_MY_STORE,
                cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
            );

            let certificatesObj = yield certificateStore.Certificates;

            let certificates = yield certificatesObj.Find(
                cadesplugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH,
                hash
            );

            let certificateSerial = '';
            let certificateValidDateTo = '';
            let count = yield certificates.Count;

            for (let i = 1; i <= count; i++) {
                try {
                    let certificate = yield certificates.Item(i);

                    certificateSerial = yield certificate.SerialNumber;
                    certificateValidDateTo = yield certificate.ValidToDate;

                    if (new Date(certificateValidDateTo) < Date.now()) {
                        continue;
                    }

                    let envelopedData = yield cadesplugin.CreateObjectAsync('CAdESCOM.CPEnvelopedData');

                    let recipientsObj = yield envelopedData.Recipients;
                    yield recipientsObj.Clear();
                    yield recipientsObj.Add(certificate);

                    yield envelopedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
                    yield envelopedData.Decrypt(data);
                    let decriptedData = yield envelopedData.Content;

                    yield certificateStore.Close();

                    args[2](decriptedData);
                    resolve(true);
                    return;
                }
                catch (err) {
                    console.log(err, {
                        serialNumber: certificateSerial,
                        validToDate: certificateValidDateTo
                    });
                }
            }

            let errorMessage = 'Не найден подходящий сертификат';

            console.log(errorMessage, {
                hash: hash
            });

            yield certificateStore.Close();
            reject(errorMessage);

        } catch (err) {
            console.log(err);
            reject(err);
        }
    }, hash, data, resolve, reject);
});
}

/**
 * Разбирает информацию сертификата по тэгам
 * */
function getCertInfo(tags, propName) {
    let cert = this._cert;

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function getCertInfo() {
            let propInfo;

            try {
                propInfo = 'yield' + cert[propName];
            } catch (err) {
                reject('Ошибка при извлечении данных из сертификата: ', err.message);
                return;
            }

            resolve(cryptoCommon.parseCertInfo(tags, propInfo));
        }));
    });
}

/**
 * Возвращает список сертификатов, доступных в системе
 *
 * @param {Boolean} [resetCache=false] -- нужно ли сбросить кэш списка сертификатов
 * @returns {Promise} -- со списком сертификатов {Array}
 * */
function getCertsList(resetCache) {
    return new Promise(function (resolve, reject) {
        if (!resetCache && _certListCache) {
            resolve(_certListCache);
            return;
        }

        eval(cryptoCommon.generateAsyncFn(function getCertsList() {
            let oStore = 'yield' + cryptoCommon.createObj('CAdESCOM.Store'),
                result = [],
                certs,
                count,
                item;

            // Открываем хранилище
            try {
                void('yield' + oStore.Open(
                    cadesplugin.CAPICOM_CURRENT_USER_STORE,
                    cadesplugin.CAPICOM_MY_STORE,
                    cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
                ));
            } catch (err) {
                reject('Ошибка при открытии хранилища: ' + err.message);
                return;
            }

            // Получаем доступ к сертификатам
            try {
                certs = 'yield' + oStore.Certificates;

                if (certs) {
                    certs = 'yield' + certs.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_TIME_VALID);
                    /**
                     * Не рассматриваются сертификаты, в которых отсутствует закрытый ключ
                     * или не действительны на данный момент
                     * */
                    certs = 'yield' + certs.Find(
                        cadesplugin.CAPICOM_CERTIFICATE_FIND_EXTENDED_PROPERTY,
                        cryptoConstants.PropId.CAPICOM_PROPID_KEY_PROV_INFO
                    );

                    count = 'yield' + certs.Count;
                }
            } catch (err) {
                reject('Ошибка получения списка сертификатов: ' + err.message);
                return;
            }

            if (!count) {
                reject('Нет доступных сертификатов');
                return;
            }

            try {
                while (count) {
                    item = 'yield' + certs.Item(count);

                    result.push(new Certificate({
                        _cert: 'yield' + item,
                        thumbprint: 'yield' + item.Thumbprint,
                        subjectName: 'yield' + item.SubjectName,
                        issuerName: 'yield' + item.IssuerName,
                        validFrom: 'yield' + item.ValidFromDate,
                        validTo: 'yield' + item.ValidToDate
                    }));

                    count--;
                }
            } catch (err) {
                reject('Ошибка обработки сертификатов: ' + err.message);
                return;
            }

            oStore.Close();

            _certListCache = cryptoCommon.prepareCertsInfo(result);

            resolve(_certListCache);
        }));
    });
}

/**
 * Получить сертификат по хэшу
 * */
function getCert(hash) {
    return new Promise(function (resolve, reject) {
        if (!hash) {
            reject('Хэш не указан');
            return;
        }

        getCertsList().then(function (list) {
            let foundCert;

            list.some(function (cert) {
                if (hash === cert.thumbprint) {
                    foundCert = cert;
                    return true;
                }
            });

            if (foundCert) {
                resolve(foundCert);
            } else {
                reject('Сертификат с хэшем: "' + hash + '" не найден');
            }
        }, reject);
    });
}

/**
 * Создает подпись base64 строки по hash'у сертификата
 *
 * @param {String} hash -- fingerprint (thumbprint) сертификата
 * @param {String} dataBase64 -- строковые данные в формате base64
 * @param {Boolean} signType -- тип подписи открепленная (true) / присоединенная (false) (default: true)
 * @returns {Promise} -- обещание, которое зарезолвится с данными о подписи {String}
 * */
function signData(hash, dataBase64, signType) {
    signType = typeof signType === 'undefined' ? true : Boolean(signType);

    return new Promise(function (resolve, reject) {
        getCadesCert(hash).then(function (cert) {
            eval(cryptoCommon.generateAsyncFn(function signData() {
                let clientTime = new Date(),
                    oAttrs = 'yield' + cryptoCommon.createObj('CADESCOM.CPAttribute'),
                    oSignedData = 'yield' + cryptoCommon.createObj('CAdESCOM.CadesSignedData'),
                    oSigner = 'yield' + cryptoCommon.createObj('CAdESCOM.CPSigner'),
                    attrs,
                    signature;

                clientTime = cryptoCommon.getDateObj(clientTime);

                try {
                    void('yield' + oAttrs.propset_Name(cryptoConstants.Time.AUTHENTICATED_ATTRIBUTE_SIGNING_TIME));
                    void('yield' + oAttrs.propset_Value(clientTime));
                } catch (err) {
                    reject('Ошибка при установке данных подписи: ' + err.message);
                    return;
                }

                // Задаем настройки для подписи
                try {
                    void('yield' + oSigner.propset_Certificate(cert));
                    attrs = 'yield' + oSigner.AuthenticatedAttributes2;
                    void('yield' + attrs.Add(oAttrs));
                    void('yield' + oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY));
                    void('yield' + oSignedData.propset_Content(dataBase64));
                    void('yield' + oSigner.propset_Options(cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_END_ENTITY_ONLY));
                } catch (err) {
                    reject('Не удалось установить настройки для подписи: ' + err.message);
                    return;
                }

                try {
                    signature = 'yield' + oSignedData.SignCades(
                        oSigner,
                        cadesplugin.CADESCOM_CADES_BES,
                        signType
                    );
                } catch (err) {
                    reject('Не удалось создать подпись: ' + err.message);
                    return;
                }

                resolve(signature);
            }));
        }, reject);
    });
}

/**
 * Создает подпись XML строки по hash'у сертификата
 *
 * @param {String} hash -- fingerprint (thumbprint) сертификата
 * @param {String} dataXML -- данные в формате XML
 * @returns {Promise} -- обещание, которое зарезолвится с данными о подписи {String}
 * */
function signDataXML(hash, dataXML) {
    return new Promise(function (resolve, reject) {
        getCadesCert(hash).then(function (cert) {
            eval(cryptoCommon.generateAsyncFn(function signDataXML() {
                let oSigner = 'yield' + cryptoCommon.createObj('CAdESCOM.CPSigner'),
                    signerXML = 'yield' + cryptoCommon.createObj('CAdESCOM.SignedXML'),
                    cnts = cryptoConstants,
                    signature;

                // Задаем настройки для подписи
                try {
                    void('yield' + oSigner.propset_Certificate(cert));
                    // Добавляем данные для подписи
                    void('yield' + signerXML.propset_Content(dataXML));
                    // Устанавливаем тип подписи
                    void('yield' + signerXML.propset_SignatureType(cnts.SignatureType.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED));
                    // Устанавливаем алгоритм подписи
                    void('yield' + signerXML.propset_SignatureMethod(cnts.GostXmlDSigUrls.XmlDsigGost3410Url));
                    // Устанавливаем алгоритм хэширования
                    void('yield' + signerXML.propset_DigestMethod(cnts.GostXmlDSigUrls.XmlDsigGost3411Url));
                } catch (err) {
                    reject('Не удалось установить настройки для подписи: ' + err.message);
                    return;
                }

                try {
                    signature = 'yield' + signerXML.Sign(oSigner);
                } catch (err) {
                    reject('Не удалось создать подпись: ' + err.message);
                    return;
                }

                resolve(signature);
            }));
        }, reject);
    });
}

/**
 * Возвращает информацию о версии CSP и плагина
 * */
function getSystemInfo() {
    let sysInfo = cryptoCommon.getEnvInfo();

    return new Promise(function (resolve, reject) {
        eval(cryptoCommon.generateAsyncFn(function getSystemInfo() {
            let e;

            try {
                e = 'yield' + cryptoCommon.createObj('CAdESCOM.About');

                sysInfo.cadesVersion = 'yield' + e.PluginVersion;
                // Возможен вызов в ранних версиях в виде sysInfo.cspVersion = 'yield' + e.CSPVersion('', 75);
                sysInfo.cspVersion = 'yield' + e.CSPVersion();

                if (!sysInfo.cadesVersion) {
                    sysInfo.cadesVersion = 'yield' + e.Version;
                }

                sysInfo.cadesVersion = 'yield' + sysInfo.cadesVersion.toString();
                sysInfo.cspVersion = 'yield' + sysInfo.cspVersion.toString();

                resolve(sysInfo);
            } catch (err) {
                reject('Ошибка при получении информации о системе: ', err.message);
            }
        }));
    });
}

/**
 * Promise обертка для синхронного вызова проверки версии CSP
 * */
function isValidCSPVersion(version) {
    return new Promise(function (resolve) {
        resolve(cryptoCommon.isValidCSPVersion(version));
    });
}

/**
 * Promise обертка для синхронного вызова проверки версии плагина
 * */
function isValidCadesVersion(version) {
    return new Promise(function (resolve) {
        resolve(cryptoCommon.isValidCadesVersion(version));
    });
}

module.exports = {
    isValidEDSSettings: isValidEDSSettings,
    getCertsList: getCertsList,
    getCadesCert: getCadesCert,
    decrypt: decrypt,
    getCert: getCert,
    signData: signData,
    signDataXML: signDataXML,
    getSystemInfo: getSystemInfo,
    isValidCSPVersion: isValidCSPVersion,
    isValidCadesVersion: isValidCadesVersion
};