const express = require("express");
const cors = require("cors");
const path = require("path");
const { query } = require("./db");
const { initializeCronJobs, stopAllCronJobs } = require("./cronJobs");
require("dotenv").config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const CAL_API_BASE = "https://api.cal.com/v2";
const headers = {
  "Content-Type": "application/json",
  "x-cal-secret-key": process.env.CAL_CLIENT_SECRET,
};

// Cal.com managed user creation endpoint
app.post("/api/cal/create-managed-user", async (req, res) => {
  try {
    const userData = req.body;

    // Validate required fields
    if (!userData.name || !userData.email) {
      return res.status(400).json({
        error: "Missing required fields: name and email are required",
      });
    }

    // Create managed user in Cal.com
    const response = await fetch(
      `${CAL_API_BASE}/oauth-clients/${process.env.CAL_CLIENT_ID}/users`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(userData),
      }
    );

    let userId, accessToken, refreshToken;

    // Read the response body once, regardless of success or error
    const responseData = await response.json();

    if (!response.ok) {
      if (
        response.status === 409 &&
        responseData.error?.message?.includes("Existing user ID=")
      ) {
        try {
          // Extract user ID from the error message
          const userIdMatch = responseData.error.message.match(
            /Existing user ID=(\d+)/
          );
          if (userIdMatch) {
            userId = parseInt(userIdMatch[1]);
            // Check if this user already exists in our database
            const existingUser = await query(
              `SELECT * FROM gratia.cal_user_availability WHERE "userId" = $1`,
              [userId]
            );
            if (existingUser.rows.length > 0) {
              // User already exists in our database, return existing record
              const user = existingUser.rows[0];
              return res.status(200).json({
                id: user.id,
                userId: userId,
                createdAt: user.createdAt,
                accessToken: user.accessToken,
                refreshToken: user.refreshToken,
              });
            } else {
              // User exists in Cal.com but not in our database
              return res.status(409).json({
                error: "User exists in Cal.com but not in our database",
                details: `Please contact support. Cal.com User ID: ${userId}`,
                CalUserId: userId,
              });
            }
          }
        } catch (dbError) {
          console.error("Database error while handling conflict:", dbError);
          return res.status(500).json({
            error: "Database error while checking existing user",
            details: dbError.message,
          });
        }
      }

      // If not a handled 409 error, throw the error
      throw new Error(
        responseData.error ||
          responseData.message ||
          "Failed to create managed user"
      );
    }

    // Success case - extract user data
    userId = responseData.data.user.id;
    ({ accessToken, refreshToken } = responseData.data);

    // Store the data in our database
    const dbResult = await query(
      `
      INSERT INTO gratia.cal_user_availability 
      ("userId", "email", "refreshToken", "accessToken") 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `,
      [userId, userData.email, refreshToken, accessToken]
    );

    const inserted = dbResult.rows[0];
    // Return success response
    res.status(201).json({
      message: "Managed user created successfully",
      id: inserted.id,
      userId: userId,
      createdAt: inserted.createdAt,
    });
  } catch (err) {
    console.error("Error creating managed user:", err);

    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

// Get user access token by userId endpoint
app.get("/api/cal/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return sendError(res, 400, "Invalid userId parameter");
  try {
    // Find the user in our database
    const userRecord = await query(
      `SELECT "userId", "accessToken", "refreshToken", "availabilityLastUpdated", "createdAt", "updatedAt" FROM gratia.cal_user_availability WHERE "userId" = $1`,
      [userId]
    );

    if (userRecord.rows.length === 0) {
      return res.status(404).json({
        error: "User not found with the provided userId",
      });
    }

    const user = userRecord.rows[0];
    // Return the access token
    res.json({
      userId: user.userId,
      accessToken: user.accessToken,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("Error fetching user access token:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

// Refresh token endpoint for Cal.com atoms
app.get("/api/cal/refresh", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return sendError(res, 401, "Missing Bearer token");
  try {
    // Find the user in our database based on the current access token
    const userRecord = await query(
      `SELECT * FROM gratia.cal_user_availability WHERE "accessToken" = $1`,
      [token]
    );

    if (userRecord.rows.length === 0) {
      return res.status(404).json({
        error: "User not found with the provided access token",
      });
    }

    const user = userRecord.rows[0];

    // Call Cal.com refresh endpoint
    const refreshResponse = await fetch(
      `${CAL_API_BASE}/oauth/${process.env.CAL_CLIENT_ID}/refresh`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken: user.refreshToken }),
      }
    );

    const responseData = await refreshResponse.json();
    if (!refreshResponse.ok) {
      console.error("Cal.com refresh error:", responseData);
      return res.status(refreshResponse.status).json({
        error: "Failed to refresh token with Cal.com",
        details: responseData.message || responseData.error,
      });
    }

    const { accessToken, refreshToken } = responseData.data;

    // Update the tokens in our database
    const updateResult = await query(
      `
      UPDATE gratia.cal_user_availability 
      SET "accessToken" = $1, "refreshToken" = $2, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $3
      RETURNING *
    `,
      [accessToken, refreshToken, user.userId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error("Failed to update user tokens in database");
    }

    // Return the new access token to the atoms
    res.json({
      accessToken,
    });
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(500).json({
      error: "Internal server error during token refresh",
      details: err.message,
    });
  }
});

// Update availability last updated timestamp
app.put("/api/cal/users/:userId/availability-updated", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return sendError(res, 400, "Missing or invalid userId");
  try {
    // Update the availabilityLastUpdated timestamp in our database
    const updateResult = await query(
      `
      UPDATE gratia.cal_user_availability 
      SET "availabilityLastUpdated" = CURRENT_TIMESTAMP
      WHERE "userId" = $1
      RETURNING "userId", "availabilityLastUpdated", "updatedAt"
    `,
      [userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found with the provided userId",
      });
    }
    res.json({
      success: true,
      message: "Availability timestamp updated successfully",
      data: updateResult.rows[0],
    });
  } catch (err) {
    console.error("Error updating availability timestamp:", err);
    res.status(500).json({
      error: "Failed to update availability timestamp",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Initialize cron jobs
  initializeCronJobs();
});

process.on("SIGINT", () => {
  stopAllCronJobs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAllCronJobs();
  process.exit(0);
});

module.exports = app;
