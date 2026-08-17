const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

exports.health = onCall({ region: 'us-central1' }, (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  return {
    ok: true,
    uid: request.auth.uid,
    service: 'ttd-online',
    schemaVersion: 1
  };
});
