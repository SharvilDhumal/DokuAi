# Document Conversion

Purpose:

CrowdStrike API keys allow secure access to Falcon’s security features, like threat detection and data retrieval. They help integrate CrowdStrike with other tools for automation and better security management.

Steps for CrowdStrike API Credentials:

NOTE : Users must be assigned the Falcon Administrator role to create new API clients from the Falcon Console.

The following steps follow the process outlined in CrowdStrike’s Managing your API clients documentation. To generate CrowdStrike API credentials:

1. Log in to the Falcon Console.

2. Select Support and resources > API clients and keys.

On the API clients and keys page, click Add new API client.

4. In the Add new API client pop-up:

Input the following:

i. Your desired Client Name

ii. Description

Select the API scopes as per your requirement for the integration

○ Click Add to save the API client and generate the client ID and secret.

NOTE :Save your API client secret somewhere safe. After the credential window is closed, the secret is no longer visible.

Share the API Client ID,Secret and Base URL with the team.

Optional Steps (Recommended for security standards):-

5. Navigate to Host setup and management > IP Allowlist Management.

6.  Select Create IP Group, and configure your CrowdStrike API to allowlist the Abnormal IPs.
