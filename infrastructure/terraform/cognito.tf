resource "aws_cognito_user_pool" "heimdall_users" {
  name = "HeimdallUsers"

  username_attributes = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  tags = {
    Project = "Heimdall"
  }
}

resource "aws_cognito_user_pool_client" "heimdall_web_client" {
  name = "HeimdallWebClient"

  user_pool_id = aws_cognito_user_pool.heimdall_users.id

  generate_secret     = false
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

output "user_pool_id" {
  value = aws_cognito_user_pool.heimdall_users.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.heimdall_web_client.id
}
