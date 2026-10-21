# Signing the Windows build

The Windows installer and portable exe are **not code-signed** yet, so Windows SmartScreen shows a warning the first
time. Signing needs a certificate that only the maintainer can get (it is tied to a real identity, and is paid or
needs an approved application). The release workflow (`.github/workflows/release.yml`) is already prepared: when the
repository has the secrets below, the build is signed and the workflow **fails** if the signature is not valid. Without
the secrets it builds unsigned, as before.

## Choose one way to get a certificate

| Way | Notes |
| --- | --- |
| **Azure Artifact Signing** (formerly Trusted Signing) | Pay-as-you-go cloud signing, no certificate file to guard. Needs an Azure account and an identity validation, and is not available to individuals in every country — check Microsoft's current requirements. Wired up in the workflow. |
| **A certificate file (.pfx)** | Works with the workflow if your certificate's private key can be exported. Since 2023 most new certificates must live on a hardware token or a cloud HSM and cannot be exported, so this is mostly for older or self-hosted certificates. |
| **SignPath Foundation** | Free signing for open-source projects after an application and review. Not wired up here (it uses its own GitHub Action); ask if you want it added. |

## Secrets to add (GitHub → Settings → Secrets and variables → Actions)

Azure Artifact Signing:

- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` — a service principal allowed to sign
- `AZURE_SIGN_ENDPOINT` — for example `https://eus.codesigning.azure.net`
- `AZURE_SIGN_ACCOUNT` — the code-signing account name
- `AZURE_SIGN_PROFILE` — the certificate profile name
- `AZURE_SIGN_PUBLISHER` — optional, the publisher exactly as in the certificate subject

Certificate file:

- `WIN_CERT_BASE64` — the `.pfx` encoded as base64 (`[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx"))`)
- `WIN_CERT_PASSWORD` — its password

If `AZURE_SIGN_ACCOUNT` is set the Azure path is used, otherwise `WIN_CERT_BASE64`.

## After the first signed release

- SmartScreen builds reputation over time; a signed build removes the "unknown publisher" wording straight away, but the
  "not commonly downloaded" notice can take a while to disappear.
- Update the README line that says the builds are not code-signed.
- Never commit the certificate or its password.
