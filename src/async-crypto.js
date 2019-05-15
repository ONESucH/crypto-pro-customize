function pluginInstaled() {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(function* (args) {
      try {
        let cadesabout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
        resolve(true);
      } catch (err) {
        const mimetype = navigator.mimeTypes["application/x-cades"];
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

function getErrorMessage(e) {
  let err = e.message;
  
  if (!err) {
    err = e;
  } else if (e.number) {
    err += " (" + e.number + ")";
  }

  return err;
}

function verify(signedMessage, data) {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(function* (args) {
      try {
        let cadesSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");

        yield cadesSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
        yield cadesSignedData.propset_Content(data);

        yield cadesSignedData.VerifyCades(
          signedMessage, 
          cadesplugin.CADESCOM_CADES_BES, 
          true
        );        

        args[2](true);
        resolve(true);
      }
      catch (err) {
        reject(err);
      }
    }, signedMessage, data, resolve, reject);
  });
}

function verifyXml(signedMessage) {
  return new Promise((resolve, reject) => {
    cadesplugin.async_spawn(function* (args) {
      try {
        let cadesSignedXml = yield cadesplugin.CreateObjectAsync("CAdESCOM.SignedXML");

        yield cadesSignedXml.Verify(signedMessage);

        args[2](true);
        resolve(true);
      }
      catch (err) {
        reject(err);
      }
    }, signedMessage, resolve, reject);
  });
}

function sign(subjectName, data) {
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
          cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, 
          subjectName
        );

        let certificateSerial = '';
        let certificateValidDateTo = '';
        let count = yield certificates.Count;

        for (var i = 1; i <= count; i++) {
          try {
            let certificate = yield certificates.Item(i);

            certificateSerial = yield certificate.SerialNumber;
            certificateValidDateTo = yield certificate.ValidToDate;

            if (new Date(certificateValidDateTo) < Date.now()) {
              continue;
            }

            let signer = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");

            yield signer.propset_Certificate(certificate);
            yield signer.propset_TSAAddress('http://cryptopro.ru/tsp/');

            let cadesSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            yield cadesSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
            yield cadesSignedData.propset_Content(data);            

            let signedMessage = yield cadesSignedData.SignCades(signer, cadesplugin.CADESCOM_CADES_BES, true);
            //let verified = yield verify(signedMessage, data);

            yield certificateStore.Close();

            //if (verified) {
              args[2](signedMessage);
              resolve(true);
              return;
            //}            
          }
          catch (err) {
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
    }, subjectName, data, resolve, reject);
  });
}

function signXml(subjectName, xml) {
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
          cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, 
          subjectName
        );        

        let certificateSerial = '';
        let certificateValidDateTo = '';
        let count = yield certificates.Count;

        for (var i = 1; i <= count; i++) {
          try {
            let certificate = yield certificates.Item(i);

            certificateSerial = yield certificate.SerialNumber;
            certificateValidDateTo = yield certificate.ValidToDate;

            if (new Date(certificateValidDateTo) < Date.now()) {
              continue;
            }

            let signer = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");

            yield signer.propset_Certificate(certificate);

            xml =
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<!-- \n" +
            " Original XML doc file for sign example. \n" +
            "-->\n" +
            "<Envelope xmlns=\"urn:envelope\">\n" +
            "  <Data>\n" +
            "   Hello, World!\n" +
            "  </Data>\n" +
            "  <Node xml:id=\"nodeID\">\n" +
            "   Hello, Node!\n" +
            "  </Node>\n" +
            " \n" +
            "</Envelope>";

            let cadesSignedXml = yield cadesplugin.CreateObjectAsync("CAdESCOM.SignedXML");            
            yield cadesSignedXml.propset_Content(xml);
            yield cadesSignedXml.propset_SignatureType(cadesplugin.CADESCOM_XML_SIGNATURE_TYPE_ENVELOPING);
            yield cadesSignedXml.propset_SignatureMethod(cadesplugin.XmlDsigGost3410Url);
            yield cadesSignedXml.propset_DigestMethod(cadesplugin.XmlDsigGost3411Url);

            let signedMessage = yield cadesSignedXml.Sign(signer);
            let verified = yield verifyXml(signedMessage);

            yield certificateStore.Close();

            if (verified) {
              args[2](signedMessage);
              resolve(true);
              return;
            }            
          }
          catch (err) {
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
    }, subjectName, xml, resolve, reject);
  });
}

function decrypt(subjectName, data) {
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
          cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, 
          subjectName
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
    }, subjectName, data, resolve, reject);
  });
}

function CertificateParser() {
  this.extract = (from, what) => {
    certName = '';

    let begin = from.indexOf(what);
    if (begin >= 0) {
      let end = from.indexOf(', ', begin);
      certName = (end < 0) ? from.substr(begin) : from.substr(begin, end - begin);
    }

    return certName;
  };

  this.print2Digit = (digit) => {
    return (digit < 10) ? '0' + digit : digit;
  };

  this.getCertificateDate = (paramDate) => {
    const date = new Date(paramDate);

    return this.print2Digit(date.getUTCDate()) + "." + this.print2Digit(date.getMonth() + 1) + "." + date.getFullYear() + " " +
      this.print2Digit(date.getUTCHours()) + ":" + this.print2Digit(date.getUTCMinutes()) + ":" + this.print2Digit(date.getUTCSeconds());
  };

  this.getCertificateName = (subjectName) => {
    return this.extract(subjectName, 'CN=');
  };

  this.getIssuer = (issuerName) => {
    return this.extract(issuerName, 'CN=');
  };

  this.getCertificateInfoString = (subjectName, fromDate, issuedBy) => {
    return this.extract(subjectName, 'CN=') + "; Выдан: " + this.getCertificateDate(fromDate) + " " + issuedBy;
  };
}

function getCertificate(subjectName) {
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
          cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME, 
          subjectName
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

            let exportedCertificate = yield certificate.Export(cadesplugin.CAPICOM_ENCODE_BASE64);

            yield certificateStore.Close();            
            resolve(exportedCertificate);
            return;
          }
          catch (err) {
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

function getCertificates() {  
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
        let certificateCount = yield certificatesObj.Count;
        let certList = {};

        if (certificateCount === 0) {
          certList.globalCountCertificate = 0;
          reject({ certListNotFound: true });
          return;
        }

        if (!Array.isArray(certList.globalOptionList)) {
          certList.globalOptionList = [];
        }

        let dateObj = new Date();
        let count = 0;

        for (let i = 1; i <= certificateCount; i++) {
          let cert = yield certificatesObj.Item(i);

          let validToDate = new Date((yield cert.ValidToDate));
          let validFromDate = new Date((yield cert.ValidFromDate));

          let hasPrivateKey = yield cert.HasPrivateKey();
          let validator = yield cert.IsValid();
          let isValid = yield validator.Result;

          if (dateObj < new Date(validToDate) && isValid && hasPrivateKey) {
            let issuedBy = yield cert.GetInfo(1);
            issuedBy = issuedBy || "";

            let parser = new CertificateParser();
            const text = parser.getCertificateInfoString(yield cert.SubjectName, validFromDate, issuedBy);

            certList.globalOptionList.push({
              'value': text.replace(/^cn=([^;]+);.+/i, '$1'),
              'text': text.replace("CN=", "")
            });

            count++;
          }
        }

        yield certificateStore.Close();
        certList.globalCountCertificate = count;
        resolve(certList.globalOptionList, certList);

      } catch (err) {
        reject(err);
      }
    });
  });
}
