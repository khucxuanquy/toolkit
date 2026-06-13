# Deploy infrastructure (S3 + CloudFront)

One-time AWS setup so the GitHub Actions workflow can deploy the static export.

Already created by you:

- **Region:** `ap-southeast-1`
- **S3 bucket:** `toolkits-of-quy`

`setup.sh` creates the rest (idempotent — safe to re-run):

1. GitHub **OIDC provider** + an **IAM role** the workflow assumes (no AWS keys).
2. A **CloudFront Function** that maps `/login/` → `/login/index.html` (needed
   because the export uses `trailingSlash: true`).
3. A **CloudFront distribution** (HTTPS, OAC to the private bucket, SPA-style
   404 handling).
4. The **S3 bucket policy** allowing only that distribution to read objects.

## Easiest way to run it — AWS CloudShell (no install, no access keys)

1. Sign in to the AWS Console, switch region to **Singapore (ap-southeast-1)**.
2. Click the **CloudShell** icon (top toolbar) to open a terminal that already
   has your permissions.
3. Paste the entire contents of [`setup.sh`](./setup.sh) into a file and run it:
   ```bash
   nano setup.sh        # paste, then Ctrl-O Enter Ctrl-X
   bash setup.sh
   ```
4. When it finishes it prints 4 values. Put them in GitHub:
   **repo → Settings → Secrets and variables → Actions → Variables → New variable**
   - `AWS_REGION`
   - `AWS_ROLE_ARN`
   - `S3_BUCKET`
   - `CLOUDFRONT_DISTRIBUTION_ID`

## Or run locally

```bash
# Requires AWS CLI v2 configured with an admin identity
aws configure          # or: aws sso login
cd infra && ./setup.sh
```

## Deploy

After the 4 variables are set, every push to `main` runs
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml): build →
`aws s3 sync` → CloudFront invalidation. You can also trigger it manually from
the **Actions** tab (workflow_dispatch).

The site will be live at the CloudFront URL printed by the script
(`https://<id>.cloudfront.net`) within ~5–10 minutes of the distribution being
created.

## Custom domain `quy.io.vn`

1. Request a public certificate for `quy.io.vn` in **ACM in us-east-1**
   (CloudFront only uses certs from us-east-1) and validate it via DNS.
2. On the distribution: add `quy.io.vn` under **Alternate domain names (CNAMEs)**
   and select that certificate.
3. At your DNS provider, point `quy.io.vn` (CNAME / ALIAS) to the CloudFront
   domain name.
