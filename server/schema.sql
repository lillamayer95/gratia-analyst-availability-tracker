-- T-- Database schema for Gratia Analyst Availability Tracker with Cal.com integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create dedicated schema for the application
CREATE SCHEMA IF NOT EXISTS gratia;

-- Create call_user_availability table for storing managed user creation data
CREATE TABLE IF NOT EXISTS gratia.call_user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" INTEGER UNIQUE NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for call_user_availability
CREATE TRIGGER update_call_user_availability_updated_at 
    BEFORE UPDATE ON gratia.call_user_availability
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for call_user_availability
CREATE INDEX IF NOT EXISTS idx_call_user_availability_userId ON gratia.call_user_availability("userId");
