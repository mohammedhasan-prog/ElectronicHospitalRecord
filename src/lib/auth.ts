// src/lib/auth.ts

interface Token {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  retrieved_at: number; // in seconds
}

let token: Token | null = null;

/**
 * Fetches the SMART configuration from the .well-known endpoint.
 * @param fhirRoot - The FHIR service root URL.
 * @returns The token endpoint URL.
 */
async function discoverTokenUrl(fhirRoot: string): Promise<string | undefined> {
  try {
    const wellKnownUrl = new URL('/.well-known/smart-configuration', fhirRoot);
    const response = await fetch(wellKnownUrl.toString());
    if (response.ok) {
      const config = await response.json();
      return config.token_endpoint;
    }
  } catch (error) {
    console.error('Error discovering token URL:', error);
  }
  return undefined;
}

/**
 * Fetches a new access token using the client_credentials grant type.
 * @returns A new access token.
 */
async function fetchAccessToken(): Promise<Token> {
  const {
    TENANT_ID,
    CLIENT_ID,
    CLIENT_SECRET,
    AUTH_HOST = 'https://authorization.cerner.com',
    FHIR_ROOT,
  } = process.env;

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing required environment variables for authentication.');
  }

  let tokenUrl: string | undefined;
  if (FHIR_ROOT) {
    tokenUrl = await discoverTokenUrl(FHIR_ROOT);
  }

  if (!tokenUrl) {
    tokenUrl = `${AUTH_HOST}/tenants/${TENANT_ID}/protocols/oauth2/profiles/smart-v1/token`;
    console.warn(`Falling back to constructed token URL: ${tokenUrl}`);
  }

  const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${authString}`,
  };

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'system/Patient.read system/Patient.write system/Appointment.read system/Appointment.write system/Observation.read system/Observation.write system/AllergyIntolerance.read system/AllergyIntolerance.write system/Condition.read system/Condition.write system/Coverage.read system/Claim.read',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch access token: ${response.statusText} - ${errorText}`);
  }

  const newToken: Omit<Token, 'retrieved_at'> = await response.json();
  return {
    ...newToken,
    retrieved_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Retrieves a valid access token, fetching a new one if necessary.
 * @returns A valid access token.
 */
export async function getAccessToken(): Promise<string> {
  if (!token || (token.retrieved_at + token.expires_in) < (Math.floor(Date.now() / 1000) + 60)) {
    console.log('Fetching new access token...');
    token = await fetchAccessToken();
  }
  return token.access_token;
}
