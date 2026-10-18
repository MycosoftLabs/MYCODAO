# Create / verify BLOCKS media S3 bucket + IAM policy for ECS task role (Oct 16, 2026).
# Requires AWS CLI credentials for account 376129856177. Does not print secrets.
param(
  [string]$Bucket = $(if ($env:BLOCKS_MEDIA_BUCKET) { $env:BLOCKS_MEDIA_BUCKET } else { "mycodao-blocks-media-376129856177" }),
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }),
  [string]$TaskRoleName = "mycodao-blocks-ecs-task-role"
)

$ErrorActionPreference = "Stop"
Write-Host "Ensuring s3://$Bucket in $Region ..."

$exists = $false
try {
  aws s3api head-bucket --bucket $Bucket 2>$null
  if ($LASTEXITCODE -eq 0) { $exists = $true }
} catch { $exists = $false }

if (-not $exists) {
  if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $Bucket --region $Region | Out-Null
  } else {
    aws s3api create-bucket --bucket $Bucket --region $Region --create-bucket-configuration LocationConstraint=$Region | Out-Null
  }
  Write-Host "Created bucket $Bucket"
} else {
  Write-Host "Bucket already exists"
}

aws s3api put-public-access-block --bucket $Bucket --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true | Out-Null

$prefixes = @("library/commercials/", "library/shows/", "library/live-streams/", "library/graphics/", "library/bumpers/")
foreach ($p in $prefixes) {
  aws s3api put-object --bucket $Bucket --key $p --body NUL 2>$null | Out-Null
}

$policyDoc = @{
  Version = "2012-10-17"
  Statement = @(
    @{
      Sid = "BlocksMediaReadWrite"
      Effect = "Allow"
      Action = @("s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket")
      Resource = @("arn:aws:s3:::$Bucket", "arn:aws:s3:::$Bucket/*")
    }
  )
} | ConvertTo-Json -Depth 6

$policyPath = Join-Path $env:TEMP "blocks-media-policy.json"
Set-Content -Path $policyPath -Value $policyDoc -Encoding utf8

$policyName = "mycodao-blocks-media-rw"
try {
  aws iam create-policy --policy-name $policyName --policy-document "file://$policyPath" 2>$null | Out-Null
} catch {
  Write-Host "Policy $policyName may already exist (ok)"
}

$account = (aws sts get-caller-identity --query Account --output text).Trim()
$policyArn = "arn:aws:iam::${account}:policy/$policyName"
try {
  aws iam attach-role-policy --role-name $TaskRoleName --policy-arn $policyArn 2>$null | Out-Null
  Write-Host "Attached $policyArn to role $TaskRoleName"
} catch {
  Write-Host "Could not attach to role $TaskRoleName — attach manually: $policyArn"
}

Write-Host "Done. Set BLOCKS_MEDIA_BUCKET=$Bucket on the Next/ECS task. Verify GET /api/news/producer/media available:true."
