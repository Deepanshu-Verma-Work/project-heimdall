provider "aws" {
  region = "us-east-1"
}

# 1. The Fortress (VPC)
resource "aws_vpc" "heimdall_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "heimdall-vpc"
    Project = "Heimdall"
  }
}

# 2. Private Subnets (Where the Brain lives)
# No Internet Gateway attached to these route tables!
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.heimdall_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "heimdall-private-1"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.heimdall_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "heimdall-private-2"
  }
}

# 3. Security Group for Lambda
resource "aws_security_group" "lambda_sg" {
  name        = "heimdall-lambda-sg"
  description = "Allow outbound traffic to VPC Endpoints only"
  vpc_id      = aws_vpc.heimdall_vpc.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.heimdall_vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "heimdall-lambda-sg"
  }
}

# 4. Route Table for Private Subnets
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.heimdall_vpc.id

  tags = {
    Name = "heimdall-private-rt"
  }
}

resource "aws_route_table_association" "private_1_assoc" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_2_assoc" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_rt.id
}

# 5. VPC Endpoints (PrivateLink) - The Secret Tunnels
# These allow Lambda to talk to AWS Services without leaving the VPC

# Rekognition Endpoint (Interface)
resource "aws_vpc_endpoint" "rekognition" {
  vpc_id            = aws_vpc.heimdall_vpc.id
  service_name      = "com.amazonaws.us-east-1.rekognition"
  vpc_endpoint_type = "Interface"
  subnet_ids        = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
  security_group_ids = [aws_security_group.lambda_sg.id]
  private_dns_enabled = true
}

# SNS Endpoint (Interface)
resource "aws_vpc_endpoint" "sns" {
  vpc_id            = aws_vpc.heimdall_vpc.id
  service_name      = "com.amazonaws.us-east-1.sns"
  vpc_endpoint_type = "Interface"
  subnet_ids        = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
  security_group_ids = [aws_security_group.lambda_sg.id]
  private_dns_enabled = true
}

# CloudWatch Logs Endpoint (Interface)
resource "aws_vpc_endpoint" "logs" {
  vpc_id            = aws_vpc.heimdall_vpc.id
  service_name      = "com.amazonaws.us-east-1.logs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
  security_group_ids = [aws_security_group.lambda_sg.id]
  private_dns_enabled = true
}

# DynamoDB Endpoint (Gateway) - Free and Fast!
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.heimdall_vpc.id
  service_name = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.private_rt.id]
}
