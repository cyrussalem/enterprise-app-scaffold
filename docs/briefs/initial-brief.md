# Initial Project Brief

## Purpose

This repository serves as a production-quality starting point for building complex enterprise
applications on AWS serverless architecture with a React frontend.

## Sample Application: IoT Device Management

The reference implementation is an IoT platform where connected devices continuously send
telemetry data. This scenario demonstrates the scaffold's capabilities in a realistic,
data-intensive context.

## Scope

### 1. Device Data Model

Flesh out the `devices` table with all typical fields required for an IoT device — identifiers,
connectivity status, firmware version, location, last-seen timestamps, and so on.

### 2. Dashboard UI

Build a polished, functional dashboard featuring:

- **Widgets** — at-a-glance KPIs and status cards
- **Gauges** — real-time telemetry visualization
- **Tables & grids** — sortable, filterable device listings and event logs

The goal is a demo-ready interface that showcases the platform's depth to prospective customers.

### 3. LLM-Powered WhatsApp Integration

Enable conversational queries over device data via WhatsApp:

1. Customer sends a WhatsApp message asking about the state of their devices.
2. The system queries the devices table for relevant data.
3. An LLM synthesizes a concise, human-readable summary.
4. The summary is sent back to the customer via WhatsApp.

This feature demonstrates AI-driven automation applied to a real operational workflow.

## Goal

Produce a compelling, demo-ready application that shows customers what is possible when
enterprise-grade engineering, cloud-native infrastructure, and AI automation are combined.
