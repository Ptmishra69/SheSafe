// controllers/alertController.js
const SOSAlert = require('../models/SOSAlert');
const { sendSMS } = require('../utils/twilioClient');
const DangerZone = require('../models/DangerZone');

exports.triggerSOS = async (req, res) => {
  try {
    const { lat, lng, contacts } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'Coordinates required' });

    // create SOS record
    const sos = await SOSAlert.create({
      user: req.user._id,
      location: { type: 'Point', coordinates: [lng, lat] },
      contactsNotified: contacts || []
    });

    // Attempt to send messages synchronously (will fail if no network)
    const message = `SOS! ${req.user.name} needs help. Location: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    let sentTo = [];
    let policeSent = false;

    // send to emergency contacts
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        const result = await sendSMS(c, message);
        if (result.success) sentTo.push(c);
      }
    }

    // send to police configured number
    const policeNumber = process.env.POLICE_CONTACT;
    if (policeNumber) {
      const r = await sendSMS(policeNumber, `[SheSafe SOS] ${message}`);
      if (r.success) policeSent = true;
    }

    sos.contactsNotified = sentTo;
    sos.policeNotified = policeSent;
    sos.status = sentTo.length > 0 || policeSent ? 'sent' : 'failed';
    await sos.save();

    res.json({ message: 'SOS processed', sos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// scheduled retry: resend pending SOS alerts (a simple in-memory interval, see server.js)
exports.retryPendingAlerts = async () => {
  try {
    const pending = await SOSAlert.find({ status: 'failed' });
    for (const p of pending) {
      // build message
      const [lng, lat] = p.location.coordinates;
      const msg = `SOS! Location: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const contacts = p.contactsNotified || [];
      let succeedAny = false;
      for (const c of contacts) {
        const r = await sendSMS(c, msg);
        if (r.success) succeedAny = true;
      }
      if (!p.policeNotified && process.env.POLICE_CONTACT) {
        const r2 = await sendSMS(process.env.POLICE_CONTACT, `[SheSafe SOS] ${msg}`);
        if (r2.success) succeedAny = true;
      }
      if (succeedAny) {
        p.status = 'sent';
        await p.save();
      }
    }
  } catch (err) {
    console.error('Retry pending alerts error', err);
  }
};
