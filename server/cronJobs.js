const cron = require("node-cron");
const { query } = require("./db");
const { sendAvailabilityReminderEmail } = require("./emailService");

const processUsers = async (users) => {
  const results = [];

  for (const user of users) {
    const daysSinceUpdate = user.availabilityLastUpdated
      ? Math.floor(
          (Date.now() - new Date(user.availabilityLastUpdated)) /
            (1000 * 60 * 60 * 24)
        )
      : "Never updated";

    if (!user.email) {
      results.push({
        userId: user.userId,
        email: null,
        success: false,
        error: "No email address",
      });
      continue;
    }

    try {
      const result = await sendAvailabilityReminderEmail(
        user.email,
        user.userId,
        daysSinceUpdate
      );

      results.push({
        userId: user.userId,
        email: user.email,
        ...result,
      });

      log.info(`Email to ${user.email}: ${result.success ? "Sent" : "Failed"}`);
    } catch (error) {
      log.error(`Error sending email to ${user.email}`, error);
      results.push({
        userId: user.userId,
        email: user.email,
        success: false,
        error: error.message,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // rate limit
  }

  return results;
};

const runDailyAvailabilityCheck = async () => {
  log.info("Running daily availability check...");

  try {
    const users = await query(`
      SELECT "userId", "email", "availabilityLastUpdated"
      FROM gratia.cal_user_availability
      WHERE "availabilityLastUpdated" < NOW() - INTERVAL '30 days'
    `);

    if (users.rows.length === 0) {
      log.info("No users need availability reminders today.");
      return;
    }

    const results = await processUsers(users.rows);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    log.info(`Email summary: ${successCount} sent, ${failCount} failed`);
  } catch (error) {
    log.error("Error in daily availability check cron job", error);
  }
};

const scheduleDailyAvailabilityCheck = () => {
  cron.schedule("0 8 * * *", runDailyAvailabilityCheck);
  log.info("Scheduled daily availability check at 8:00 AM");
};

// Public interface
const initializeCronJobs = () => {
  log.info("Initializing cron jobs...");
  scheduleDailyAvailabilityCheck();
};

const stopAllCronJobs = () => {
  log.info("Stopping all cron jobs...");
  cron.getTasks().forEach((task) => task.stop());
  log.info("All cron jobs stopped");
};

module.exports = {
  initializeCronJobs,
  stopAllCronJobs,
  scheduleDailyAvailabilityCheck,
};
