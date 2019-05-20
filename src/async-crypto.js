function PluginInstaled() {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(function*(args) {
      try {
        var cadesabout = yield cadesplugin.CreateObjectAsync('CAdESCOM.About');
        resolve(true);
      } catch (err) {
        const mimetype = navigator.mimeTypes['application/x-cades'];
        if (mimetype) {
          var plugin = mimetype.enabledPlugin;
          if (plugin) {
            resolve(true);
          }
        } else {
          reject(err);
        }
      }
    });
  });
}

function GetErrorMessage(e) {
  var err = e.message;

  if (!err) {
    err = e;
  } else if (e.number) {
    err += ' (' + e.number + ')';
  }

  return err;
}

function Verify(signedMessage, data) {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(
      function*(args) {
        try {
          var cadesSignedData = yield cadesplugin.CreateObjectAsync(
            'CAdESCOM.CadesSignedData'
          );

          yield cadesSignedData.propset_ContentEncoding(
            cadesplugin.CADESCOM_BASE64_TO_BINARY
          );
          yield cadesSignedData.propset_Content(data);

          yield cadesSignedData.VerifyCades(
            signedMessage,
            cadesplugin.CADESCOM_CADES_BES,
            true
          );

          args[2](true);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      },
      signedMessage,
      data,
      resolve,
      reject
    );
  });
}

function VerifyXml(signedMessage) {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(
      function*(args) {
        try {
          var cadesSignedXml = yield cadesplugin.CreateObjectAsync(
            'CAdESCOM.SignedXML'
          );

          yield cadesSignedXml.Verify(signedMessage);

          args[2](true);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      },
      signedMessage,
      resolve,
      reject
    );
  });
}

function Sign(subjectName, data) {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(
      function*(args) {
        try {
          var certificateStore = yield cadesplugin.CreateObjectAsync(
            'CAPICOM.Store'
          );

          yield certificateStore.Open(
            cadesplugin.CAPICOM_CURRENT_USER_STORE,
            cadesplugin.CAPICOM_MY_STORE,
            cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
          );

          var certificatesObj = yield certificateStore.Certificates;

          var certificates = yield certificatesObj.Find(
            cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
            subjectName
          );

          var certificateSerial = '';
          var certificateValidDateTo = '';
          var count = yield certificates.Count;

          for (var i = 1; i <= count; i++) {
            try {
              var certificate = yield certificates.Item(i);

              certificateSerial = yield certificate.SerialNumber;
              certificateValidDateTo = yield certificate.ValidToDate;

              if (new Date(certificateValidDateTo) < Date.now()) {
                continue;
              }

              var signer = yield cadesplugin.CreateObjectAsync(
                'CAdESCOM.CPSigner'
              );

              yield signer.propset_Certificate(certificate);
              yield signer.propset_TSAAddress('http://cryptopro.ru/tsp/');

              var cadesSignedData = yield cadesplugin.CreateObjectAsync(
                'CAdESCOM.CadesSignedData'
              );
              yield cadesSignedData.propset_ContentEncoding(
                cadesplugin.CADESCOM_BASE64_TO_BINARY
              );
              yield cadesSignedData.propset_Content(data);

              var signedMessage = yield cadesSignedData.SignCades(
                signer,
                cadesplugin.CADESCOM_CADES_BES,
                true
              );
              //var verified = yield verify(signedMessage, data);

              yield certificateStore.Close();

              //if (verified) {
              args[2](signedMessage);
              resolve(true);
              return;
              //}
            } catch (err) {
              console.log(err, {
                serialNumber: certificateSerial,
                validToDate: certificateValidDateTo
              });
            }
          }

          yield certificateStore.Close();

          const errorMessage = 'Не найден подходящий сертификат';

          console.log(errorMessage, {
            subjectName: subjectName
          });

          reject(errorMessage);
        } catch (err) {
          console.log(err);
          reject(err);
        }
      },
      subjectName,
      data,
      resolve,
      reject
    );
  });
}

function SignXml(subjectName, xml) {
  return new Promise(function(resolve, reject) {
    cadesplugin.async_spawn(
      function*(args) {
        try {
          var certificateStore = yield cadesplugin.CreateObjectAsync(
            'CAPICOM.Store'
          );

          yield certificateStore.Open(
            cadesplugin.CAPICOM_CURRENT_USER_STORE,
            cadesplugin.CAPICOM_MY_STORE,
            cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
          );

          var certificatesObj = yield certificateStore.Certificates;

          var certificates = yield certificatesObj.Find(
            cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
            subjectName
          );

          var certificateSerial = '';
          var certificateValidDateTo = '';
          var count = yield certificates.Count;

          for (var i = 1; i <= count; i++) {
            try {
              var certificate = yield certificates.Item(i);

              certificateSerial = yield certificate.SerialNumber;
              certificateValidDateTo = yield certificate.ValidToDate;

              if (new Date(certificateValidDateTo) < Date.now()) {
                continue;
              }

              var signer = yield cadesplugin.CreateObjectAsync(
                'CAdESCOM.CPSigner'
              );

              yield signer.propset_Certificate(certificate);

              xml =
                '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<!-- \n' +
                ' Original XML doc file for sign example. \n' +
                '-->\n' +
                '<Envelope xmlns="urn:envelope">\n' +
                '  <Data>\n' +
                '   Hello, World!\n' +
                '  </Data>\n' +
                '  <Node xml:id="nodeID">\n' +
                '   Hello, Node!\n' +
                '  </Node>\n' +
                ' \n' +
                '</Envelope>';

              var cadesSignedXml = yield cadesplugin.CreateObjectAsync(
                'CAdESCOM.SignedXML'
              );
              yield cadesSignedXml.propset_Content(xml);
              yield cadesSignedXml.propset_SignatureType(
                cadesplugin.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPING
              );
              yield cadesSignedXml.propset_SignatureMethod(
                cadesplugin.XmlDsigGost3410Url
              );
              yield cadesSignedXml.propset_DigestMethod(
                cadesplugin.XmlDsigGost3411Url
              );

              var signedMessage = yield cadesSignedXml.Sign(signer);
              var verified = yield verifyXml(signedMessage);

              yield certificateStore.Close();

              if (verified) {
                args[2](signedMessage);
                resolve(true);
                return;
              }
            } catch (err) {
              console.log(err, {
                serialNumber: certificateSerial,
                validToDate: certificateValidDateTo
              });
            }
          }

          yield certificateStore.Close();

          const errorMessage = 'Не найден подходящий сертификат';

          console.log(errorMessage, {
            subjectName: subjectName
          });

          reject(errorMessage);
        } catch (err) {
          console.log(err);
          reject(err);
        }
      },
      subjectName,
      xml,
      resolve,
      reject
    );
  });
}

function Decrypt(subjectName, data) {
  return new Promise(function(resolve, reject) {
    cadesplugin.async_spawn(
      function*(args) {
        try {
          var certificateStore = yield cadesplugin.CreateObjectAsync(
            'CAPICOM.Store'
          );

          yield certificateStore.Open(
            cadesplugin.CAPICOM_CURRENT_USER_STORE,
            cadesplugin.CAPICOM_MY_STORE,
            cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
          );

          var certificatesObj = yield certificateStore.Certificates;

          var certificates = yield certificatesObj.Find(
            cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
            subjectName
          );

          var certificateSerial = '';
          var certificateValidDateTo = '';
          var count = yield certificates.Count;

          for (var i = 1; i <= count; i++) {
            try {
              var certificate = yield certificates.Item(i);

              certificateSerial = yield certificate.SerialNumber;
              certificateValidDateTo = yield certificate.ValidToDate;

              if (new Date(certificateValidDateTo) < Date.now()) {
                continue;
              }

              var envelopedData = yield cadesplugin.CreateObjectAsync(
                'CAdESCOM.CPEnvelopedData'
              );

              var recipientsObj = yield envelopedData.Recipients;
              yield recipientsObj.Clear();
              yield recipientsObj.Add(certificate);

              yield envelopedData.propset_ContentEncoding(
                cadesplugin.CADESCOM_BASE64_TO_BINARY
              );
              yield envelopedData.Decrypt(data);
              var decriptedData = yield envelopedData.Content;

              yield certificateStore.Close();

              args[2](decriptedData);
              resolve(true);
              return;
            } catch (err) {
              console.log(err, {
                serialNumber: certificateSerial,
                validToDate: certificateValidDateTo
              });
            }
          }

          const errorMessage = 'Не найден подходящий сертификат';

          console.log(errorMessage, {
            subjectName: subjectName
          });

          yield certificateStore.Close();
          reject(errorMessage);
        } catch (err) {
          console.log(err);
          reject(err);
        }
      },
      subjectName,
      data,
      resolve,
      reject
    );
  });
}

function CertificateParser() {
  extract = (from, what) => {
    certName = '';

    var begin = from.indexOf(what);
    if (begin >= 0) {
      var end = from.indexOf(', ', begin);
      certName = end < 0 ? from.substr(begin) : from.substr(begin, end - begin);
    }

    return certName;
  };

  print2Digit = (digit) => {
    return digit < 10 ? '0' + digit : digit;
  };

  getCertificateDate = (paramDate) => {
    const date = new Date(paramDate);

    returnprint2Digit(date.getUTCDate()) +
    '.' +
    print2Digit(date.getMonth() + 1) +
    '.' +
    date.getFullYear() +
    ' ' +
    print2Digit(date.getUTCHours()) +
    ':' +
    print2Digit(date.getUTCMinutes()) +
    ':' +
    print2Digit(date.getUTCSeconds());
  };

  getCertificateName = (subjectName) => {
    returnextract(subjectName, 'CN=');
  };

  getIssuer = (issuerName) => {
    returnextract(issuerName, 'CN=');
  };

  getCertificateInfoString = (subjectName, fromDate, issuedBy) => {
    returnextract(subjectName, 'CN=') +
    '; Выдан: ' +
    getCertificateDate(fromDate) +
    ' ' +
    issuedBy;
  };
}

function GetCertificate(subjectName) {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(function*(args) {
      try {
        var certificateStore = yield cadesplugin.CreateObjectAsync(
          'CAPICOM.Store'
        );

        yield certificateStore.Open(
          cadesplugin.CAPICOM_CURRENT_USER_STORE,
          cadesplugin.CAPICOM_MY_STORE,
          cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
        );

        var certificatesObj = yield certificateStore.Certificates;

        var certificates = yield certificatesObj.Find(
          cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
          subjectName
        );

        var certificateSerial = '';
        var certificateValidDateTo = '';
        var count = yield certificates.Count;

        for (var i = 1; i <= count; i++) {
          try {
            var certificate = yield certificates.Item(i);

            certificateSerial = yield certificate.SerialNumber;
            certificateValidDateTo = yield certificate.ValidToDate;

            if (new Date(certificateValidDateTo) < Date.now()) {
              continue;
            }

            var exportedCertificate = yield certificate.Export(
              cadesplugin.CAPICOM_ENCODE_BASE64
            );

            yield certificateStore.Close();
            resolve(exportedCertificate);
            return;
          } catch (err) {
            console.log(err, {
              serialNumber: certificateSerial,
              validToDate: certificateValidDateTo
            });
          }
        }

        yield certificateStore.Close();

        const errorMessage = 'Не найден подходящий сертификат';

        console.log(errorMessage, {
          subjectName: certSubjectName
        });

        reject(errorMessage);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  });
}

function GetCertificates() {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(function*(args) {
      if (resolve) {
        console.log('cadesplugin', cadesplugin);
        var certificateStore = yield cadesplugin.CreateObjectAsync('CAPICOM.Store');

        yield certificateStore.Open(
          cadesplugin.CAPICOM_CURRENT_USER_STORE,
          cadesplugin.CAPICOM_MY_STORE,
          cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
        );

        var certificatesObj = yield certificateStore.Certificates;
        var certificateCount = yield certificatesObj.Count;
        var certList = {};

        if (certificateCount === 0) {
          certList.globalCountCertificate = 0;
          reject({ certListNotFound: true });
          return;
        }

        if (!Array.isArray(certList.globalOptionList)) {
          certList.globalOptionList = [];
        }

        var dateObj = new Date();
        var count = 0;

        for (var i = 1; i <= certificateCount; i++) {
          var cert = yield certificatesObj.Item(i);

          var validToDate = new Date(yield cert.ValidToDate);
          var validFromDate = new Date(yield cert.ValidFromDate);

          var hasPrivateKey = yield cert.HasPrivateKey();
          var validator = yield cert.IsValid();
          var isValid = yield validator.Result;

          if (dateObj < new Date(validToDate) && isValid && hasPrivateKey) {
            var issuedBy = yield cert.GetInfo(1);
            issuedBy = issuedBy || '';

            var parser = new CertificateParser();
            const text = parser.getCertificateInfoString(
              yield cert.SubjectName,
              validFromDate,
              issuedBy
            );

            certList.globalOptionList.push({
              value: text.replace(/^cn=([^;]+);.+/i, '$1'),
              text: text.replace('CN=', '')
            });

            count++;
          }
        }

        yield certificateStore.Close();
        certList.globalCountCertificate = count;
        resolve(certList.globalOptionList, certList);
      } else reject('Ошибка с сертификатами');
    });
  });
}

module.exports = {
  PluginInstaled: PluginInstaled,
  GetErrorMessage: GetErrorMessage,
  Verify: Verify,
  VerifyXml: VerifyXml,
  Sign: Sign,
  SignXml: SignXml,
  Decrypt: Decrypt,
  CertificateParser: CertificateParser,
  GetCertificate: GetCertificate,
  GetCertificates: GetCertificates
}