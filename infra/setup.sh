#!/usr/bin/env bash
#
# One-time AWS setup for deploying Quy's Toolkit to S3 + CloudFront via GitHub
# Actions (OIDC, no long-lived keys). Idempotent: safe to re-run.
#
# Prerequisites:
#   - AWS CLI v2 installed and configured with an admin/poweruser identity:
#       aws configure   (or: aws sso login)
#   - The S3 bucket already exists (you created `toolkits-of-quy`).
#
# Usage:
#   cd infra && ./setup.sh
#
# At the end it prints the values to put into GitHub repository Variables.
set -euo pipefail

# ---- Config (edit if needed) ------------------------------------------------
REGION="ap-southeast-1"
BUCKET="toolkits-of-quy"
GH_REPO="khucxuanquy/toolkit"
ROLE_NAME="GithubAction-toolkit-deploy"
FN_NAME="toolkit-rewrite-index"
OAC_NAME="toolkit-oac"
DIST_COMMENT="Quy's Toolkit (${GH_REPO})"
# -----------------------------------------------------------------------------

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# CloudFront rewrite function (kept in sync with cloudfront-rewrite-function.js).
# Embedded here so this script is self-contained — you can paste it straight
# into AWS CloudShell.
cat > "$TMP/fn.js" <<'JS'
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (!uri.includes(".")) {
    request.uri = uri + "/index.html";
  }
  return request;
}
JS

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
echo "AWS account: $ACCOUNT_ID  region: $REGION"

# 1) GitHub OIDC provider --------------------------------------------------------
echo "==> OIDC provider"
OIDC_ARN="$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn | [0]" \
  --output text)"
if [ "$OIDC_ARN" = "None" ] || [ -z "$OIDC_ARN" ]; then
  OIDC_ARN="$(aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 1c58a3a8518e8759bf075b76b750d4f2df264fcd \
    --query OpenIDConnectProviderArn --output text)"
  echo "    created: $OIDC_ARN"
else
  echo "    exists:  $OIDC_ARN"
fi

# 2) IAM role for the workflow ---------------------------------------------------
echo "==> IAM role $ROLE_NAME"
cat > "$TMP/trust.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "$OIDC_ARN" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:$GH_REPO:*" }
    }
  }]
}
JSON

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "file://$TMP/trust.json"
  echo "    updated trust policy"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "file://$TMP/trust.json" >/dev/null
  echo "    created role"
fi
ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)"

cat > "$TMP/perms.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "ListBucket", "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::$BUCKET" },
    { "Sid": "Objects", "Effect": "Allow", "Action": ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"], "Resource": "arn:aws:s3:::$BUCKET/*" },
    { "Sid": "Invalidate", "Effect": "Allow", "Action": ["cloudfront:CreateInvalidation"], "Resource": "*" }
  ]
}
JSON
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name toolkit-deploy --policy-document "file://$TMP/perms.json"
echo "    attached deploy permissions"

# 3) CloudFront Function (index.html rewrite) ------------------------------------
echo "==> CloudFront function $FN_NAME"
if aws cloudfront describe-function --name "$FN_NAME" >/dev/null 2>&1; then
  ETAG="$(aws cloudfront describe-function --name "$FN_NAME" --query ETag --output text)"
  aws cloudfront update-function --name "$FN_NAME" --if-match "$ETAG" \
    --function-config Comment="append index.html",Runtime="cloudfront-js-2.0" \
    --function-code "fileb://$TMP/fn.js" >/dev/null
else
  aws cloudfront create-function --name "$FN_NAME" \
    --function-config Comment="append index.html",Runtime="cloudfront-js-2.0" \
    --function-code "fileb://$TMP/fn.js" >/dev/null
fi
ETAG="$(aws cloudfront describe-function --name "$FN_NAME" --query ETag --output text)"
aws cloudfront publish-function --name "$FN_NAME" --if-match "$ETAG" >/dev/null
FN_ARN="$(aws cloudfront describe-function --name "$FN_NAME" --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)"
echo "    $FN_ARN"

# 4) Origin Access Control -------------------------------------------------------
echo "==> Origin Access Control $OAC_NAME"
OAC_ID="$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id | [0]" --output text)"
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID="$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "Name=$OAC_NAME,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)"
fi
echo "    $OAC_ID"

# 5) CloudFront distribution -----------------------------------------------------
echo "==> CloudFront distribution"
DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$DIST_COMMENT'].Id | [0]" --output text 2>/dev/null || echo None)"
if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  cat > "$TMP/dist.json" <<JSON
{
  "CallerReference": "toolkit-$(date +%s)",
  "Comment": "$DIST_COMMENT",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_200",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-$BUCKET",
      "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
      "OriginAccessControlId": "$OAC_ID",
      "S3OriginConfig": { "OriginAccessIdentity": "" }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-$BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [{ "EventType": "viewer-request", "FunctionARN": "$FN_ARN" }]
    }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponseCode": "404", "ResponsePagePath": "/404.html", "ErrorCachingMinTTL": 10 },
      { "ErrorCode": 404, "ResponseCode": "404", "ResponsePagePath": "/404.html", "ErrorCachingMinTTL": 10 }
    ]
  }
}
JSON
  DIST_ID="$(aws cloudfront create-distribution --distribution-config "file://$TMP/dist.json" \
    --query Distribution.Id --output text)"
  echo "    created: $DIST_ID"
else
  echo "    exists:  $DIST_ID"
fi
DIST_ARN="arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"
DIST_DOMAIN="$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)"

# 6) Bucket policy: allow this distribution to read objects ----------------------
echo "==> S3 bucket policy"
cat > "$TMP/bucket.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontRead",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "$DIST_ARN" } }
  }]
}
JSON
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$TMP/bucket.json"
echo "    done"

# ---- Summary -------------------------------------------------------------------
cat <<SUMMARY

============================================================
✅ AWS setup complete.

Set these as GitHub repository Variables
(Settings → Secrets and variables → Actions → Variables):

  AWS_REGION                  $REGION
  AWS_ROLE_ARN                $ROLE_ARN
  S3_BUCKET                   $BUCKET
  CLOUDFRONT_DISTRIBUTION_ID  $DIST_ID

CloudFront URL (ready in ~5–10 min):
  https://$DIST_DOMAIN

Then push to main (or re-run the workflow) to deploy.
For the custom domain quy.io.vn: add it as an Alternate domain
name (CNAME) on the distribution with an ACM cert in us-east-1.
============================================================
SUMMARY
