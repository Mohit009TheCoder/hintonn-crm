import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

export const sendOtpEmail = async (to, otp) => {
  // If SMTP is not fully configured, just log to console so the end-to-end flow works immediately without crashing
  if (!process.env.SMTP_USER) {
    console.log(`\n\n======================================================`);
    console.log(`🔑 OTP for ${to}: [ ${otp} ]`);
    console.log(`(To send real emails, configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env)`);
    console.log(`======================================================\n\n`);
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: `"Hintonn AI CRM" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your Password Reset OTP',
      text: `Your OTP to reset your password is: ${otp}\nIt is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Use the OTP below to set a new password.</p>
          <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #EFF6FF; color: #2563EB; display: inline-block; border-radius: 6px; letter-spacing: 2px;">
            ${otp}
          </div>
          <p style="color: #64748B; font-size: 13px;">If you did not request this, please ignore this email. This OTP is valid for 10 minutes.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('Error sending OTP email:', err);
    throw new Error('Failed to send email. Check SMTP configuration.');
  }
};
