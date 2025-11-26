// utils/twilioClient.js
const Twilio = require('twilio');
const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (to, body) => {
  try {
    const msg = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE,
      to
    });
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error('Twilio error', err.message || err);
    return { success: false, error: err.message || err };
  }
};

module.exports = { sendSMS };
