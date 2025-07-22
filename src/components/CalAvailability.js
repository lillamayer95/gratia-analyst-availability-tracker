import React from "react";
import { AvailabilitySettings } from "@calcom/atoms";
import "./CalAvailability.css";

const CalAvailability = () => {
  return (
    <div className="cal-availability">
      <h2>Availability Settings</h2>
      <AvailabilitySettings />
    </div>
  );
};

export default CalAvailability;
