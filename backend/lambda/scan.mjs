/**
 * Heimdall "Scan" Lambda Function 🧠
 * 
 * This function receives an image, sends it to Amazon Rekognition,
 * and determines if a safety violation has occurred.
 * 
 * Input: { image: "base64_string" }
 * Output: { violation: boolean, persons: [], message: string }
 */

// Mock Rekognition Response (for local dev without AWS creds)
const mockRekognition = async (imageBytes) => {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Randomly simulate detection results for demo purposes
    // In production, this calls aws-sdk rekognition.detectProtectiveEquipment
    const hasPerson = true;
    const hasHelmet = Math.random() > 0.3; // 70% chance of wearing helmet (Safe)

    return {
        ProtectiveEquipmentModelVersion: "1.0",
        Persons: [
            {
                Id: 1,
                BodyParts: [
                    { Name: "HEAD", Confidence: 99.9, EquipmentDetections: hasHelmet ? [{ Type: "HELMET", Confidence: 98.5 }] : [] }
                ]
            }
        ]
    };
};

export const handler = async (event) => {
    try {
        const { image } = event;

        if (!image) {
            throw new Error("No image provided");
        }

        console.log("🔍 Scanning frame for safety violations...");

        // 1. Call Rekognition (Mocked locally)
        const rekognitionResult = await mockRekognition(image);

        // 2. Analyze Results
        let violation = false;
        let violationDetails = [];

        const persons = rekognitionResult.Persons || [];

        persons.forEach(person => {
            const head = person.BodyParts.find(p => p.Name === "HEAD");
            const hasHelmet = head?.EquipmentDetections.some(e => e.Type === "HELMET");

            if (!hasHelmet) {
                violation = true;
                violationDetails.push(`Person ${person.Id}: Missing Helmet`);
            }
        });

        // 3. Return Standardized Response
        return {
            statusCode: 200,
            body: {
                violation,
                timestamp: new Date().toISOString(),
                message: violation ? "⚠️ Safety Violation Detected" : "✅ Site Compliant",
                details: violationDetails,
                rekognition_raw: rekognitionResult
            }
        };

    } catch (error) {
        console.error("❌ Scan failed:", error);
        return {
            statusCode: 500,
            body: { error: error.message }
        };
    }
};
