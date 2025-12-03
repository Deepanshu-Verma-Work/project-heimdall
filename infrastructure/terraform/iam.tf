# IAM Role for the "Brain" (Lambda)
resource "aws_iam_role" "heimdall_lambda_role" {
  name = "heimdall_lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy: Basic VPC Execution (Required for Lambda in VPC)
resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.heimdall_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Policy: The "Least Privilege" Custom Policy
resource "aws_iam_role_policy" "heimdall_logic_policy" {
  name = "heimdall_logic_policy"
  role = aws_iam_role.heimdall_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # 1. Rekognition: Only allow detecting PPE
      {
        Effect = "Allow"
        Action = [
          "rekognition:DetectProtectiveEquipment"
        ]
        Resource = "*" # Rekognition doesn't support resource-level permissions for this API yet
      },
      # 2. SNS: Only allow publishing to our specific topic
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "arn:aws:sns:us-east-1:*:heimdall-alerts"
      },
      # 3. Logging: Standard CloudWatch permissions
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      # 4. DynamoDB: Allow reading and writing logs
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/HeimdallAuditLog"
      }
    ]
  })
}
