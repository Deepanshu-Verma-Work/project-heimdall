# 🛡️ Project Heimdall (SafeZone AI) - Handover Documentation

## 1. Project Overview
**Heimdall (SafeZone AI)** is a real-time PPE (Personal Protective Equipment) detection system designed for industrial safety. It uses computer vision to monitor video feeds and detect safety violations (e.g., missing helmets) instantly.

*   **Goal:** Prevent workplace accidents by automating safety checks.
*   **Key Features:**
    *   Real-time video analysis (Webcam).
    *   AI-powered detection (Amazon Rekognition).
    *   Secure Authentication (AWS Cognito).
    *   Audit Logging (DynamoDB).
    *   Enterprise-grade Security (VPC, Private Subnets).

---

## 2. Architecture
The system follows a **Serverless Event-Driven Architecture**:

### **Frontend (The Eyes)**
*   **Tech:** React, Vite, TailwindCSS, AWS Amplify.
*   **Role:** Captures video frames, handles user login, displays results.
*   **Hosting:** Netlify (or S3/CloudFront).

### **Backend (The Brain)**
*   **API Gateway:** Exposes REST endpoints (`/scan`, `/logs`).
*   **Lambda Functions:**
    *   `Heimdall-Brain` (`ScanImage`): Receives images, calls Rekognition, logs to DB.
    *   `Heimdall-Logs` (`GetLogs`): Fetches audit history for the Admin Panel.
*   **Amazon Rekognition:** Performs the actual object detection (PPE model).

### **Data & Auth (The Vault)**
*   **DynamoDB:** Stores audit logs (`HeimdallAuditLog`).
*   **Cognito:** Manages user identities (Sign-up, Sign-in, MFA).

### **Infrastructure (The Fortress)**
*   **VPC:** Isolates the backend.
*   **Private Subnets:** Lambda functions run here (no public internet access).
*   **VPC Endpoints:** Allow Lambda to talk to Rekognition/DynamoDB privately.

---

## 3. Technology Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | React (TypeScript), Vite, TailwindCSS, Lucide Icons |
| **Auth** | AWS Cognito, AWS Amplify UI |
| **Compute** | AWS Lambda (Node.js 20.x) |
| **AI/ML** | Amazon Rekognition (PPE Detection) |
| **Database** | AWS DynamoDB (On-Demand) |
| **IaC** | Terraform (Infrastructure as Code) |
| **API** | Amazon API Gateway (REST) |

---

## 4. Folder Structure
```
safezone-ai/
├── src/
│   ├── components/      # React Components (CameraFeed, AdminPanel)
│   ├── context/         # AuthContext (User session logic)
│   ├── pages/           # Login/Register pages
│   ├── main.tsx         # App Entry & Amplify Config
│   └── App.tsx          # Routing & Protection
├── backend/
│   └── lambda/          # Source code for Lambda functions
├── infrastructure/
│   └── terraform/       # Terraform configuration files (.tf)
├── dist/                # Production build artifacts
└── .env.production      # Environment variables (API URL)
```

---

## 5. Setup & Installation (Local)

### **Prerequisites**
*   Node.js (v18+)
*   AWS CLI (Configured with Admin credentials)
*   Terraform (v1.0+)

### **Steps**
1.  **Clone the Repo:**
    ```bash
    git clone <repo-url>
    cd safezone-ai
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run Locally:**
    ```bash
    npm run dev
    ```
    *   *Note:* Local app points to the LIVE backend (defined in `.env`).

---

## 6. Deployment Guide

### **Frontend**
1.  **Build:**
    ```bash
    npm run build
    ```
2.  **Deploy:**
    *   **Option A (Netlify):** Drag & drop the `dist` folder to Netlify Drop.
    *   **Option B (Amplify Hosting):** Connect your GitHub repo to AWS Amplify Console.

### **Backend (Infrastructure)**
We use Terraform to manage AWS resources.
1.  Navigate to Terraform dir:
    ```bash
    cd infrastructure/terraform
    ```
2.  Apply changes:
    ```bash
    terraform apply
    ```

### **Backend (Code)**
Currently, Lambda code is updated manually (or via script).
*   **Source:** `backend/lambda/scan.mjs`
*   **Update:** Copy code -> Paste in AWS Lambda Console -> Deploy.

---

## 7. Key Configuration Details

### **Environment Variables**
*   `VITE_API_URL`: The URL of your API Gateway (e.g., `https://xyz.execute-api.us-east-1.amazonaws.com/prod`).

### **IAM Roles**
*   **Role:** `heimdall_lambda_execution_role`
*   **Permissions:**
    *   `rekognition:DetectProtectiveEquipment`
    *   `dynamodb:PutItem`, `dynamodb:Query`
    *   `logs:CreateLogGroup`, `logs:PutLogEvents`
    *   `AWSLambdaVPCAccessExecutionRole` (Managed Policy)

### **CORS Configuration**
*   **API Gateway:** Enable CORS on all resources (`/scan`, `/logs`). Allow `*` origin.
*   **Lambda:** Code MUST handle `OPTIONS` preflight requests (return 200 OK).

---

## 8. Troubleshooting Common Issues

### **Issue: "Backend Error: Failed to Fetch"**
*   **Cause:** CORS is blocking the request.
*   **Fix:**
    1.  Check API Gateway CORS settings.
    2.  Check Lambda code for `OPTIONS` handling.
    3.  Ensure Lambda is not timing out (VPC issues).

### **Issue: "401 Unauthorized"**
*   **Cause:** Token mismatch or wrong User Pool.
*   **Fix:**
    1.  Check `main.tsx` for correct `userPoolId`.
    2.  Check API Gateway Authorizer (must match the User Pool in frontend).

### **Issue: "Empty Logs"**
*   **Cause:** Lambda failing to write to DynamoDB.
*   **Fix:**
    1.  Check IAM Role permissions.
    2.  Check VPC Endpoints (if Lambda is in private subnet).

---

## 9. Future Roadmap
*   **Edge Computing:** Move detection logic to IoT Greengrass for lower latency.
*   **Alerting:** Integrate SNS to send SMS/Email on violation.
*   **Reporting:** Use QuickSight for safety trend analysis.
