# 📘 Project Heimdall - Technical Reference Manual

**Version:** 1.0.0
**Date:** December 3, 2025
**Author:** Deepanshu Verma (via SafeZone AI Team)

---

## 1. Introduction
This document is the **single source of truth** for Project Heimdall. It contains the **actual code** running in production, the infrastructure definitions, and the configuration details. It is designed to allow a developer to reconstruct the entire system from scratch without guessing.

---

## 2. Backend Logic (AWS Lambda)

### 2.1. The Brain: `ScanImage` (Node.js 20.x)
**Function Name:** `Heimdall-Brain`
**Trigger:** API Gateway (`POST /scan`)
**Role:** Receives a base64 image, detects PPE using Rekognition, and logs results to DynamoDB.

```javascript
import { RekognitionClient, DetectProtectiveEquipmentCommand } from "@aws-sdk/client-rekognition";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new RekognitionClient({ region: "us-east-1" });
const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = "HeimdallAuditLog";

export const handler = async (event) => {
    console.log("Event Received:", JSON.stringify(event));

    // 1. CORS Preflight Handling (Critical for Web Apps)
    const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method);
    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: "CORS OK" })
        };
    }

    try {
        // 2. Parse Body
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
        }
        const body = JSON.parse(rawBody || '{}');

        if (!body.image) throw new Error("No image provided");

        // 3. Prepare Image for Rekognition
        const base64Image = body.image.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = Buffer.from(base64Image, 'base64');

        // 4. Call Amazon Rekognition
        const command = new DetectProtectiveEquipmentCommand({
            Image: { Bytes: imageBytes },
            SummarizationAttributes: {
                MinConfidence: 40,
                RequiredEquipmentTypes: ['HEAD_COVER']
            }
        });

        const rekognitionResponse = await client.send(command);

        // 5. Analyze Results
        let violation = false;
        let details = [];
        const persons = rekognitionResponse.Persons || [];

        persons.forEach(person => {
            const head = person.BodyParts?.find(p => p.Name === 'HEAD');
            if (head) {
                const helmetDetected = head.EquipmentDetections.some(e => e.Type === 'HEAD_COVER');
                if (!helmetDetected) {
                    violation = true;
                    details.push(`Person ${person.Id}: Missing Helmet`);
                } else {
                    details.push(`Person ${person.Id}: Helmet Detected`);
                }
            } else {
                violation = true;
                details.push(`Person ${person.Id}: Head Obscured`);
            }
        });

        const statusMessage = violation ? "⚠️ Safety Violation Detected" : (persons.length === 0 ? "⚪ No Person Visible" : "✅ Worker Safe (Helmet On)");

        // 6. Log to DynamoDB
        try {
            await ddbClient.send(new PutItemCommand({
                TableName: TABLE_NAME,
                Item: {
                    ZoneId: { S: "ZONE_A" },
                    Timestamp: { S: new Date().toISOString() },
                    Violation: { BOOL: violation },
                    Message: { S: statusMessage },
                    Details: { S: JSON.stringify(details) },
                    PersonCount: { N: persons.length.toString() }
                }
            }));
        } catch (dbError) {
            console.error("DynamoDB Error:", dbError);
            // We log the error but don't fail the request to the user, unless critical
        }

        // 7. Return Response
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: JSON.stringify({
                violation: violation,
                message: statusMessage,
                details: details,
                timestamp: new Date().toISOString(),
                rekognition_raw: rekognitionResponse
            }),
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
```

### 2.2. The Memory: `GetLogs` (Node.js 20.x)
**Function Name:** `Heimdall-Logs`
**Trigger:** API Gateway (`GET /logs`)
**Role:** Fetches the latest 50 audit logs from DynamoDB for the Admin Panel.

```javascript
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = "HeimdallAuditLog";

export const handler = async (event) => {
    // 1. CORS Preflight
    const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method);
    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: JSON.stringify({ message: "CORS OK" })
        };
    }

    try {
        // 2. Query DynamoDB (Latest 50 items)
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "ZoneId = :zone",
            ExpressionAttributeValues: {
                ":zone": { S: "ZONE_A" }
            },
            ScanIndexForward: false, // Descending order (Newest first)
            Limit: 50
        });

        const response = await client.send(command);

        // 3. Format Data
        const items = response.Items.map(item => {
            return {
                zoneId: item.ZoneId.S,
                timestamp: item.Timestamp.S,
                violation: item.Violation.BOOL,
                message: item.Message.S,
                details: JSON.parse(item.Details.S || '[]'),
                personCount: parseInt(item.PersonCount.N)
            };
        });

        // 4. Return Response
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS"
            },
            body: JSON.stringify(items)
        };

    } catch (error) {
        console.error("Error reading logs:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

---

## 3. Infrastructure (Terraform)

### 3.1. VPC & Network (`vpc.tf`)
Defines the secure network environment.

```hcl
resource "aws_vpc" "heimdall_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.heimdall_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

# ... (private_subnet_2 similar)

resource "aws_security_group" "lambda_sg" {
  name        = "heimdall-lambda-sg"
  vpc_id      = aws_vpc.heimdall_vpc.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Allow internal traffic
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Allow outbound to Endpoints
  }
}

# VPC Endpoints (Critical for Private Access)
resource "aws_vpc_endpoint" "rekognition" {
  service_name      = "com.amazonaws.us-east-1.rekognition"
  vpc_endpoint_type = "Interface"
  # ... attached to private subnets and lambda_sg
}

resource "aws_vpc_endpoint" "dynamodb" {
  service_name      = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"
  # ... attached to private route table
}
```

### 3.2. IAM Permissions (`iam.tf`)
The "Least Privilege" policy for the Lambda.

```hcl
resource "aws_iam_role" "heimdall_lambda_role" {
  name = "heimdall_lambda_execution_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy" "heimdall_logic_policy" {
  name = "heimdall_logic_policy"
  role = aws_iam_role.heimdall_lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["rekognition:DetectProtectiveEquipment"], Resource = "*" },
      { Effect = "Allow", Action = ["dynamodb:PutItem", "dynamodb:Query"], Resource = "arn:aws:dynamodb:us-east-1:*:table/HeimdallAuditLog" },
      { Effect = "Allow", Action = ["logs:CreateLogGroup", "logs:PutLogEvents"], Resource = "arn:aws:logs:*:*:*" }
    ]
  })
}
```

### 3.3. Authentication (`cognito.tf`)
User management configuration.

```hcl
resource "aws_cognito_user_pool" "heimdall_users" {
  name = "HeimdallUsers"
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]
}

resource "aws_cognito_user_pool_client" "heimdall_web_client" {
  name = "HeimdallWebClient"
  user_pool_id = aws_cognito_user_pool.heimdall_users.id
  generate_secret = false
  # CRITICAL: Must include SRP for Amplify
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
}
```

---

## 4. Frontend Configuration

### 4.1. Amplify Setup (`src/main.tsx`)
Connects the frontend to Cognito.

```typescript
import { Amplify } from 'aws-amplify';

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: 'us-east-1_My9slvWw1', // MUST match Terraform Output
            userPoolClientId: '39fct9u2g3v7njis4bbvcm6h4h', // MUST match Terraform Output
        }
    }
});
```

### 4.2. API Integration (`src/components/CameraFeed.tsx`)
Sends frames to the backend.

```typescript
const sendFrameToBackend = async (base64Image: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, action: 'scan' }),
        });
        // ... handle response
    } catch (error) {
        // ... handle error
    }
};
```

### 4.3. Secure Data Fetching (`src/components/AdminPanel.tsx`)
Fetches logs using the Auth Token.

```typescript
const { getToken } = useAuth();

const fetchLogs = async () => {
    const token = await getToken();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token // Send token to API Gateway Authorizer
    };
    const response = await fetch(`${import.meta.env.VITE_API_URL}/logs`, { headers });
    // ...
};
```

---

## 5. Deployment Checklist

1.  **Infrastructure:** Run `terraform apply` in `infrastructure/terraform`.
2.  **Backend Code:** Copy code from Section 2 into AWS Lambda Console.
3.  **API Gateway:**
    *   Create Resources: `/scan` (POST) and `/logs` (GET).
    *   Enable CORS on both.
    *   Attach `CognitoAuth` to `/logs`.
    *   Deploy API to `prod` stage.
4.  **Frontend:**
    *   Update `.env.production` with API Gateway URL.
    *   Update `src/main.tsx` with Cognito IDs.
    *   Run `npm run build`.
    *   Deploy `dist/` folder to Netlify/Amplify.
