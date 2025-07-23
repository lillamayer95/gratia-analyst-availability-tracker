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

    const options = {
      method: "POST",
      headers: {
        "x-cal-secret-key": process.env.CAL_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    };

    // Create managed user in Cal.com
    const response = await fetch(
      `https://api.cal.com/v2/oauth-clients/${process.env.CAL_CLIENT_ID}/users`,
      options
    );

    let userId, accessToken, refreshToken;

    // Read the response body once, regardless of success or error
    const responseData = await response.json();
    console.log("Response from Cal.com:", responseData);

    if (!response.ok) {
      console.log("Error from Cal.com:", responseData);

      if (
        response.status === 409 &&
        responseData.error?.message?.includes("Existing user ID=")
      ) {
        console.log("Handling 409 conflict");
        try {
          // Extract user ID from the error message
          const userIdMatch = responseData.error.message.match(
            /Existing user ID=(\d+)/
          );
          console.log("User ID from error message:", userIdMatch);
          if (userIdMatch) {
            userId = parseInt(userIdMatch[1]);
            console.log(`User already exists with ID: ${userId}`);

            // Check if this user already exists in our database
            const existingUser = await query(
              `SELECT * FROM gratia.cal_user_availability WHERE "userId" = $1`,
              [userId]
            );
            console.log("Existing user in our database:", existingUser.rows);

            if (existingUser.rows.length > 0) {
              // User already exists in our database, return existing record
              return res.status(200).json({
                id: existingUser.rows[0].id,
                userId: userId,
                createdAt: existingUser.rows[0].createdAt,
                accessToken: existingUser.rows[0].accessToken,
                refreshToken: existingUser.rows[0].refreshToken,
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
    console.log("Managed user created:", responseData);
    userId = responseData.data.user.id;
    ({ accessToken, refreshToken } = responseData.data);
    console.log("User ID:", userId);
    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);

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

    // Return success response
    res.status(201).json({
      message: "Managed user created successfully",
      id: dbResult.rows[0].id,
      userId: userId,
      createdAt: dbResult.rows[0].createdAt,
    });
  } catch (err) {
    console.error("Itt dobja creating managed user:", err);

    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

// Get user access token by userId endpoint
app.get("/api/cal/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        error: "Invalid userId parameter",
      });
    }

    // Find the user in our database
    const userRecord = await query(
      `SELECT "userId", "accessToken", "refreshToken", "availabilityLastUpdated", "createdAt", "updatedAt" FROM gratia.cal_user_availability WHERE "userId" = $1`,
      [parseInt(userId)]
    );

    if (userRecord.rows.length === 0) {
      return res.status(404).json({
        error: "User not found with the provided userId",
      });
    }

    const user = userRecord.rows[0];
    console.log("Found user:", user.userId);

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
  try {
    // Extract the access token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error:
          "Missing or invalid Authorization header. Expected: Bearer <accessToken>",
      });
    }

    const currentAccessToken = authHeader.split(" ")[1];
    console.log("Received access token for refresh:", currentAccessToken);

    // Find the user in our database based on the current access token
    const userRecord = await query(
      `SELECT * FROM gratia.cal_user_availability WHERE "accessToken" = $1`,
      [currentAccessToken]
    );

    if (userRecord.rows.length === 0) {
      return res.status(404).json({
        error: "User not found with the provided access token",
      });
    }

    const user = userRecord.rows[0];
    console.log("Found user for token refresh:", user);
    console.log(
      `https://api.cal.com/v2/oauth-clients/${process.env.CAL_CLIENT_ID}/refresh`
    );
    console.log({
      method: "POST",
      headers: {
        "x-cal-secret-key": process.env.CAL_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: user.refreshToken,
      }),
    });

    // Call Cal.com refresh endpoint
    const refreshResponse = await fetch(
      `https://api.cal.com/v2/oauth/${process.env.CAL_CLIENT_ID}/refresh`,
      {
        method: "POST",
        headers: {
          "x-cal-secret-key": process.env.CAL_CLIENT_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: user.refreshToken,
        }),
      }
    );

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.error("Cal.com refresh error:", errorData);
      return res.status(refreshResponse.status).json({
        error: "Failed to refresh token with Cal.com",
        details: errorData.message || errorData.error,
      });
    }

    const refreshData = await refreshResponse.json();
    console.log("Cal.com refresh successful:", refreshData);

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      refreshData.data;

    // Update the tokens in our database
    const updateResult = await query(
      `
      UPDATE gratia.cal_user_availability 
      SET "accessToken" = $1, "refreshToken" = $2, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $3
      RETURNING *
    `,
      [newAccessToken, newRefreshToken, user.userId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error("Failed to update user tokens in database");
    }

    console.log("Tokens updated successfully for user:", user.userId);

    // Return the new access token to the atoms
    res.json({
      accessToken: newAccessToken,
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
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: "Missing required parameter: userId",
      });
    }

    // Update the availabilityLastUpdated timestamp in our database
    const updateResult = await query(
      `
      UPDATE gratia.cal_user_availability 
      SET "availabilityLastUpdated" = CURRENT_TIMESTAMP
      WHERE "userId" = $1
      RETURNING "userId", "availabilityLastUpdated", "updatedAt"
    `,
      [parseInt(userId)]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        error: "User not found with the provided userId",
      });
    }

    console.log(
      "Updated availability timestamp for user:",
      updateResult.rows[0]
    );

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

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT. Graceful shutdown...");
  stopAllCronJobs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM. Graceful shutdown...");
  stopAllCronJobs();
  process.exit(0);
});

module.exports = app;
