const nodemailer = require('nodemailer');

/**
 * Fungsi untuk mengirim email
 * @param {Object} options - Opsi email
 * @param {String} options.email - Alamat email penerima
 * @param {String} options.subject - Subjek email
 * @param {String} options.message - Isi email (HTML)
 */
const sendEmail = async (options) => {
  // Buat transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' ? true : false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  // Opsi email
  const mailOptions = {
    from: `${process.env.FROM_NAME || 'SantaraTrip'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };

  // Kirim email
  const info = await transporter.sendMail(mailOptions);
  
  console.log(`Email sent: ${info.messageId}`);
  
  return info;
};

module.exports = sendEmail;
