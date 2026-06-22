#!/bin/bash
# Get Vercel token from ~/.vercel
TOKEN=$(cat ~/.vercel/auth.json 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
TEAM_ID="team_KgzcDthkvZ33iuLJEKzLjOD8"
PROJECT_ID="prj_9IVJ7hBMPkUPudAkP2DKuy3od4No"

if [ -z "$TOKEN" ]; then
  echo "Error: Could not find Vercel token"
  exit 1
fi

echo "Disabling deployment protection..."
curl -s -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ssoProtection": "disabled",
    "passwordProtection": {"deploymentType": "all", "password": null},
    "trustedIps": null
  }' | jq -r '.name // .error.message'
