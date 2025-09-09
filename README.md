# NexusFlow

A full-stack, AI-powered Customer Relationship Management (CRM) platform built with Next.js 14 (App Router), MongoDB, NextAuth, shadcn/ui, and Groq, enhanced with a hybrid publish-subscribe architecture.

This project demonstrates customer segmentation, campaign management, order ingestion, vendor integration with webhooks, and real-time updates using pub-sub messaging.

## Features

- Authentication: Secure sign-up/sign-in with NextAuth (Google & credentials)
- Customer Management: Add, view, and segment customers
- Audience Segmentation: Create dynamic segments using rule builder or AI
- Campaigns: Create, preview, and deliver personalized campaigns
- Order Management: Bulk upload orders via CSV
- Vendor Simulation: Dummy vendor API with delivery receipts via webhook
- AI Integration: Generate audience rules and message templates with OpenAI
- Dashboard: View campaign logs, statuses, and analytics with real-time updates
- Modern UI: Built with shadcn/ui, Tailwind CSS, and V0.dev
- API Documentation: Swagger UI for easy API exploration
- Rate Limiting: Upstash Redis for rate limiting
- Pub-Sub Architecture: Real-time updates and reliable job processing with BullMQ and IORedis

## Architecture
![High Level Diagram](./public/architecture.svg)

## Overview

My CRM system implements a hybrid publish-subscribe architecture that combines message queues for reliable job processing with real-time pub-sub messaging for instant updates. This creates a robust, scalable system for handling campaign delivery and customer communications.

### Core Technologies

- BullMQ: Handles job queues with persistence, retry logic, and failure handling
- IORedis: Provides Redis client for real-time pub-sub messaging
- Upstash Redis: Cloud-hosted Redis service ensuring scalability and reliability

### Architecture Pattern

The system follows a dual-layer pub-sub model:

- **Layer 1 - Job Queue System**: Handles heavy, persistent work like message delivery, batch processing, and API calls to external vendors. Jobs are stored in Redis and processed by dedicated workers.
- **Layer 2 - Real-time Messaging**: Broadcasts instant status updates, campaign progress, and delivery notifications across the application for live dashboard updates.

### How It Works

#### Message Flow

When a campaign is created, the system doesn't immediately send all messages. Instead, it publishes jobs to a queue. Background workers pick up these jobs and process them independently, ensuring the main application remains responsive.

#### Reliability Mechanisms

- Job Persistence: All jobs are stored in Redis, so they survive server restarts
- Automatic Retries: Failed jobs retry with exponential backoff (2s, 4s, 8s delays)
- Concurrency Control: Multiple workers process jobs simultaneously without conflicts
- Dead Letter Handling: Permanently failed jobs are isolated for manual review

#### Real-time Updates

As workers process jobs, they publish status updates through Redis pub-sub channels. This allows the dashboard to show live progress without polling the database constantly.

## Getting Started

### 1. Clone the repository

```bash
1. git clone https://github.com/im-subhadeep/Xeno-Assignment.git
2. cd Xeno-Assignment
3. cd web
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the `web` directory:
```bash
NEXTAUTH_SECRET="" # Added by npx auth.
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
MONGODB_URI="mongodb://localhost:27017/Xeno"
CALLBACK_URL="http://localhost:3000/api/auth/callback/google"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="your-groq-api-key"
UPSTASH_REDIS_REST_URL="https://your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-token"
REDIS_URL="your-redis-url"
REDIS_HOST="your-redis-host"
REDIS_PORT="your-redis-port" #6379
REDIS_PASSWORD="your-redis-password"
```

### 4. Run the development server

Visit http://localhost:3000 in your browser.

## API Endpoints

- `/api/auth` - Authentication routes (sign up, sign in, sign out)
- `/api/ai/generate-segment-rules` - AI integration for audience rules
- `/api/ai/suggest-messages` - AI integration for message templates
- `/api/customers` - Manage customers
- `/api/customers/bulk-upload` - Upload bulk customers via CSV
- `/api/orders` - Manage orders (supports bulk upload)
- `/api/orders/bulk-upload` - Upload bulk orders via CSV
- `/api/audiences` - Audience segment CRUD
- `/api/campaigns` - Campaign CRUD and delivery
- `/api/dummy-vendor/send` - Simulated vendor API
- `/api/webhooks/delivery-receipts` - Webhook for vendor delivery receipts
- `/api/queue/status` - Retrieves the current status of message queues
- `/api/queue/status` - Manages queue cleanup operations
- `/api/realtime/campaign/{campaignId}` - Subscribe to real-time campaign updates via Server-Sent Events
- `/api/realtime/delivery/{logId}` - Subscribe to real-time delivery status updates via Server-Sent Events
- `/api/swagger` - Swagger UI for API documentation

## Bulk Upload

- Customers: Upload a CSV with headers: `name,email,phone,...`
- Orders: Upload a CSV with headers: `orderId,customerEmail,orderAmount,orderDate`

## Authentication

- Sign up/sign in with email/password or Google
- Protected routes and API endpoints

## AI Features

- Generate audience rules from natural language
- Generate campaign message templates

## Technologies Used

- Frontend: Next.js 14, shadcn/ui, Tailwind CSS, V0.dev
- Backend: Next.js API routes, MongoDB, NextAuth.js
- Database: MongoDB
- Authentication: NextAuth.js
- AI Integration: GROQ AI Inference
- Queue System: BullMQ, IORedis, Upstash Redis
- Deployment: Vercel
- API Documentation: Swagger UI
- Rate Limiting: Upstash Redis
- Pub-Sub: Redis-based pub-sub architecture

## Contact

Made by Subhadeep Mondal

<a href="https://github.com/im-subhadeep" target="_blank">
  <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
</a>

<a href="https://www.linkedin.com/in/subhadeep-mondal-8090b222b/" target="_blank">
  <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
</a> 
