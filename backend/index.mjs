import { RekognitionClient, DetectProtectiveEquipmentCommand } from "@aws-sdk/client-rekognition";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const rekognition = new RekognitionClient({ region: "us-east-1" });
const sns = new SNSClient({ region: "us-east-1" });

export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // CORS: Handle OPTIONS Preflight Request
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ message: "CORS OK" })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const imageBase64 = body.image;

        if (!imageBase64) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing 'image' in request body" }),
            };
        }

        // Remove Data URI prefix if present
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        // Call Amazon Rekognition
        const command = new DetectProtectiveEquipmentCommand({
            Image: { Bytes: imageBuffer },
            SummarizationAttributes: {
                MinConfidence: 50, // Lowered to 50% for better webcam detection
                RequiredEquipmentTypes: ["HEAD_COVER"]
            }
        });

        const response = await rekognition.send(command);

        // Analyze Results
        let violationDetected = false;
        let personFound = false;
        let violationDetails = [];

        if (response.Persons && response.Persons.length > 0) {
            personFound = true;
            response.Persons.forEach(person => {
                const bodyParts = person.BodyParts;
                const head = bodyParts.find(part => part.Name === "HEAD");

                if (head) {
                    const helmet = head.EquipmentDetections.find(eq => eq.Type === "HEAD_COVER");
                    if (!helmet) {
                        violationDetected = true;
                        violationDetails.push(`Person ID ${person.Id}: No Helmet`);
                    }
                } else {
                    // Head detected but obscured? Flag it to be safe.
                    violationDetected = true;
                    violationDetails.push(`Person ID ${person.Id}: Head Obscured`);
                }
            });
        } else {
            violationDetails.push("No Worker Detected");
        }

        // If Violation, Send Alert (SNS) - Optional
        if (violationDetected) {
            console.log("SNS Alert Triggered (Simulation):", violationDetails);
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: JSON.stringify({
                violation: violationDetected,
                personFound: personFound,
                details: violationDetails,
                rekognition_raw: response
            }),
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
        };
    }
};
