const cron = require("node-cron");
const { query } = require("./db");
const {
  sendAvailabilityReminderEmail,
  sendAdminSummaryEmail,
} = require("./emailService");

// Daily availability check cron job - runs every morning at 8 AM
const scheduleDailyAvailabilityCheck = () => {
  // 0 8 * * * = every day at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("Running daily availability check job at 8 AM...");

    try {
      // Find users whose availability hasn't been updated in over 30 days
      const users = await query(`
        SELECT * FROM gratia.cal_user_availability 
        WHERE "availabilityLastUpdated" < NOW() - INTERVAL '30 days'
      `);

      if (users.rows.length > 0) {
        console.log("Users requiring attention:");

        // Process each user and send emails
        const emailResults = [];

        for (const user of users.rows) {
          try {
            const daysSinceUpdate = user.availabilityLastUpdated
              ? Math.floor(
                  (new Date() - new Date(user.availabilityLastUpdated)) /
                    (1000 * 60 * 60 * 24)
                )
              : "Never updated";

            console.log(
              `- User ID: ${user.userId}, Last Updated: ${
                user.availabilityLastUpdated
              }, Email: ${user.email || "N/A"}, Days: ${daysSinceUpdate}`
            );

            // Send email if user has an email address
            if (user.email) {
              console.log(`Sending reminder email to ${user.email}...`);
              const emailResult = await sendAvailabilityReminderEmail(
                user.email,
                user.userId,
                daysSinceUpdate
              );

              emailResults.push({
                userId: user.userId,
                email: user.email,
                ...emailResult,
              });

              if (emailResult.success) {
                console.log(`✅ Email sent successfully to ${user.email}`);
              } else {
                console.log(
                  `❌ Failed to send email to ${user.email}: ${emailResult.error}`
                );
              }
            } else {
              console.log(
                `⚠️  No email address for user ${user.userId}, skipping email`
              );
              emailResults.push({
                userId: user.userId,
                email: null,
                success: false,
                error: "No email address",
              });
            }

            // Add a small delay between emails to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (userError) {
            console.error(`Error processing user ${user.userId}:`, userError);
            emailResults.push({
              userId: user.userId,
              email: user.email,
              success: false,
              error: userError.message,
            });
          }
        }

        // Send summary email to admin
        console.log("Sending admin summary email...");
        const adminEmailResult = await sendAdminSummaryEmail(
          users.rows.map((user) => ({
            ...user,
            daysSinceUpdate: user.availabilityLastUpdated
              ? Math.floor(
                  (new Date() - new Date(user.availabilityLastUpdated)) /
                    (1000 * 60 * 60 * 24)
                )
              : "Never updated",
          })),
          emailResults
        );

        if (adminEmailResult.success) {
          console.log("✅ Admin summary email sent successfully");
        } else {
          console.log(
            `❌ Failed to send admin summary email: ${adminEmailResult.error}`
          );
        }

        // Log final summary
        const successfulEmails = emailResults.filter(
          (result) => result.success
        ).length;
        const failedEmails = emailResults.filter(
          (result) => !result.success
        ).length;

        console.log(
          `📧 Email Summary: ${successfulEmails} sent successfully, ${failedEmails} failed`
        );
      } else {
        console.log(
          "All users have updated their availability within the last 30 days"
        );
      }

      console.log("Daily availability check job completed");
    } catch (error) {
      console.error("Error in daily availability check cron job:", error);
    }
  });

  console.log(
    "Daily availability check cron job scheduled - runs every morning at 8 AM"
  );
};

// Initialize all cron jobs
const initializeCronJobs = () => {
  console.log("Initializing cron jobs...");

  scheduleDailyAvailabilityCheck();

  console.log("All cron jobs initialized successfully");
};

// Stop all cron jobs (useful for graceful shutdown)
const stopAllCronJobs = () => {
  console.log("Stopping all cron jobs...");
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log("All cron jobs stopped");
};

module.exports = {
  initializeCronJobs,
  stopAllCronJobs,
  scheduleDailyAvailabilityCheck,
};
