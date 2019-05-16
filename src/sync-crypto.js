function GetErrorMessage(e) {
  var err = e.message;
  if (!err) {
    err = e;
  } else if (e.number) {
    err += " (" + e.number + ")";
  }
  return err;
}

function sign(subjectName, data) {

  var certificateStore = cadesplugin.CreateObject("CAPICOM.Store");

  try {

    certificateStore.Open(
      cadesplugin.CAPICOM_CURRENT_USER_STORE,
      cadesplugin.CAPICOM_MY_STORE,
      cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
    );

    var certificates = certificateStore.Certificates.Find(
      cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
      subjectName
    );

    if (certificates.Count === 0) {
      return "Certificate not found: " + subjectName;
    }

    var certificateSerial = '';
    var certificateValidDateTo = '';

    for (var i = 1; i <= certificates.Count; i++) {
      try {
        var certificate = certificates.Item(i);

        certificateSerial = certificate.SerialNumber;
        certificateValidDateTo = certificate.ValidToDate;

        if (new Date(certificateValidDateTo) < Date.now()) {
          continue;
        }

        var signer = cadesplugin.CreateObject("CAdESCOM.CPSigner");
        signer.Certificate = certificate;
        signer.TSAAddress = "http://cryptopro.ru/tsp/";

        var cadesSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
        cadesSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
        cadesSignedData.Content = data;

        var signedMessage = cadesSignedData.SignCades(signer, cadesplugin.CADESCOM_CADES_BES, true);
        return signedMessage;

      } catch (e) {
        console.log('Ошибка при подписании договора сертификатом', {
          serialNumber: certificateSerial,
          validToDate: certificateValidDateTo
        });
      }
    }
  }
  catch (err) {
    console.log(err);
  }
  finally {
    certificateStore.Close();
  }
}

function decrypt(subjectName, data) {

  var certificateStore = cadesplugin.CreateObject("CAPICOM.Store");

  try {
    certificateStore.Open(
      cadesplugin.CAPICOM_CURRENT_USER_STORE,
      cadesplugin.CAPICOM_MY_STORE,
      cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
    );

    var certificates = certificateStore.Certificates.Find(
      cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
      subjectName
    );

    if (certificates.Count === 0) {
      return "Certificate not found: " + subjectName;
    }

    var certificateSerial = '';
    var certificateValidDateTo = '';

    for (var i = 1; i <= certificates.Count; i++) {
      try {
        var certificate = certificates.Item(i);

        certificateSerial = certificate.SerialNumber;
        certificateValidDateTo = certificate.ValidToDate;

        if (new Date(certificateValidDateTo) < Date.now()) {
          continue;
        }

        var envelopedData = cadesplugin.CreateObject('CAdESCOM.CPEnvelopedData');

        var recipientsObj = envelopedData.Recipients;
        recipientsObj.Clear();
        recipientsObj.Add(certificate);

        envelopedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
        envelopedData.Decrypt(data);

        var decriptedData = envelopedData.Content;
        return decriptedData;
      } catch (e) {
        console.log('Ошибка при декодировании данных', {
          serialNumber: certificateSerial,
          validToDate: certificateValidDateTo
        });
      }
    }
  }
  catch (err) {
    console.log(err);
  }
  finally {
    certificateStore.Close();
  }
}

function getCertificate(subjectName) {
  var certificateStore = cadesplugin.CreateObject("CAPICOM.Store");
  try {

    certificateStore.Open(
      cadesplugin.CAPICOM_CURRENT_USER_STORE,
      cadesplugin.CAPICOM_MY_STORE,
      cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
    );

    var certificates = certificateStore.Certificates.Find(
      cadesplugin.CAPICOM_CERTIFICATE_FIND_SUBJECT_NAME,
      subjectName
    );

    var certificateSerial = '';
    var certificateValidDateTo = '';
    var count = certificates.Count;

    for (var i = 1; i <= count; i++) {
      try {
        var certificate = certificates.Item(i);

        certificateSerial = certificate.SerialNumber;
        certificateValidDateTo = certificate.ValidToDate;

        if (new Date(certificateValidDateTo) < Date.now()) {
          continue;
        }

        var exportedCertificate = certificate.Export(cadesplugin.CAPICOM_ENCODE_BASE64);

        certificateStore.Close();
        return exportedCertificate;
      }
      catch (err) {
        console.log(err, {
          serialNumber: certificateSerial,
          validToDate: certificateValidDateTo
        });
      }
    }

    certificateStore.Close();

    var errorMessage = 'Не найден подходящий сертификат';

    console.log(errorMessage, {
      subjectName: certSubjectName
    });

    return errorMessage;
  } catch (err) {
    console.log(err);
  }
  finally {
    certificateStore.Close();
  }
}

function getCertificates() {
  var certList = [];
  var date = new Date();
  var certificatesCount;
  var certificateStore;
  var cert;

  try {
    certificateStore = cadesplugin.CreateObject("CAdESCOM.Store");
    certificateStore.Open(
      cadesplugin.CAPICOM_CURRENT_USER_STORE,
      cadesplugin.CAPICOM_MY_STORE,
      cadesplugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
    );
  } catch (ex) {
    return "Ошибка при открытии хранилища: " + GetErrorMessage(ex);
  }

  try {
    certificatesCount = certificateStore.Certificates.Count;
    if (certificatesCount === 0) {
      return certList;
    }

  } catch (ex) {

    var message = GetErrorMessage(ex);

    if ("Cannot find object or property. (0x80092004)" === message ||
      "oStore.Certificates is undefined" === message ||
      "Объект или свойство не найдено. (0x80092004)" === message) {
      certificateStore.Close();
      return message;
    }
  }

  for (var i = 1; i <= certificatesCount; i++) {

    try {
      cert = certificateStore.Certificates.Item(i);
    } catch (ex) {
      return "Ошибка при перечислении сертификатов: " + GetErrorMessage(ex);
    }

    try {

      if (date < cert.ValidToDate && cert.HasPrivateKey() && cert.IsValid().Result) {
        var issuedBy = cert.GetInfo(1);
        issuedBy = issuedBy || "";

        var certObj = new CertificateObj(cert);
        var text = certObj.GetCertString();

        certList.push({
          'value': text.replace(/^cn=([^;]+);.+/i, '$1'),
          'text': text.replace("CN=", "") + " " + issuedBy
        });
      } else {
        continue;
      }
    } catch (ex) {
      return "Ошибка при получении свойства SubjectName: " + GetErrorMessage(ex);
    }
  }

  certificateStore.Close();
  return certList;
}

function CertificateObj(certObj) {
  this.cert = certObj;
  this.certFromDate = new Date(this.cert.ValidFromDate);
  this.certTillDate = new Date(this.cert.ValidToDate);
}

CertificateObj.prototype.check = function (digit) {
  return (digit < 10) ? "0" + digit : digit;
}

CertificateObj.prototype.extract = function (from, what) {
  var certName = "";
  var begin = from.indexOf(what);

  if (begin >= 0) {
    var end = from.indexOf(', ', begin);
    certName = (end < 0) ? from.substr(begin) : from.substr(begin, end - begin);
  }

  return certName;
}

CertificateObj.prototype.DateTimePutTogether = function (certDate) {
  return this.check(certDate.getUTCDate()) + "." + this.check(certDate.getMonth() + 1) + "." + certDate.getFullYear() + " " +
    this.check(certDate.getUTCHours()) + ":" + this.check(certDate.getUTCMinutes()) + ":" + this.check(certDate.getUTCSeconds());
}

CertificateObj.prototype.GetCertString = function () {
  return this.extract(this.cert.SubjectName, 'CN=') + "; Выдан: " + this.GetCertFromDate();
}

CertificateObj.prototype.GetCertFromDate = function () {
  return this.DateTimePutTogether(this.certFromDate);
}

CertificateObj.prototype.GetCertTillDate = function () {
  return this.DateTimePutTogether(this.certTillDate);
}

CertificateObj.prototype.GetPubKeyAlgorithm = function () {
  return this.cert.PublicKey().Algorithm.FriendlyName;
}

CertificateObj.prototype.GetCertName = function () {
  return this.extract(this.cert.SubjectName, 'CN=');
}

CertificateObj.prototype.GetIssuer = function () {
  return this.extract(this.cert.IssuerName, 'CN=');
}

CertificateObj.prototype.GetPrivateKeyProviderName = function () {
  return this.cert.PrivateKey.ProviderName;
}

var SyncCrypro = {
  GetErrorMessage: GetErrorMessage,
  sign: sign,
  decrypt: decrypt,
  getCertificate: getCertificate,
  getCertificates: getCertificates,
  CertificateObj: CertificateObj,
};

module.exports = SyncCrypro;