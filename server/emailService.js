const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: "../.env" });

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS, // your gmail password
    },
  });
};

// Send availability reminder email
const sendAvailabilityReminderEmail = async (
  userEmail,
  userId,
  daysSinceUpdate
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: userEmail,
      subject: "Availability Update Reminder - Cal.com",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Availability Update Reminder</h2>
          
          <p>Hi there,</p>
          
          <p>We noticed that your availability hasn't been updated in <strong>${
            daysSinceUpdate === "Never updated"
              ? "a while"
              : `${daysSinceUpdate} days`
          }</strong>.</p>
          
          <p>To ensure your calendar stays accurate and you don't miss any important bookings, please take a moment to update your availability.</p>
          
          <div style="margin: 30px 0;">
            <a href="https://cal.com/availability" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Update My Availability
            </a>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
          
          <p>Best regards,<br>
          The Gratia Team</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            User ID: ${userId}<br>
            This is an automated reminder. If you believe you received this email in error, please contact support.
          </p>
        </div>
      `,
      text: `
        Availability Update Reminder
        
        Hi there,
        
        We noticed that your availability hasn't been updated in ${
          daysSinceUpdate === "Never updated"
            ? "a while"
            : `${daysSinceUpdate} days`
        }.
        
        To ensure your calendar stays accurate and you don't miss any important bookings, please take a moment to update your availability.
        
        Visit: https://cal.com/availability
        
        If you have any questions or need assistance, please don't hesitate to reach out to our support team.
        
        Best regards,
        The Gratia Team
        
        User ID: ${userId}
        This is an automated reminder. If you believe you received this email in error, please contact support.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${userEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${userEmail}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAvailabilityReminderEmail,
};
