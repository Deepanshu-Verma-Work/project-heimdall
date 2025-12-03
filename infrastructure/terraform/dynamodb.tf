# resource "aws_dynamodb_table" "heimdall_audit_log" {
#   name           = "HeimdallAuditLog"
#   billing_mode   = "PAY_PER_REQUEST"
#   hash_key       = "ZoneId"
#   range_key      = "Timestamp"
#
#   attribute {
#     name = "ZoneId"
#     type = "S"
#   }
#
#   attribute {
#     name = "Timestamp"
#     type = "S"
#   }
#
#   tags = {
#     Project     = "Heimdall"
#     Environment = "Production"
#   }
# }
